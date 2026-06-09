from datetime import datetime
from pydantic import BaseModel


class ResumeUploadResponse(BaseModel):
    resume_id: int
    filename: str
    extracted_skills: list[str]


class JDCreateRequest(BaseModel):
    text: str
    title: str | None = None
    company: str | None = None


class JDCreateResponse(BaseModel):
    jd_id: int
    title: str | None
    company: str | None
    required: list[str]
    preferred: list[str]


class AnalyzeRequest(BaseModel):
    resume_id: int
    jd_id: int


class BreakdownSchema(BaseModel):
    skill_coverage: float
    semantic_align: float
    section_align: float


class AnalysisResponse(BaseModel):
    id: int
    resume_id: int
    jd_id: int
    fit_score: float
    breakdown: BreakdownSchema
    matched_skills: list[str]
    missing_required: list[str]
    missing_preferred: list[str]
    suggestions: str | None
    created_at: datetime

    # Joined info for display
    resume_filename: str | None = None
    jd_title: str | None = None
    jd_company: str | None = None


class AnalysisSummary(BaseModel):
    id: int
    resume_id: int
    jd_id: int
    fit_score: float
    breakdown: BreakdownSchema
    resume_filename: str | None = None
    jd_title: str | None = None
    jd_company: str | None = None
    created_at: datetime


class SuggestResponse(BaseModel):
    suggestions: str
