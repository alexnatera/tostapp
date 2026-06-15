import csv
import io
import re
import unicodedata
import uuid
from datetime import date

import qrcode
from app.core.config import settings
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.roast import Roast
from app.models.user import User
from app.schemas.roast import RoastCreate, RoastList, RoastOut, RoastPublic
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

router = APIRouter(tags=["roasts"])


def _make_slug(origin: str, roast_date: date) -> str:
    normalized = unicodedata.normalize("NFKD", origin).encode("ascii", "ignore").decode("ascii")
    base = re.sub(r"[^a-z0-9]+", "-", normalized.lower()).strip("-") or "roast"
    return f"{base}-{roast_date.strftime('%Y%m%d')}-{uuid.uuid4().hex[:6]}"


@router.post("/roasts", response_model=RoastOut, status_code=status.HTTP_201_CREATED)
def create_roast(
    payload: RoastCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    # Lock user row to serialize batch_number assignment per user per date
    db.query(User).filter(User.id == user.id).with_for_update().first()
    existing = (
        db.query(Roast)
        .filter(Roast.user_id == user.id, Roast.roast_date == payload.roast_date)
        .count()
    )
    batch_number = existing + 1

    for _ in range(3):
        roast = Roast(
            user_id=user.id,
            slug=_make_slug(payload.bean_origin, payload.roast_date),
            batch_number=batch_number,
            **payload.model_dump(),
        )
        db.add(roast)
        try:
            db.commit()
            db.refresh(roast)
            return roast
        except IntegrityError:
            db.rollback()

    raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, "Could not generate unique slug — please retry")


@router.get("/roasts", response_model=RoastList)
def list_roasts(
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    base_q = db.query(Roast).filter(Roast.user_id == user.id)
    total = base_q.count()
    items = (
        base_q
        .order_by(Roast.roast_date.desc(), Roast.created_at.desc())
        .limit(limit)
        .offset(offset)
        .all()
    )
    return RoastList(items=items, total=total)


@router.get("/roasts/export")
def export_roasts_csv(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    roasts = (
        db.query(Roast)
        .filter(Roast.user_id == user.id)
        .order_by(Roast.roast_date.desc())
        .all()
    )

    fields = [
        "slug", "bean_origin", "farm", "variety", "process",
        "roast_date", "roast_level", "roast_time_minutes",
        "charge_temp", "drop_temp", "green_weight_g", "roasted_weight_g",
        "batch_number", "tasting_notes", "roaster_notes", "created_at",
    ]

    buf = io.StringIO()
    buf.write("\ufeff")  # UTF-8 BOM for Excel + Spanish chars
    writer = csv.DictWriter(buf, fieldnames=fields)
    writer.writeheader()
    for r in roasts:
        writer.writerow({f: getattr(r, f, "") or "" for f in fields})

    content = buf.getvalue()
    return Response(
        content=content.encode("utf-8"),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": 'attachment; filename="tostapp-tuestes.csv"'},
    )


@router.get("/roasts/{roast_id}", response_model=RoastOut)
def get_roast(
    roast_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    roast = db.query(Roast).filter(Roast.id == roast_id, Roast.user_id == user.id).first()
    if not roast:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Roast not found")
    return roast


@router.delete("/roasts/{roast_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_roast(
    roast_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    roast = db.query(Roast).filter(Roast.id == roast_id, Roast.user_id == user.id).first()
    if not roast:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Roast not found")
    db.delete(roast)
    db.commit()


# --- Public endpoints (no auth) ---

@router.get("/r/{slug}", response_model=RoastPublic)
def public_roast(slug: str, db: Session = Depends(get_db)):
    roast = (
        db.query(Roast)
        .options(joinedload(Roast.user))
        .filter(Roast.slug == slug)
        .first()
    )
    if not roast:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Not found")
    return RoastPublic(
        **{c.name: getattr(roast, c.name) for c in Roast.__table__.columns},
        roastery_name=roast.user.roastery_name,
        roastery_slug=roast.user.roastery_slug,
    )


@router.get("/r/{slug}/qr.png")
def qr_image(slug: str, db: Session = Depends(get_db)):
    roast = db.query(Roast).filter(Roast.slug == slug).first()
    if not roast:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Not found")

    url = f"{settings.frontend_url}/r/{slug}"
    img = qrcode.make(url)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return Response(
        content=buf.getvalue(),
        media_type="image/png",
        headers={"Cache-Control": "max-age=86400"},
    )
