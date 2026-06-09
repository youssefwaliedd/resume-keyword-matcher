from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.schemas import (
    AnalyzeRequest,
    AnalysisResponse,
    AnalysisSummary,
    BreakdownSchema,
    JDCreateRequest,
    JDCreateResponse,
    ResumeUploadResponse,
    SuggestResponse,
)
from app.core.database import get_db
from app.models.models import Analysis, JobDescription, Resume
from app.services.engine import run_analysis
from app.services.extractor import extract_text
from app.services.skill_matcher import SkillExtractorService

router = APIRouter(prefix="/api")

# Shared service instance (loaded once)
_extractor: SkillExtractorService | None = None


def get_extractor() -> SkillExtractorService:
    global _extractor
    if _extractor is None:
        _extractor = SkillExtractorService()
    return _extractor


# ── Resume ────────────────────────────────────────────────────────────────────

@router.post("/resume/upload", response_model=ResumeUploadResponse)
async def upload_resume(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    extractor: SkillExtractorService = Depends(get_extractor),
):
    if file.content_type not in (
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/msword",
    ):
        raise HTTPException(
            400, "Unsupported file type. Upload a PDF or DOCX."
        )

    content = await file.read()
    try:
        text = extract_text(content, file.filename or "resume")
    except ValueError as e:
        raise HTTPException(400, str(e))

    skills = extractor.extract_skills(text)

    resume = Resume(filename=file.filename, raw_text=text, parsed_skills=skills)
    db.add(resume)
    await db.commit()
    await db.refresh(resume)

    return ResumeUploadResponse(
        resume_id=resume.id,
        filename=resume.filename,
        extracted_skills=skills,
    )


# ── Job Description ───────────────────────────────────────────────────────────

@router.post("/jd", response_model=JDCreateResponse)
async def create_jd(
    body: JDCreateRequest,
    db: AsyncSession = Depends(get_db),
    extractor: SkillExtractorService = Depends(get_extractor),
):
    required, preferred = extractor.classify_jd_skills(body.text)
    all_skills = list(set(required + preferred))

    jd = JobDescription(
        title=body.title,
        company=body.company,
        raw_text=body.text,
        parsed_skills=all_skills,
        required_skills=required,
        preferred_skills=preferred,
    )
    db.add(jd)
    await db.commit()
    await db.refresh(jd)

    return JDCreateResponse(
        jd_id=jd.id,
        title=jd.title,
        company=jd.company,
        required=required,
        preferred=preferred,
    )


# ── Analysis ──────────────────────────────────────────────────────────────────

@router.post("/analyze", response_model=AnalysisResponse)
async def analyze(
    body: AnalyzeRequest,
    db: AsyncSession = Depends(get_db),
    extractor: SkillExtractorService = Depends(get_extractor),
):
    resume = await db.get(Resume, body.resume_id)
    if not resume:
        raise HTTPException(404, f"Resume {body.resume_id} not found")

    jd = await db.get(JobDescription, body.jd_id)
    if not jd:
        raise HTTPException(404, f"Job description {body.jd_id} not found")

    result = run_analysis(resume.raw_text, jd.raw_text, extractor)

    analysis = Analysis(
        resume_id=resume.id,
        jd_id=jd.id,
        fit_score=result.fit_score,
        breakdown={
            "skill_coverage": result.skill_coverage,
            "semantic_align": result.semantic_align,
            "section_align": result.section_align,
        },
        matched_skills=result.matched_skills,
        missing_required=result.missing_required,
        missing_preferred=result.missing_preferred,
    )
    db.add(analysis)
    await db.commit()
    await db.refresh(analysis)

    return _to_response(analysis, resume.filename, jd.title, jd.company)


@router.get("/analyses", response_model=list[AnalysisSummary])
async def list_analyses(
    resume_id: int | None = None,
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(Analysis, Resume.filename, JobDescription.title, JobDescription.company)
        .join(Resume, Analysis.resume_id == Resume.id)
        .join(JobDescription, Analysis.jd_id == JobDescription.id)
        .order_by(Analysis.created_at.desc())
    )
    if resume_id is not None:
        stmt = stmt.where(Analysis.resume_id == resume_id)

    rows = (await db.execute(stmt)).all()
    return [
        AnalysisSummary(
            id=a.id,
            resume_id=a.resume_id,
            jd_id=a.jd_id,
            fit_score=a.fit_score,
            breakdown=BreakdownSchema(**a.breakdown),
            resume_filename=filename,
            jd_title=title,
            jd_company=company,
            created_at=a.created_at,
        )
        for a, filename, title, company in rows
    ]


