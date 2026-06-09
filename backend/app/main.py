from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router, get_extractor
from app.core.config import get_settings


settings = get_settings()


@asynccontextmanager
async def lifespan(_app: FastAPI):
    # Pre-load the spaCy skill extractor so the first request is not slow.
    # Embeddings are served by the Jina API, so there is no local model to load.
    get_extractor()
    yield


app = FastAPI(
    title=settings.app_name,
    description="Explainable resume-to-job fit analysis",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    # Allow Vercel preview deployments (e.g. my-app-git-branch.vercel.app)
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.get("/health")
async def health():
    return {"status": "ok"}
