from datetime import UTC, datetime

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.product import Product
from app.models.user import User
from app.schemas.product import ProductCreate, ProductList, ProductOut, ProductUpdate
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

router = APIRouter(tags=["products"])


@router.get("/products", response_model=ProductList)
def list_products(
    search: str | None = None,
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(Product).filter(Product.user_id == current_user.id)
    if search:
        q = q.filter(Product.name.ilike(f"%{search}%"))
    total = q.count()
    items = q.order_by(Product.name).offset(offset).limit(limit).all()
    return {"items": items, "total": total}


@router.post("/products", response_model=ProductOut, status_code=201)
def create_product(
    data: ProductCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    product = Product(user_id=current_user.id, **data.model_dump())
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


@router.get("/products/{product_id}", response_model=ProductOut)
def get_product(
    product_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    p = db.query(Product).filter(Product.id == product_id, Product.user_id == current_user.id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return p


@router.put("/products/{product_id}", response_model=ProductOut)
def update_product(
    product_id: str,
    data: ProductUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    p = db.query(Product).filter(Product.id == product_id, Product.user_id == current_user.id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(p, field, value)
    p.updated_at = datetime.now(UTC)
    db.commit()
    db.refresh(p)
    return p


@router.patch("/products/{product_id}/stock", response_model=ProductOut)
def adjust_stock(
    product_id: str,
    delta: float,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    p = db.query(Product).filter(Product.id == product_id, Product.user_id == current_user.id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    p.stock_quantity = float(p.stock_quantity) + delta
    p.updated_at = datetime.now(UTC)
    db.commit()
    db.refresh(p)
    return p


@router.delete("/products/{product_id}", status_code=204)
def delete_product(
    product_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    p = db.query(Product).filter(Product.id == product_id, Product.user_id == current_user.id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    db.delete(p)
    db.commit()
