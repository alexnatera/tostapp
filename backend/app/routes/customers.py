from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.customer import Customer
from app.models.user import User
from app.schemas.customer import CustomerCreate, CustomerList, CustomerOut, CustomerUpdate
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

router = APIRouter(tags=["customers"])


@router.post("/customers", response_model=CustomerOut, status_code=status.HTTP_201_CREATED)
def create_customer(
    payload: CustomerCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    customer = Customer(user_id=user.id, **payload.model_dump())
    db.add(customer)
    db.commit()
    db.refresh(customer)
    return customer


@router.get("/customers", response_model=CustomerList)
def list_customers(
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    base_q = db.query(Customer).filter(Customer.user_id == user.id)
    total = base_q.count()
    items = (
        base_q
        .order_by(Customer.created_at.desc())
        .limit(limit)
        .offset(offset)
        .all()
    )
    return CustomerList(items=items, total=total)


@router.get("/customers/{customer_id}", response_model=CustomerOut)
def get_customer(
    customer_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    customer = db.query(Customer).filter(Customer.id == customer_id, Customer.user_id == user.id).first()
    if not customer:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Customer not found")
    return customer


@router.put("/customers/{customer_id}", response_model=CustomerOut)
def update_customer(
    customer_id: str,
    payload: CustomerUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    customer = db.query(Customer).filter(Customer.id == customer_id, Customer.user_id == user.id).first()
    if not customer:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Customer not found")
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(customer, field, value)
    db.commit()
    db.refresh(customer)
    return customer


@router.delete("/customers/{customer_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_customer(
    customer_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    customer = db.query(Customer).filter(Customer.id == customer_id, Customer.user_id == user.id).first()
    if not customer:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Customer not found")
    db.delete(customer)
    db.commit()
