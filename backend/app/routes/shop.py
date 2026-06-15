"""Public shop endpoint — no authentication required."""
from typing import Optional

from app.core.database import get_db
from app.models.product import Product
from app.models.user import User
from app.schemas.shop import ShopTheme
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

router = APIRouter(tags=["shop"])


class ShopProduct(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    unit: str
    price: float
    stock_quantity: float

    model_config = {"from_attributes": True}


class ShopPublic(BaseModel):
    roastery_name: str
    roastery_slug: str
    business_city: Optional[str] = None
    business_country: Optional[str] = None
    business_logo: Optional[str] = None
    business_website: Optional[str] = None
    whatsapp_number: Optional[str] = None
    theme: ShopTheme
    products: list[ShopProduct]


@router.get("/tienda/{roastery_slug}", response_model=ShopPublic)
def get_shop(roastery_slug: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.roastery_slug == roastery_slug).first()
    if not user:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Tostería no encontrada")
    products = (
        db.query(Product)
        .filter(Product.user_id == user.id)
        .order_by(Product.name)
        .all()
    )
    theme = ShopTheme(**(user.shop_theme or {}))
    return ShopPublic(
        roastery_name=user.roastery_name,
        roastery_slug=user.roastery_slug,
        business_city=user.business_city,
        business_country=user.business_country,
        business_logo=user.business_logo,
        business_website=user.business_website,
        whatsapp_number=user.whatsapp_number,
        theme=theme,
        products=[ShopProduct.model_validate(p) for p in products],
    )
