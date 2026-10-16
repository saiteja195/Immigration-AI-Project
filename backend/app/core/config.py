import secrets

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Immigration AI"
    mongo_url: str = "mongodb://localhost:27017"
    mongo_db: str = "immigration_ai"
    jwt_secret: str = secrets.token_urlsafe(32)  # set JWT_SECRET in prod so logins survive restarts
    token_minutes: int = 60 * 24
    cookie_secure: bool = False  # set True behind HTTPS
    cors_origins: list[str] = ["http://localhost:5173"]

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
