import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, String, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String, nullable=False)
    roastery_name: Mapped[str] = mapped_column(String, nullable=False)
    is_beta: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Email verification
    email_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    verification_code: Mapped[str | None] = mapped_column(String(6))
    verification_code_expires: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    # Password reset
    reset_token: Mapped[str | None] = mapped_column(String)
    reset_token_expires: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    # Rate limiting / security
    login_attempts: Mapped[int] = mapped_column(Integer, default=0)
    locked_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    roasts: Mapped[list["Roast"]] = relationship(back_populates="user", cascade="all, delete-orphan")  # noqa: F821
