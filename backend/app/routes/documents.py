import re

from app.core.deps import get_current_user
from app.core.database import get_db
from app.models.document import Document
from app.models.user import User
from app.schemas.document import (
    BusinessProfileOut,
    BusinessProfileUpdate,
    DocumentCreate,
    DocumentList,
    DocumentOut,
    DocumentUpdate,
)
from datetime import UTC, datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import extract, func
from sqlalchemy.orm import Session

router = APIRouter(tags=["documents"])

_DOC_PREFIXES = {"presupuesto": "PRE", "boleta": "BOL", "factura": "FAC"}
_SLUG_RE = re.compile(r"^[a-z0-9-]+$")


def _next_number(db: Session, user_id: str, doc_type: str, year: int) -> str:
    prefix = _DOC_PREFIXES.get(doc_type, "DOC")
    count = (
        db.query(func.count(Document.id))
        .filter(
            Document.user_id == user_id,
            Document.doc_type == doc_type,
            extract("year", Document.issue_date) == year,
        )
        .scalar()
        or 0
    )
    return f"{prefix}-{year}-{count + 1:03d}"


# ── Business profile ──────────────────────────────────────────────────────────

@router.get("/profile/business", response_model=BusinessProfileOut)
def get_business_profile(current_user: User = Depends(get_current_user)):
    return current_user


@router.put("/profile/business", response_model=BusinessProfileOut)
def update_business_profile(
    data: BusinessProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Validate slug uniqueness and format when being changed
    if data.roastery_slug is not None:
        slug = data.roastery_slug
        if slug and not _SLUG_RE.match(slug):
            raise HTTPException(400, "El slug solo puede contener letras minúsculas, números y guiones")
        if slug:
            conflict = db.query(User).filter(
                User.roastery_slug == slug, User.id != current_user.id
            ).first()
            if conflict:
                raise HTTPException(409, "Ese slug ya está en uso por otra tostería")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(current_user, field, value)
    db.commit()
    db.refresh(current_user)
    return current_user


# ── Documents CRUD ────────────────────────────────────────────────────────────

@router.get("/documents", response_model=DocumentList)
def list_documents(
    doc_type: str | None = None,
    status: str | None = None,
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(Document).filter(Document.user_id == current_user.id)
    if doc_type:
        q = q.filter(Document.doc_type == doc_type)
    if status:
        q = q.filter(Document.status == status)
    total = q.count()
    items = q.order_by(Document.created_at.desc()).offset(offset).limit(limit).all()
    return {"items": items, "total": total}


@router.post("/documents", response_model=DocumentOut, status_code=201)
def create_document(
    data: DocumentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Lock user row to serialize doc number assignment and prevent duplicates
    db.query(User).filter(User.id == current_user.id).with_for_update().first()
    doc_number = data.doc_number.strip() if data.doc_number else ""
    if not doc_number:
        doc_number = _next_number(db, current_user.id, data.doc_type, data.issue_date.year)

    doc = Document(
        user_id=current_user.id,
        doc_type=data.doc_type,
        doc_number=doc_number,
        status=data.status,
        client_name=data.client_name,
        client_email=data.client_email,
        client_address=data.client_address,
        client_tax_id=data.client_tax_id,
        issue_date=data.issue_date,
        due_date=data.due_date,
        items=[item.model_dump() for item in data.items],
        subtotal=data.subtotal,
        tax_rate=data.tax_rate,
        tax_amount=data.tax_amount,
        total=data.total,
        currency=data.currency,
        notes=data.notes,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc


@router.get("/documents/{doc_id}", response_model=DocumentOut)
def get_document(
    doc_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    doc = db.query(Document).filter(Document.id == doc_id, Document.user_id == current_user.id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Documento no encontrado")
    return doc


@router.put("/documents/{doc_id}", response_model=DocumentOut)
def update_document(
    doc_id: str,
    data: DocumentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    doc = db.query(Document).filter(Document.id == doc_id, Document.user_id == current_user.id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Documento no encontrado")

    payload = data.model_dump(exclude_none=True)
    if "items" in payload:
        payload["items"] = [item.model_dump() if hasattr(item, "model_dump") else item for item in payload["items"]]
    for field, value in payload.items():
        setattr(doc, field, value)

    doc.updated_at = datetime.now(UTC)
    db.commit()
    db.refresh(doc)
    return doc


@router.delete("/documents/{doc_id}", status_code=204)
def delete_document(
    doc_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    doc = db.query(Document).filter(Document.id == doc_id, Document.user_id == current_user.id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Documento no encontrado")
    db.delete(doc)
    db.commit()


@router.get("/documents/next-number/{doc_type}")
def get_next_number(
    doc_type: str,
    year: int | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from datetime import date
    y = year or date.today().year
    return {"doc_number": _next_number(db, current_user.id, doc_type, y)}
