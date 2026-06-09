from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.purchase import Purchase
from app.models.roast import Roast
from app.models.sale import Sale
from app.models.user import User
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

router = APIRouter(tags=["inventory"])


class OriginStock(BaseModel):
    origin: str
    verde_kg: float
    tostado_kg: float


class RecentRoast(BaseModel):
    id: str
    bean_origin: str
    roast_date: str
    roasted_weight_g: int | None
    roast_level: str


class InventorySummary(BaseModel):
    stock_verde_kg: float
    stock_tostado_kg: float
    stock_vendido_kg: float
    by_origin: list[OriginStock]
    recent_roasts: list[RecentRoast]
    low_stock_alert: bool


@router.get("/inventory/summary", response_model=InventorySummary)
def inventory_summary(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    uid = user.id

    # Totals
    total_purchased = db.query(func.coalesce(func.sum(Purchase.kg_purchased), 0.0)).filter(
        Purchase.user_id == uid
    ).scalar() or 0.0

    total_green_used = db.query(func.coalesce(func.sum(Roast.green_weight_g), 0.0)).filter(
        Roast.user_id == uid
    ).scalar() or 0.0
    total_green_used_kg = float(total_green_used) / 1000.0

    total_roasted = db.query(func.coalesce(func.sum(Roast.roasted_weight_g), 0.0)).filter(
        Roast.user_id == uid
    ).scalar() or 0.0
    total_roasted_kg = float(total_roasted) / 1000.0

    total_sold = db.query(func.coalesce(func.sum(Sale.kg_sold), 0.0)).filter(
        Sale.user_id == uid
    ).scalar() or 0.0

    stock_verde_kg = float(total_purchased) - total_green_used_kg
    stock_tostado_kg = total_roasted_kg - float(total_sold)
    stock_vendido_kg = float(total_sold)

    # By origin — purchases grouped
    purchase_by_origin = (
        db.query(Purchase.bean_origin, func.sum(Purchase.kg_purchased).label("verde_kg"))
        .filter(Purchase.user_id == uid, Purchase.bean_origin.isnot(None))
        .group_by(Purchase.bean_origin)
        .all()
    )

    # Roasted weight by origin
    roasted_by_origin = (
        db.query(Roast.bean_origin, func.sum(Roast.roasted_weight_g).label("roasted_g"))
        .filter(Roast.user_id == uid)
        .group_by(Roast.bean_origin)
        .all()
    )
    roasted_map = {r.bean_origin: (r.roasted_g or 0) / 1000.0 for r in roasted_by_origin}

    by_origin = []
    for row in purchase_by_origin:
        origin = row.bean_origin or "Sin origen"
        verde_kg = float(row.verde_kg or 0)
        tostado_kg = roasted_map.get(origin, 0.0)
        by_origin.append(OriginStock(origin=origin, verde_kg=round(verde_kg, 3), tostado_kg=round(tostado_kg, 3)))

    # Recent roasts (last 5)
    recent = (
        db.query(Roast)
        .filter(Roast.user_id == uid)
        .order_by(Roast.roast_date.desc(), Roast.created_at.desc())
        .limit(5)
        .all()
    )
    recent_roasts = [
        RecentRoast(
            id=r.id,
            bean_origin=r.bean_origin,
            roast_date=str(r.roast_date),
            roasted_weight_g=r.roasted_weight_g,
            roast_level=r.roast_level,
        )
        for r in recent
    ]

    return InventorySummary(
        stock_verde_kg=round(stock_verde_kg, 3),
        stock_tostado_kg=round(stock_tostado_kg, 3),
        stock_vendido_kg=round(stock_vendido_kg, 3),
        by_origin=by_origin,
        recent_roasts=recent_roasts,
        low_stock_alert=stock_tostado_kg < 5.0,
    )
