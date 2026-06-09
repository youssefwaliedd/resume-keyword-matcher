from datetime import datetime, timezone
from sqlalchemy import String, Float, Text, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Resume(Base):
    __tablename__ = "resumes"

    id: Mapped[int] = mapped_column(primary_key=True)
    filename: Mapped[str] = mapped_column(String(255))
    raw_text: Mapped[str] = mapped_column(Text)
    parsed_skills: Mapped[list] = mapped_column(JSONB, default=list)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow
    )

    analyses: Mapped[list["Analysis"]] = relationship(back_populates="resume")


class JobDescription(Base):
    __tablename__ = "job_descriptions"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str | None] = mapped_column(String(255))
    company: Mapped[str | None] = mapped_column(String(255))
    raw_text: Mapped[str] = mapped_column(Text)
    parsed_skills: Mapped[list] = mapped_column(JSONB, default=list)
    required_skills: Mapped[list] = mapped_column(JSONB, default=list)
    preferred_skills: Mapped[list] = mapped_column(JSONB, default=list)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow
    )

    analyses: Mapped[list["Analysis"]] = relationship(back_populates="job_description")


class Analysis(Base):
    __tablename__ = "analyses"

    id: Mapped[int] = mapped_column(primary_key=True)
    resume_id: Mapped[int] = mapped_column(ForeignKey("resumes.id"))
    jd_id: Mapped[int] = mapped_column(ForeignKey("job_descriptions.id"))

    fit_score: Mapped[float] = mapped_column(Float)
    breakdown: Mapped[dict] = mapped_column(JSONB)  # skill_coverage, semantic_align, section_align
    matched_skills: Mapped[list] = mapped_column(JSONB, default=list)
    missing_required: Mapped[list] = mapped_column(JSONB, default=list)
    missing_preferred: Mapped[list] = mapped_column(JSONB, default=list)
    suggestions: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow
    )

    resume: Mapped["Resume"] = relationship(back_populates="analyses")
    job_description: Mapped["JobDescription"] = relationship(back_populates="analyses")
