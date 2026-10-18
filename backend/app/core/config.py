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
    anthropic_model: str = "claude-sonnet-5-5"
    chat_max_tokens: int = 1500
    chat_daily_limit: int = 50  # user messages per day, to cap API cost
    app_url: str = "http://localhost:8080"  # used in email links
    scheduler_enabled: bool = True
    reminder_hour_utc: int = 14  # daily check time
    smtp_host: str = ""  # email reminders are off until this is set
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from: str = ""
    allow_signups: bool = True  # when false, only the very first account can be created
    login_max_attempts: int = 5  # wrong passwords allowed per email in the window
    login_window_minutes: int = 15
    cors_origins: list[str] = ["http://localhost:5173"]

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
