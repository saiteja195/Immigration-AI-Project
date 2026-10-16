import secrets

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Immigration AI"
    mongo_url: str = "mongodb://localhost:27017"
    mongo_db: str = "immigration_ai"
    jwt_secret: str = secrets.token_urlsafe(32)  # set JWT_SECRET in prod so logins survive restarts
    token_minutes: int = 60 * 24
    cookie_secure: bool = False  # set True behind HTTPS
    anthropic_api_key: str = ""  # chat is disabled until this is set
    anthropic_model: str = "claude-haiku-5-5"
    chat_max_tokens: int = 1500
    chat_daily_limit: int = 50  # user messages per day, to cap API cost
    cors_origins: list[str] = ["http://localhost:5173"]

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
