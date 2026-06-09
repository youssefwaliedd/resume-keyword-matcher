from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    app_name: str = "Resume Keyword Matcher"
    debug: bool = False

    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/resume_matcher"

    # Scoring weights (must sum to 1.0)
    weight_skill_coverage: float = 0.60
    weight_semantic_align: float = 0.25
    weight_section_align: float = 0.15

    # Semantic matching threshold
    semantic_similarity_threshold: float = 0.65

    # Embeddings — served by the free Jina AI API (no local model / no torch)
    jina_api_key: str = ""
    embedding_model: str = "jina-embeddings-v2-base-en"

    # ── LLM for AI suggestions ──────────────────────────────────────────────
    # If groq_api_key is set, we use Groq's free hosted API (production).
    # Otherwise we fall back to a local Ollama server (local dev).
    groq_api_key: str = ""
    groq_model: str = "llama-3.1-8b-instant"
    ollama_url: str = "http://localhost:11434"
    ollama_model: str = "llama3.2"

    # CORS — comma-separated list of allowed frontend origins
    cors_origins: str = "http://localhost:5173,http://localhost:3000"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

    @property
    def async_database_url(self) -> str:
        """Normalize the DB URL to the asyncpg driver (Render gives postgres://)."""
        url = self.database_url
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql+asyncpg://", 1)
        elif url.startswith("postgresql://"):
            url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
        return url

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def llm_provider(self) -> str:
        return "groq" if self.groq_api_key else "ollama"


@lru_cache
def get_settings() -> Settings:
    return Settings()
