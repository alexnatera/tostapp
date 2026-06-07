from datetime import date, datetime

from pydantic import BaseModel


class RoastCreate(BaseModel):
    bean_origin: str
    farm: str | None = None
    variety: str | None = None
    process: str | None = None
    roast_date: date
    roast_level: str  # light | medium | dark
    roast_time_minutes: float | None = None
    charge_temp: int | None = None
    drop_temp: int | None = None
    green_weight_g: int | None = None
    roasted_weight_g: int | None = None
    tasting_notes: str | None = None
    roaster_notes: str | None = None


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
