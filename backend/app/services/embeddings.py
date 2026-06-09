"""
Embedding service backed by the Jina AI free embedding API.

Using a hosted API (instead of a local sentence-transformers model) keeps the
backend lightweight enough to run on free hosting tiers — no torch, no GPU,
small memory footprint.
"""
import re

import httpx
import numpy as np

from app.core.config import get_settings

_JINA_URL = "https://api.jina.ai/v1/embeddings"

_EXPERIENCE_SIGNALS = re.compile(
    r"(experience|work history|employment|professional background|career)",
    re.IGNORECASE,
)
_RESPONSIBILITIES_SIGNALS = re.compile(
    r"(responsibilities|you will|what you.ll do|role|duties|accountabilities)",
    re.IGNORECASE,
)


def embed_many(texts: list[str]) -> list[np.ndarray]:
    """Embed a batch of texts in a single API call. Returns L2-normalized vectors."""
    settings = get_settings()
    resp = httpx.post(
        _JINA_URL,
        headers={"Authorization": f"Bearer {settings.jina_api_key}"},
        json={
            "model": settings.embedding_model,
            "input": [t if t.strip() else " " for t in texts],
        },
        timeout=30.0,
    )
    resp.raise_for_status()
    rows = sorted(resp.json()["data"], key=lambda d: d["index"])
    vectors = []
    for row in rows:
        v = np.array(row["embedding"], dtype=np.float32)
        norm = np.linalg.norm(v)
        vectors.append(v / norm if norm else v)
    return vectors


def embed(text: str) -> np.ndarray:
    return embed_many([text])[0]


def cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    # Vectors are L2-normalized, so the dot product equals cosine similarity.
    return float(np.dot(a, b))


def extract_section(text: str, signal_re: re.Pattern) -> str:
    """
    Heuristically extract a section from text by finding the signal heading
    and grabbing lines until the next heading-like line.
    Returns the full text if no section found.
    """
    lines = text.splitlines()
    start_idx = None
    for i, line in enumerate(lines):
        if signal_re.search(line) and len(line.strip()) < 80:
            start_idx = i
            break

    if start_idx is None:
        return text

    section_lines = []
    for line in lines[start_idx + 1 :]:
        stripped = line.strip()
        if stripped and len(stripped) < 60 and stripped == stripped.title():
            break
        section_lines.append(line)

    result = "\n".join(section_lines).strip()
    return result if result else text


def compute_similarities(
    resume_text: str, jd_text: str
) -> tuple[float, float, float]:
    """
    Returns (doc_cosine, semantic_align, section_align). All values in [0, 1].
    Embeds all four texts in a single batched API call.
    """
    resume_exp = extract_section(resume_text, _EXPERIENCE_SIGNALS)
    jd_resp = extract_section(jd_text, _RESPONSIBILITIES_SIGNALS)

    resume_emb, jd_emb, resume_exp_emb, jd_resp_emb = embed_many(
        [resume_text, jd_text, resume_exp, jd_resp]
    )

    doc_cosine = cosine_similarity(resume_emb, jd_emb)
    section_cosine = cosine_similarity(resume_exp_emb, jd_resp_emb)

    # Normalize cosine from [-1, 1] to [0, 1]
    semantic_align = (doc_cosine + 1) / 2
    section_align = (section_cosine + 1) / 2

    return doc_cosine, semantic_align, section_align