@router.get("/analysis/{analysis_id}", response_model=AnalysisResponse)
async def get_analysis(analysis_id: int, db: AsyncSession = Depends(get_db)):
    analysis = await db.get(Analysis, analysis_id)
    if not analysis:
        raise HTTPException(404, "Analysis not found")
    resume = await db.get(Resume, analysis.resume_id)
    jd = await db.get(JobDescription, analysis.jd_id)
    return _to_response(
        analysis,
        resume.filename if resume else None,
        jd.title if jd else None,
        jd.company if jd else None,
    )


@router.delete("/analysis/{analysis_id}", status_code=204)
async def delete_analysis(analysis_id: int, db: AsyncSession = Depends(get_db)):
    analysis = await db.get(Analysis, analysis_id)
    if not analysis:
        raise HTTPException(404, "Analysis not found")
    await db.delete(analysis)
    await db.commit()
    return None


@router.post("/analysis/{analysis_id}/suggest", response_model=SuggestResponse)
async def suggest(analysis_id: int, db: AsyncSession = Depends(get_db)):
    import httpx

    analysis = await db.get(Analysis, analysis_id)
    if not analysis:
        raise HTTPException(404, "Analysis not found")

    from app.core.config import get_settings
    provider = get_settings().llm_provider

    try:
        suggestions = await _llm_suggestions(
            analysis.missing_required, analysis.missing_preferred
        )
    except httpx.ConnectError:
        if provider == "ollama":
            raise HTTPException(
                503,
                "Can't reach the local AI model. Make sure Ollama is running "
                "(open the Ollama app) and try again.",
            )
        raise HTTPException(503, "Couldn't reach the AI service. Please try again.")
    except httpx.HTTPStatusError:
        raise HTTPException(
            503,
            "The AI service returned an error. Please try again in a moment.",
        )
    except httpx.TimeoutException:
        raise HTTPException(
            504,
            "The AI service took too long to respond. Try again in a moment.",
        )

    analysis.suggestions = suggestions
    await db.commit()

    return SuggestResponse(suggestions=suggestions)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _to_response(
    a: Analysis,
    filename: str | None,
    title: str | None,
    company: str | None,
) -> AnalysisResponse:
    return AnalysisResponse(
        id=a.id,
        resume_id=a.resume_id,
        jd_id=a.jd_id,
        fit_score=a.fit_score,
        breakdown=BreakdownSchema(**a.breakdown),
        matched_skills=a.matched_skills,
        missing_required=a.missing_required,
        missing_preferred=a.missing_preferred,
        suggestions=a.suggestions,
        created_at=a.created_at,
        resume_filename=filename,
        jd_title=title,
        jd_company=company,
    )


async def _llm_suggestions(
    missing_required: list[str], missing_preferred: list[str]
) -> str:
    import httpx

    prompt = (
        "You are a career coach helping a candidate close gaps in their resume "
        "for a specific job.\n\n"
        f"Missing required skills: {', '.join(missing_required) or 'none'}\n"
        f"Missing preferred skills: {', '.join(missing_preferred) or 'none'}\n\n"
        "Write one concise, actionable suggestion for each missing skill. "
        "Format STRICTLY as a flat markdown list, one bullet per skill, like:\n"
        "- **Skill Name**: suggestion here\n\n"
        "Rules:\n"
        "- Start each line with '- ' followed by the bolded skill name and a colon.\n"
        "- Keep each suggestion under 25 words.\n"
        "- Be specific and honest. If the candidate likely lacks the skill, "
        "suggest a concrete way to acquire it (course, project, certification).\n"
        "- Do NOT add intro text, headings, or a closing summary. Only the bullet list."
    )

    from app.core.config import get_settings
    settings = get_settings()

    async with httpx.AsyncClient(timeout=60.0) as client:
        if settings.llm_provider == "groq":
            resp = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={"Authorization": f"Bearer {settings.groq_api_key}"},
                json={
                    "model": settings.groq_model,
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.5,
                },
            )
            resp.raise_for_status()
            return resp.json()["choices"][0]["message"]["content"]

        # Local dev: Ollama
        resp = await client.post(
            f"{settings.ollama_url}/api/generate",
            json={
                "model": settings.ollama_model,
                "prompt": prompt,
                "stream": False,
            },
        )
        resp.raise_for_status()
        return resp.json().get("response", "")
