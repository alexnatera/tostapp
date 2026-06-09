from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.supplier import Supplier
from app.models.user import User
from app.schemas.supplier import SupplierCreate, SupplierList, SupplierOut, SupplierUpdate
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

router = APIRouter(tags=["suppliers"])


@router.post("/suppliers", response_model=SupplierOut, status_code=status.HTTP_201_CREATED)
def create_supplier(
    payload: SupplierCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    supplier = Supplier(user_id=user.id, **payload.model_dump())
    db.add(supplier)
    db.commit()
    db.refresh(supplier)
    return supplier


@router.get("/suppliers", response_model=SupplierList)
def list_suppliers(
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    base_q = db.query(Supplier).filter(Supplier.user_id == user.id)
    total = base_q.count()
    items = (
        base_q
        .order_by(Supplier.created_at.desc())
        .limit(limit)
        .offset(offset)
        .all()
    )
    return SupplierList(items=items, total=total)


@router.put("/suppliers/{supplier_id}", response_model=SupplierOut)
def update_supplier(
    supplier_id: str,
    payload: SupplierUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    supplier = db.query(Supplier).filter(Supplier.id == supplier_id, Supplier.user_id == user.id).first()
    if not supplier:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Supplier not found")
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(supplier, field, value)
    db.commit()
    db.refresh(supplier)
    return supplier


@router.delete("/suppliers/{supplier_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_supplier(
    supplier_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    supplier = db.query(Supplier).filter(Supplier.id == supplier_id, Supplier.user_id == user.id).first()
    if not supplier:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Supplier not found")
    db.delete(supplier)
    db.commit()
