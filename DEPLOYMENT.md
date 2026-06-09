# Deploying FitCheck

Three pieces:
- **Backend** (FastAPI + PostgreSQL) → Render
- **Frontend** (React/Vite) → Vercel
- **AI suggestions** → Groq free API (replaces local Ollama in production)

---

## 1. Get two free API keys (no credit card)

**Groq** (AI suggestions):
1. Go to <https://console.groq.com> and sign in.
2. **API Keys → Create API Key**. Copy it (starts with `gsk_...`).

**Jina** (embeddings / semantic matching):
1. Go to <https://jina.ai/embeddings/> — a free API key is shown on the page.
2. Copy it (starts with `jina_...`). Free tier includes millions of tokens.

---

## 2. Push the code to GitHub

```bash
cd "Resume Keyword Matcher"
git init
git add .
git commit -m "Prepare for deployment"
gh repo create resume-keyword-matcher --public --source=. --push
```

---

## 3. Deploy the backend on Render

1. Go to <https://render.com> → **New → Blueprint**.
2. Connect your GitHub repo. Render reads `render.yaml` and creates:
   - a **PostgreSQL** database (free)
   - the **API web service** (Docker)
3. Before the first deploy, set these env vars on the web service:
   - `GROQ_API_KEY` = your `gsk_...` key
   - `JINA_API_KEY` = your `jina_...` key
   - `CORS_ORIGINS` = your Vercel URL (add it after step 4, e.g. `https://your-app.vercel.app`)
4. Click **Apply**. First build takes a few minutes (installs deps + downloads the
   small spaCy model). Migrations run automatically on boot.
5. Copy the service URL, e.g. `https://resume-matcher-api.onrender.com`.

> Everything runs on **free tiers** — embeddings are served by the Jina API and AI
> suggestions by Groq, so the backend stays well under the 512 MB free RAM limit.

---

## 4. Deploy the frontend on Vercel

1. Go to <https://vercel.com> → **Add New → Project** → import the same repo.
2. Set **Root Directory** to `frontend`.
3. Add an environment variable:
   - `VITE_API_URL` = your Render backend URL (from step 3.5)
4. Deploy. Copy the resulting `https://your-app.vercel.app` URL.
5. Go back to Render → API service → update `CORS_ORIGINS` to that URL → save (it redeploys).

Done — open the Vercel URL.

---

## Local development

Add the same keys to `backend/.env`:

```
DATABASE_URL=postgresql+asyncpg://youssefwalied@localhost:5432/resume_matcher
JINA_API_KEY=jina_...
GROQ_API_KEY=gsk_...        # optional — without it, AI suggestions fall back to local Ollama
```

- **Embeddings** always use the Jina API (local and prod).
- **AI suggestions** use Groq if `GROQ_API_KEY` is set, otherwise fall back to a
  local Ollama server at `http://localhost:11434`.
