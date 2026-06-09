from datetime import date, datetime
from typing import List, Optional

from pydantic import BaseModel


class DocumentItem(BaseModel):
    description: str
    qty: float
    unit_price: float
    total: float


class DocumentCreate(BaseModel):
    doc_type: str
    doc_number: str = ""
    status: str = "borrador"
    client_name: Optional[str] = None
    client_email: Optional[str] = None
    client_address: Optional[str] = None
    client_tax_id: Optional[str] = None
    issue_date: date
    due_date: Optional[date] = None
    items: List[DocumentItem] = []
    subtotal: float = 0
    tax_rate: float = 0
    tax_amount: float = 0
    total: float = 0
    currency: str = "CLP"
    notes: Optional[str] = None


class DocumentUpdate(BaseModel):
    doc_type: Optional[str] = None
    doc_number: Optional[str] = None
    status: Optional[str] = None
    client_name: Optional[str] = None
    client_email: Optional[str] = None
    client_address: Optional[str] = None
    client_tax_id: Optional[str] = None
    issue_date: Optional[date] = None
    due_date: Optional[date] = None
    items: Optional[List[DocumentItem]] = None
    subtotal: Optional[float] = None
    tax_rate: Optional[float] = None
    tax_amount: Optional[float] = None
    total: Optional[float] = None
    currency: Optional[str] = None
    notes: Optional[str] = None


class DocumentOut(BaseModel):
    id: str
    user_id: str
    doc_type: str
    doc_number: str
    status: str
    client_name: Optional[str]
    client_email: Optional[str]
    client_address: Optional[str]
    client_tax_id: Optional[str]
    issue_date: date
    due_date: Optional[date]
    items: list
    subtotal: float
    tax_rate: float
    tax_amount: float
    total: float
    currency: str
    notes: Optional[str]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class DocumentList(BaseModel):
    items: List[DocumentOut]
    total: int


class BusinessProfileOut(BaseModel):
    roastery_name: str
    business_address: Optional[str]
    business_phone: Optional[str]
    business_email: Optional[str]
    business_tax_id: Optional[str]
    business_logo: Optional[str]
    business_website: Optional[str]
    business_city: Optional[str]
    business_country: Optional[str]

    model_config = {"from_attributes": True}


class BusinessProfileUpdate(BaseModel):
    roastery_name: Optional[str] = None
    business_address: Optional[str] = None
    business_phone: Optional[str] = None
    business_email: Optional[str] = None
    business_tax_id: Optional[str] = None
    business_logo: Optional[str] = None
    business_website: Optional[str] = None
    business_city: Optional[str] = None
    business_country: Optional[str] = None
