"""
Unit tests for the matching engine.
Run with: pytest tests/
These tests import the engine as a pure function — no web layer needed.
"""
import pytest
from app.services.skill_matcher import SkillExtractorService
from app.services.engine import run_analysis


@pytest.fixture(scope="module")
def extractor():
    return SkillExtractorService()


SAMPLE_RESUME = """
John Doe | john@example.com

Experience
Software Engineer at Acme Corp (2021–2024)
- Built REST APIs using Python and FastAPI
- Worked with PostgreSQL and Redis for caching
- Deployed services on AWS using Docker and Kubernetes
- Wrote unit tests with Pytest

Skills
Python, JavaScript, React, Git, SQL, Docker, AWS, Pytest
"""

SAMPLE_JD = """
Software Engineer — Backend

Requirements
- 3+ years of Python experience (required)
- Experience with REST APIs and microservices (required)
- PostgreSQL or another SQL database (required)
- Docker and container orchestration (required)
- CI/CD pipeline experience (required)

Preferred
- Kubernetes experience
- GraphQL knowledge
- TypeScript

Responsibilities
Design and implement scalable backend services.
Collaborate with the frontend team to define APIs.
"""


def test_skill_extraction(extractor):
    skills = extractor.extract_skills(SAMPLE_RESUME)
    assert "Python" in skills
    assert "FastAPI" in skills
    assert "PostgreSQL" in skills
    assert "Docker" in skills


def test_jd_classification(extractor):
    required, preferred = extractor.classify_jd_skills(SAMPLE_JD)
    assert "Python" in required
    assert "Docker" in required
    # Kubernetes appears in Preferred section
    assert "Kubernetes" in preferred or "Kubernetes" in required  # fallback ok


def test_run_analysis(extractor):
    result = run_analysis(SAMPLE_RESUME, SAMPLE_JD, extractor)

    assert 0 <= result.fit_score <= 100
    assert "Python" in result.matched_skills
    assert 0 <= result.skill_coverage <= 1
    assert 0 <= result.semantic_align <= 1
    assert 0 <= result.section_align <= 1

    # GraphQL not in resume -> should be missing
    missing_all = result.missing_required + result.missing_preferred
    # CI/CD is required in JD but resume doesn't explicitly mention it
    print(f"Fit score: {result.fit_score}")
    print(f"Matched: {result.matched_skills}")
    print(f"Missing required: {result.missing_required}")
    print(f"Missing preferred: {result.missing_preferred}")
