from datetime import datetime

from pydantic import BaseModel, ConfigDict


class SupplierCreate(BaseModel):
    name: str
    email: str | None = None
    phone: str | None = None
    whatsapp: str | None = None
    website: str | None = None
    address: str | None = None
    city: str | None = None
    contact_person: str | None = None
    notes: str | None = None


class SupplierUpdate(BaseModel):
    name: str | None = None
    email: str | None = None
    phone: str | None = None
    whatsapp: str | None = None
    website: str | None = None
    address: str | None = None
    city: str | None = None
    contact_person: str | None = None
    notes: str | None = None


class SupplierOut(SupplierCreate):
    id: str
    user_id: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SupplierList(BaseModel):
    items: list[SupplierOut]
    total: int
