from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel


class ProductCreate(BaseModel):
    name: str
    description: Optional[str] = None
    sku: Optional[str] = None
    unit: str = "unidad"
    price: float = 0
    stock_quantity: float = 0


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    sku: Optional[str] = None
    unit: Optional[str] = None
    price: Optional[float] = None
    stock_quantity: Optional[float] = None


class ProductOut(BaseModel):
    id: str
    user_id: str
    name: str
    description: Optional[str]
    sku: Optional[str]
    unit: str
    price: float
    stock_quantity: float
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ProductList(BaseModel):
    items: List[ProductOut]
    total: int
