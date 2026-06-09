from datetime import date, datetime

from pydantic import BaseModel, Field


class PurchaseCreate(BaseModel):
    supplier: str | None = Field(None, max_length=255)
    bean_origin: str | None = Field(None, max_length=120)
    kg_purchased: float = Field(..., gt=0)
    price_per_kg: float = Field(..., gt=0)
    purchase_date: date
    notes: str | None = None


class PurchaseOut(PurchaseCreate):
    id: str
    user_id: str
    created_at: datetime

    model_config = {"from_attributes": True}


class PurchaseUpdate(BaseModel):
    supplier: str | None = Field(None, max_length=255)
    bean_origin: str | None = Field(None, max_length=120)
    kg_purchased: float | None = Field(None, gt=0)
    price_per_kg: float | None = Field(None, gt=0)
    purchase_date: date | None = None
    notes: str | None = None


class PurchaseList(BaseModel):
    items: list[PurchaseOut]
    total: int
