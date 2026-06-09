from datetime import date, datetime

from pydantic import BaseModel, Field


class SaleCreate(BaseModel):
    customer: str | None = Field(None, max_length=255)
    kg_sold: float = Field(..., gt=0)
    price_per_kg: float = Field(..., gt=0)
    sale_date: date
    notes: str | None = None


class SaleOut(SaleCreate):
    id: str
    user_id: str
    created_at: datetime

    model_config = {"from_attributes": True}


class SaleUpdate(BaseModel):
    customer: str | None = None
    kg_sold: float | None = Field(None, gt=0)
    price_per_kg: float | None = Field(None, gt=0)
    sale_date: date | None = None
    notes: str | None = None


class SaleList(BaseModel):
    items: list[SaleOut]
    total: int
