import uuid
from datetime import UTC, date, datetime

from app.core.database import Base
from sqlalchemy import (
    CheckConstraint,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship


class Roast(Base):
    __tablename__ = "roasts"
    __table_args__ = (CheckConstraint("roast_level IN ('light', 'medium', 'dark')", name="ck_roasts_roast_level"),)

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), nullable=False)
    slug: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)  # used in QR URL

    # Bean info
    bean_origin: Mapped[str] = mapped_column(String, nullable=False)  # e.g. "Huila, Colombia"
    farm: Mapped[str | None] = mapped_column(String)
    variety: Mapped[str | None] = mapped_column(String)  # e.g. "Castillo"
    process: Mapped[str | None] = mapped_column(String)  # e.g. "Lavado"

    # Roast info
    roast_date: Mapped[date] = mapped_column(Date, nullable=False)
    roast_level: Mapped[str] = mapped_column(String, nullable=False)  # light/medium/dark
    roast_time_minutes: Mapped[float | None] = mapped_column(Float)
    charge_temp: Mapped[int | None] = mapped_column(Integer)
    drop_temp: Mapped[int | None] = mapped_column(Integer)

    # Batch info
    green_weight_g: Mapped[int | None] = mapped_column(Integer)
    roasted_weight_g: Mapped[int | None] = mapped_column(Integer)
    batch_number: Mapped[int] = mapped_column(Integer, default=1)

    # Story (shown on QR page)
    tasting_notes: Mapped[str | None] = mapped_column(String)  # e.g. "Chocolate, caramelo, cítrico"
    roaster_notes: Mapped[str | None] = mapped_column(Text)  # freeform story

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(UTC))

    profile_data: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    user: Mapped["User"] = relationship(back_populates="roasts")  # noqa: F821
