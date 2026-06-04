from pathlib import Path
from typing import Optional

from pydantic_settings import BaseSettings
from pydantic_settings import SettingsConfigDict


BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent


class Settings(BaseSettings):

    DATABASE_URL: str
    OPENROUTER_API_KEY: str
    SECRET_KEY: str
    TESSERACT_CMD: Optional[str] = None

    model_config = SettingsConfigDict(
        env_file=BASE_DIR / ".env",
        extra="ignore"
    )


settings = Settings()