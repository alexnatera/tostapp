from datetime import datetime

from pydantic import BaseModel, ConfigDict


class CustomerCreate(BaseModel):
    name: str
    email: str | None = None
    phone: str | None = None
    whatsapp: str | None = None
    instagram: str | None = None
    facebook: str | None = None
    website: str | None = None
    address: str | None = None
    city: str | None = None
    tax_id: str | None = None
    type: str = "B2B"
    notes: str | None = None


class CustomerUpdate(BaseModel):
    name: str | None = None
    email: str | None = None
    phone: str | None = None
    whatsapp: str | None = None
    instagram: str | None = None
    facebook: str | None = None
    website: str | None = None
    address: str | None = None
    city: str | None = None
    tax_id: str | None = None
    type: str | None = None
    notes: str | None = None


class CustomerOut(CustomerCreate):
    id: str
    user_id: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CustomerList(BaseModel):
    items: list[CustomerOut]
    total: int
