from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.sale import Sale
from app.models.user import User
from app.schemas.sale import SaleCreate, SaleList, SaleOut, SaleUpdate
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

router = APIRouter(tags=["sales"])


@router.post("/sales", response_model=SaleOut, status_code=status.HTTP_201_CREATED)
def create_sale(
    payload: SaleCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    sale = Sale(user_id=user.id, **payload.model_dump())
    db.add(sale)
    db.commit()
    db.refresh(sale)
    return sale


@router.get("/sales", response_model=SaleList)
def list_sales(
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    base_q = db.query(Sale).filter(Sale.user_id == user.id)
    total = base_q.count()
    items = (
        base_q
        .order_by(Sale.sale_date.desc(), Sale.created_at.desc())
        .limit(limit)
        .offset(offset)
        .all()
    )
    return SaleList(items=items, total=total)


@router.get("/sales/{sale_id}", response_model=SaleOut)
def get_sale(
    sale_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    sale = db.query(Sale).filter(Sale.id == sale_id, Sale.user_id == user.id).first()
    if not sale:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Sale not found")
    return sale


@router.put("/sales/{sale_id}", response_model=SaleOut)
def update_sale(
    sale_id: str,
    payload: SaleUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    sale = db.query(Sale).filter(Sale.id == sale_id, Sale.user_id == user.id).first()
    if not sale:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Sale not found")
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(sale, field, value)
    db.commit()
    db.refresh(sale)
    return sale


@router.delete("/sales/{sale_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_sale(
    sale_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    sale = db.query(Sale).filter(Sale.id == sale_id, Sale.user_id == user.id).first()
    if not sale:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Sale not found")
    db.delete(sale)
    db.commit()
