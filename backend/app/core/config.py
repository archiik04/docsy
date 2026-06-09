from pathlib import Path
from typing import Optional

from dotenv import load_dotenv
from pydantic_settings import BaseSettings
from pydantic_settings import SettingsConfigDict


BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent

# Load environment variables into process environment for tracing SDKs (LangSmith)
load_dotenv(BASE_DIR / ".env")


class Settings(BaseSettings):

    DATABASE_URL: str
    OPENROUTER_API_KEY: str
    SECRET_KEY: str
    TESSERACT_CMD: Optional[str] = None

    # Langfuse Tracing
    LANGFUSE_PUBLIC_KEY: Optional[str] = None
    LANGFUSE_SECRET_KEY: Optional[str] = None
    LANGFUSE_HOST: Optional[str] = "https://cloud.langfuse.com"

    # LangSmith / LangChain Tracing
    LANGCHAIN_TRACING_V2: Optional[str] = None
    LANGCHAIN_API_KEY: Optional[str] = None
    LANGCHAIN_ENDPOINT: Optional[str] = None
    LANGCHAIN_PROJECT: Optional[str] = "docsy"

    model_config = SettingsConfigDict(
        env_file=BASE_DIR / ".env",
        extra="ignore"
    )


settings = Settings()