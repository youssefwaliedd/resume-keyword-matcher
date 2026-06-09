# FitCheck — Resume Keyword Matcher & Job Fit Analyzer

> Upload your resume, paste any job description, and get an explainable **fit score** — with a breakdown of which skills match, which are missing, and AI-generated advice on how to close the gaps.

**🔗 Live demo:** [fitcheck-cv.vercel.app](https://fitcheck-cv.vercel.app)

![Tech](https://img.shields.io/badge/stack-FastAPI%20%2B%20React-1A5C38)
![Hosting](https://img.shields.io/badge/hosting-Render%20%2B%20Vercel-black)
![License](https://img.shields.io/badge/license-MIT-blue)

---

## What it does

FitCheck analyzes how well a resume matches a job description using a **hybrid NLP approach** — combining exact skill matching with semantic understanding — and explains its reasoning instead of returning a black-box number.

- **Hybrid skill extraction** — a 141-skill taxonomy with aliases (spaCy `PhraseMatcher` + fuzzy matching) catches skills even when worded differently.
- **Semantic fallback** — unmatched skills are checked with embedding cosine similarity, so "PyTorch" can satisfy a "deep learning frameworks" requirement.
- **Explainable scoring** — every score breaks down into skill coverage, semantic alignment, and section alignment.
- **AI suggestions** — an LLM writes concrete, honest advice for surfacing or acquiring each missing skill.
- **History tracking** — every analysis is saved so you can compare your fit across roles.

---

## Scoring model

```
fit_score = 100 × (0.60 · skill_coverage + 0.25 · semantic_align + 0.15 · section_align)
```

| Sub-score | What it measures |
|---|---|
| **Skill coverage** | Required skills matched (weighted 2×) plus preferred skills matched |
| **Semantic alignment** | Embedding similarity between the full resume and the full job description |
| **Section alignment** | Similarity between the resume's experience section and the JD's responsibilities |

Required vs. preferred skills are classified from the JD using heading detection (`Requirements`, `Must Have`, `Nice to Have`, …) plus inline signal words.

---

## Architecture

```
┌──────────────┐      HTTPS       ┌────────────────────┐
│   React +    │ ───────────────► │   FastAPI (async)  │
│   Vite (SPA) │                  │                    │
│   Vercel     │ ◄─────────────── │   Render           │
└──────────────┘   JSON / CORS    └─────────┬──────────┘
                                            │
                          ┌─────────────────┼─────────────────┐
                          ▼                 ▼                 ▼
                   ┌────────────┐   ┌──────────────┐   ┌─────────────┐
                   │ PostgreSQL │   │  Jina API    │   │  Groq API   │
                   │ (Render)   │   │ (embeddings) │   │ (suggestions)│
                   └────────────┘   └──────────────┘   └─────────────┘
```

Embeddings and the suggestion LLM are served by hosted APIs, keeping the backend
lightweight enough to run on a free instance (no local ML model / no GPU).

---

## Tech stack

**Backend**
- FastAPI · async SQLAlchemy · asyncpg · PostgreSQL · Alembic
- spaCy + rapidfuzz (skill taxonomy matching)
- Jina embeddings API (semantic alignment)
- Groq API (AI suggestions, with local Ollama fallback for dev)
- PyMuPDF / python-docx (resume parsing)

**Frontend**
- React · Vite · Tailwind CSS · React Router
- Custom SVG score gauge & charts, fully accessible (WCAG AA)

---

## Running locally

### Prerequisites
- Python 3.11+, Node 18+, PostgreSQL
- Free API keys: [Jina](https://jina.ai/embeddings/) (embeddings) and optionally [Groq](https://console.groq.com) (suggestions)

### Backend
```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
python -m spacy download en_core_web_sm

# configure environment
cp .env.example .env   # then fill in DATABASE_URL, JINA_API_KEY, GROQ_API_KEY

alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev          # http://localhost:5173
```

The Vite dev server proxies `/api` to the backend, so no extra config is needed locally.

---

## Deployment

Fully deployable on free tiers — see **[DEPLOYMENT.md](./DEPLOYMENT.md)** for the
step-by-step guide (Render for the API + Postgres, Vercel for the frontend).

---

## API overview

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/api/resume/upload` | Parse and store a resume (PDF/DOCX) |
| `POST` | `/api/jd` | Store a job description, return extracted skills |
| `POST` | `/api/analyze` | Run the fit analysis |
| `GET`  | `/api/analyses` | List past analyses |
| `GET`  | `/api/analysis/{id}` | Get one analysis |
| `DELETE` | `/api/analysis/{id}` | Delete an analysis |
| `POST` | `/api/analysis/{id}/suggest` | Generate AI improvement suggestions |

---

## License

MIT — built by [Youssef Walied](https://github.com/youssefwaliedd).
