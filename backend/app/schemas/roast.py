from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, Field


class RoastCreate(BaseModel):
    bean_origin: str = Field(..., max_length=120)
    farm: str | None = Field(None, max_length=255)
    variety: str | None = Field(None, max_length=255)
    process: str | None = Field(None, max_length=255)
    roast_date: date
    roast_level: Literal["light", "medium", "dark"] = "medium"
    roast_time_minutes: float | None = None
    charge_temp: int | None = None
    drop_temp: int | None = None
    green_weight_g: int | None = None
    roasted_weight_g: int | None = None
    tasting_notes: str | None = Field(None, max_length=255)
    roaster_notes: str | None = Field(None, max_length=4000)


class RoastOut(RoastCreate):
    id: str
    slug: str
    user_id: str
    batch_number: int
    created_at: datetime

    model_config = {"from_attributes": True}


class RoastPublic(BaseModel):
    """Schema for public QR landing page — no sensitive data."""
    slug: str
    roastery_name: str
    bean_origin: str
    farm: str | None
    variety: str | None
    process: str | None
    roast_date: date
    roast_level: str
    tasting_notes: str | None
    roaster_notes: str | None
    batch_number: int

    model_config = {"from_attributes": True}
