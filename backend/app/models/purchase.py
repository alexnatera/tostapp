import uuid
from datetime import UTC, date, datetime

from app.core.database import Base
from sqlalchemy import Date, DateTime, Float, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship


class Purchase(Base):
    __tablename__ = "purchases"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    supplier: Mapped[str | None] = mapped_column(String(255))
    bean_origin: Mapped[str | None] = mapped_column(String(120))
    kg_purchased: Mapped[float] = mapped_column(Float, nullable=False)
    price_per_kg: Mapped[float] = mapped_column(Float, nullable=False)
    purchase_date: Mapped[date] = mapped_column(Date, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(UTC))

    supplier_id: Mapped[str | None] = mapped_column(String, ForeignKey("suppliers.id", ondelete="SET NULL"), nullable=True)

    user: Mapped["User"] = relationship(back_populates="purchases")  # noqa: F821
    supplier_rel: Mapped["Supplier | None"] = relationship(foreign_keys=[supplier_id])  # noqa: F821
