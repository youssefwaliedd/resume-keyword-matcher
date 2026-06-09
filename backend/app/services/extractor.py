"""Text extraction from PDF and DOCX files."""
import io
from pathlib import Path

import fitz  # PyMuPDF
from docx import Document


def extract_text_from_pdf(content: bytes) -> str:
    doc = fitz.open(stream=content, filetype="pdf")
    pages = [page.get_text() for page in doc]
    doc.close()
    return "\n".join(pages)


def extract_text_from_docx(content: bytes) -> str:
    doc = Document(io.BytesIO(content))
    return "\n".join(p.text for p in doc.paragraphs if p.text.strip())


def extract_text(content: bytes, filename: str) -> str:
    suffix = Path(filename).suffix.lower()
    if suffix == ".pdf":
        return extract_text_from_pdf(content)
    elif suffix in (".docx", ".doc"):
        return extract_text_from_docx(content)
    else:
        raise ValueError(f"Unsupported file type: {suffix}")
