"""
Hybrid matching engine: taxonomy extraction + semantic fallback + composite score.
This is a pure function module — no web layer, fully unit-testable.
"""
from dataclasses import dataclass

from app.core.config import get_settings
from app.services.embeddings import (
    compute_similarities,
    cosine_similarity,
    embed_many,
)
from app.services.skill_matcher import SkillExtractorService

settings = get_settings()


@dataclass
class AnalysisResult:
    fit_score: float  # 0-100

    # Sub-scores (0-1)
    skill_coverage: float
    semantic_align: float
    section_align: float

    matched_skills: list[str]
    missing_required: list[str]
    missing_preferred: list[str]

    # All JD skills split by weight class
    required_skills: list[str]
    preferred_skills: list[str]

    # Skills found only in resume (not in JD)
    extra_skills: list[str]


def run_analysis(
    resume_text: str,
    jd_text: str,
    extractor: SkillExtractorService,
) -> AnalysisResult:
    # 1. Extract skills
    resume_skills = set(extractor.extract_skills(resume_text))
    required_skills, preferred_skills = extractor.classify_jd_skills(jd_text)
    required_set = set(required_skills)
    preferred_set = set(preferred_skills)
    all_jd_skills = required_set | preferred_set

    # 2. Literal / alias match
    matched: set[str] = resume_skills & all_jd_skills
    unmatched_required = required_set - matched
    unmatched_preferred = preferred_set - matched

    # 3. Semantic fallback for unmatched JD skills (one batched embedding call)
    unmatched_list = list(unmatched_required) + list(unmatched_preferred)
    if unmatched_list:
        embeddings = embed_many([resume_text] + unmatched_list)
        resume_emb = embeddings[0]
        for skill, skill_emb in zip(unmatched_list, embeddings[1:]):
            sim = cosine_similarity(resume_emb, skill_emb)
            if sim >= settings.semantic_similarity_threshold:
                matched.add(skill)
                unmatched_required.discard(skill)
                unmatched_preferred.discard(skill)

    # 4. Skill coverage (required weighted 1.0, preferred weighted 0.5)
    total_weight = len(required_set) * 1.0 + len(preferred_set) * 0.5
    if total_weight == 0:
        skill_coverage = 1.0
    else:
        matched_weight = sum(
            1.0 if s in required_set else 0.5
            for s in matched
        )
        skill_coverage = min(matched_weight / total_weight, 1.0)

    # 5. Semantic and section alignment
    _raw_cosine, semantic_align, section_align = compute_similarities(
        resume_text, jd_text
    )

    # 6. Composite score
    w = settings
    fit_score = 100 * (
        w.weight_skill_coverage * skill_coverage
        + w.weight_semantic_align * semantic_align
        + w.weight_section_align * section_align
    )

    extra_skills = sorted(resume_skills - all_jd_skills)

    return AnalysisResult(
        fit_score=round(fit_score, 1),
        skill_coverage=round(skill_coverage, 4),
        semantic_align=round(semantic_align, 4),
        section_align=round(section_align, 4),
        matched_skills=sorted(matched),
        missing_required=sorted(unmatched_required),
        missing_preferred=sorted(unmatched_preferred),
        required_skills=required_skills,
        preferred_skills=preferred_skills,
        extra_skills=extra_skills,
    )
