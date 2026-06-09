from datetime import UTC, date, datetime, timedelta

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.purchase import Purchase
from app.models.roast import Roast
from app.models.sale import Sale
from app.models.user import User
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

router = APIRouter(tags=["finance"])


class WeekSummary(BaseModel):
    week_start: date
    purchased_cost: float
    revenue: float
    roasted_kg: float
    sold_kg: float


class FinanceDashboard(BaseModel):
    period_days: int
    total_purchased_kg: float
    total_purchased_cost: float
    avg_cost_per_kg_verde: float
    total_roasted_kg: float
    avg_yield_pct: float
    cost_per_kg_roasted: float
    total_sold_kg: float
    total_revenue: float
    gross_margin: float
    gross_margin_pct: float
    stock_verde_kg: float
    stock_roasted_kg: float
    weekly_summary: list[WeekSummary]


@router.get("/finance/dashboard", response_model=FinanceDashboard)
def finance_dashboard(
    days: int = Query(default=30, ge=7, le=365),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    since = datetime.now(UTC).date() - timedelta(days=days)

    purchases = (
        db.query(Purchase)
        .filter(Purchase.user_id == user.id, Purchase.purchase_date >= since)
        .all()
    )
    sales = (
        db.query(Sale)
        .filter(Sale.user_id == user.id, Sale.sale_date >= since)
        .all()
    )
    roasts = (
        db.query(Roast)
        .filter(Roast.user_id == user.id, Roast.roast_date >= since)
        .all()
    )

    total_purchased_kg = sum(p.kg_purchased for p in purchases)
    total_purchased_cost = sum(p.kg_purchased * p.price_per_kg for p in purchases)
    avg_cost_per_kg_verde = (total_purchased_cost / total_purchased_kg) if total_purchased_kg > 0 else 0.0

    yield_roasts = [
        r for r in roasts
        if r.green_weight_g and r.roasted_weight_g and r.green_weight_g > 0
    ]
    avg_yield_pct = (
        sum(r.roasted_weight_g / r.green_weight_g for r in yield_roasts) / len(yield_roasts)
        if yield_roasts else 0.0
    )
    total_roasted_kg = sum((r.roasted_weight_g or 0) / 1000.0 for r in roasts)

    cost_per_kg_roasted = (
        avg_cost_per_kg_verde / avg_yield_pct if avg_yield_pct > 0 else 0.0
    )

    total_sold_kg = sum(s.kg_sold for s in sales)
    total_revenue = sum(s.kg_sold * s.price_per_kg for s in sales)

    proportional_verde_cost = (
        (total_sold_kg / total_purchased_kg) * total_purchased_cost
        if total_purchased_kg > 0 else 0.0
    )
    gross_margin = total_revenue - proportional_verde_cost
    gross_margin_pct = (gross_margin / total_revenue * 100) if total_revenue > 0 else 0.0

    all_purchases = db.query(Purchase).filter(Purchase.user_id == user.id).all()
    all_sales = db.query(Sale).filter(Sale.user_id == user.id).all()
    all_roasts = db.query(Roast).filter(Roast.user_id == user.id).all()

    total_ever_purchased_kg = sum(p.kg_purchased for p in all_purchases)
    total_ever_green_used_kg = sum((r.green_weight_g or 0) / 1000.0 for r in all_roasts)
    stock_verde_kg = max(0.0, total_ever_purchased_kg - total_ever_green_used_kg)

    total_ever_roasted_kg = sum((r.roasted_weight_g or 0) / 1000.0 for r in all_roasts)
    total_ever_sold_kg = sum(s.kg_sold for s in all_sales)
    stock_roasted_kg = max(0.0, total_ever_roasted_kg - total_ever_sold_kg)

    weekly_summary: list[WeekSummary] = []
    today = datetime.now(UTC).date()
    days_since_monday = today.weekday()
    current_week_start = today - timedelta(days=days_since_monday)

    for i in range(8):
        week_start = current_week_start - timedelta(weeks=i)
        week_end = week_start + timedelta(days=6)

        week_purchased_cost = sum(
            p.kg_purchased * p.price_per_kg
            for p in purchases
            if week_start <= p.purchase_date <= week_end
        )
        week_revenue = sum(
            s.kg_sold * s.price_per_kg
            for s in sales
            if week_start <= s.sale_date <= week_end
        )
        week_roasted_kg = sum(
            (r.roasted_weight_g or 0) / 1000.0
            for r in roasts
            if week_start <= r.roast_date <= week_end
        )
        week_sold_kg = sum(
            s.kg_sold
            for s in sales
            if week_start <= s.sale_date <= week_end
        )
        weekly_summary.append(WeekSummary(
            week_start=week_start,
            purchased_cost=week_purchased_cost,
            revenue=week_revenue,
            roasted_kg=week_roasted_kg,
            sold_kg=week_sold_kg,
        ))

    weekly_summary.reverse()

    return FinanceDashboard(
        period_days=days,
        total_purchased_kg=total_purchased_kg,
        total_purchased_cost=total_purchased_cost,
        avg_cost_per_kg_verde=avg_cost_per_kg_verde,
        total_roasted_kg=total_roasted_kg,
        avg_yield_pct=avg_yield_pct,
        cost_per_kg_roasted=cost_per_kg_roasted,
        total_sold_kg=total_sold_kg,
        total_revenue=total_revenue,
        gross_margin=gross_margin,
        gross_margin_pct=gross_margin_pct,
        stock_verde_kg=stock_verde_kg,
        stock_roasted_kg=stock_roasted_kg,
        weekly_summary=weekly_summary,
    )
