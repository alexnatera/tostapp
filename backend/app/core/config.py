from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str
    secret_key: str
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24 * 7  # 7 days
    frontend_url: str = "http://localhost:5173"

    # CORS — comma-separated list of allowed origins
    cors_origins: str = "http://localhost:5173"

    # Rate limiting
    rate_limit_auth: str = "10/minute"  # stricter for auth endpoints
    rate_limit_default: str = "60/minute"

    # Email verification (set up with your provider in production)
    # For now tokens are returned in API response for dev
    email_verification_required: bool = False  # toggle when email provider is configured
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    admin_email: str = ""

    class Config:
        env_file = ".env"


settings = Settings()
