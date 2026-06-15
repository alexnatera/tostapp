import uuid
from datetime import UTC, datetime

from app.core.database import Base
from sqlalchemy import Boolean, DateTime, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String, nullable=False)
    roastery_name: Mapped[str] = mapped_column(String, nullable=False)
    is_beta: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_admin: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

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

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(UTC))

    # Business profile
    business_address: Mapped[str | None] = mapped_column(Text)
    business_phone: Mapped[str | None] = mapped_column(String(50))
    business_email: Mapped[str | None] = mapped_column(String(255))
    business_tax_id: Mapped[str | None] = mapped_column(String(100))
    business_logo: Mapped[str | None] = mapped_column(Text)
    business_website: Mapped[str | None] = mapped_column(String(255))
    business_city: Mapped[str | None] = mapped_column(String(100))
    business_country: Mapped[str | None] = mapped_column(String(100))

    # Public shop
    roastery_slug: Mapped[str | None] = mapped_column(String(100), unique=True, nullable=True)
    whatsapp_number: Mapped[str | None] = mapped_column(String(30), nullable=True)
    shop_theme: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    roasts: Mapped[list["Roast"]] = relationship(back_populates="user", cascade="all, delete-orphan")  # noqa: F821
    purchases: Mapped[list["Purchase"]] = relationship(back_populates="user", cascade="all, delete-orphan")  # noqa: F821
    sales: Mapped[list["Sale"]] = relationship(back_populates="user", cascade="all, delete-orphan")  # noqa: F821
    customers: Mapped[list["Customer"]] = relationship(back_populates="user", cascade="all, delete-orphan")  # noqa: F821
    suppliers: Mapped[list["Supplier"]] = relationship(back_populates="user", cascade="all, delete-orphan")  # noqa: F821
    documents: Mapped[list["Document"]] = relationship(back_populates="user", cascade="all, delete-orphan")  # noqa: F821
    products: Mapped[list["Product"]] = relationship(back_populates="user", cascade="all, delete-orphan")  # noqa: F821
