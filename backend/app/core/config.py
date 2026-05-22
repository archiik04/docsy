from pydantic_settings import BaseSettings
from pydantic_settings import SettingsConfigDict


class Settings(BaseSettings):

    DATABASE_URL: str

    model_config = SettingsConfigDict(
        env_file=".env"
    )


settings = Settings()