from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.purchase import Purchase
from app.models.user import User
from app.schemas.purchase import PurchaseCreate, PurchaseList, PurchaseOut, PurchaseUpdate
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

router = APIRouter(tags=["purchases"])


@router.post("/purchases", response_model=PurchaseOut, status_code=status.HTTP_201_CREATED)
def create_purchase(
    payload: PurchaseCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    purchase = Purchase(user_id=user.id, **payload.model_dump())
    db.add(purchase)
    db.commit()
    db.refresh(purchase)
    return purchase


@router.get("/purchases", response_model=PurchaseList)
def list_purchases(
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    base_q = db.query(Purchase).filter(Purchase.user_id == user.id)
    total = base_q.count()
    items = (
        base_q
        .order_by(Purchase.purchase_date.desc(), Purchase.created_at.desc())
        .limit(limit)
        .offset(offset)
        .all()
    )
    return PurchaseList(items=items, total=total)


@router.get("/purchases/{purchase_id}", response_model=PurchaseOut)
def get_purchase(
    purchase_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    purchase = db.query(Purchase).filter(Purchase.id == purchase_id, Purchase.user_id == user.id).first()
    if not purchase:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Purchase not found")
    return purchase


@router.put("/purchases/{purchase_id}", response_model=PurchaseOut)
def update_purchase(
    purchase_id: str,
    payload: PurchaseUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    purchase = db.query(Purchase).filter(Purchase.id == purchase_id, Purchase.user_id == user.id).first()
    if not purchase:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Purchase not found")
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(purchase, field, value)
    db.commit()
    db.refresh(purchase)
    return purchase


@router.delete("/purchases/{purchase_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_purchase(
    purchase_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    purchase = db.query(Purchase).filter(Purchase.id == purchase_id, Purchase.user_id == user.id).first()
    if not purchase:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Purchase not found")
    db.delete(purchase)
    db.commit()
