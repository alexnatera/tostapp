from pydantic import Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str
    secret_key: str
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24 * 7  # 7 days
    frontend_url: str = Field(default="http://localhost:5173", validation_alias="APP_URL")

    # CORS — comma-separated list of allowed origins
    cors_origins: str = "http://localhost:5173"

    # Rate limiting
    rate_limit_auth: str = "10/minute"
    rate_limit_default: str = "60/minute"

    # Email — Resend (https://resend.com, free tier: 3k emails/month)
    resend_api_key: str = ""
    email_from: str = "Tostapp <noreply@tostapp.app>"
    email_verification_required: bool = False
    admin_email: str = ""

    class Config:
        env_file = ".env"
        populate_by_name = True


settings = Settings()
