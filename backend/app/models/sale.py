import uuid
from datetime import UTC, date, datetime

from app.core.database import Base
from sqlalchemy import Date, DateTime, Float, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship


class Sale(Base):
    __tablename__ = "sales"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    customer: Mapped[str | None] = mapped_column(String(255))
    kg_sold: Mapped[float] = mapped_column(Float, nullable=False)
    price_per_kg: Mapped[float] = mapped_column(Float, nullable=False)
    sale_date: Mapped[date] = mapped_column(Date, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(UTC))

    customer_id: Mapped[str | None] = mapped_column(String, ForeignKey("customers.id", ondelete="SET NULL"), nullable=True)

    user: Mapped["User"] = relationship(back_populates="sales")  # noqa: F821
    customer_rel: Mapped["Customer | None"] = relationship(foreign_keys=[customer_id])  # noqa: F821
