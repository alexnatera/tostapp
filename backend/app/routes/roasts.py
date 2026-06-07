import io
import re
import uuid
from datetime import date

import qrcode
from fastapi import APIRouter, Depends, HTTPException, Response, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.models.roast import Roast
from app.models.user import User
from app.schemas.roast import RoastCreate, RoastOut, RoastPublic

router = APIRouter(tags=["roasts"])
bearer = HTTPBearer()


def _current_user(
    creds: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db),
) -> User:
    try:
        payload = jwt.decode(creds.credentials, settings.secret_key, algorithms=[settings.algorithm])
        user_id = payload.get("sub")
    except JWTError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid token")
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User not found")
    return user


def _make_slug(origin: str, roast_date: date) -> str:
    base = re.sub(r"[^a-z0-9]+", "-", origin.lower()).strip("-")
    return f"{base}-{roast_date.strftime('%Y%m%d')}-{uuid.uuid4().hex[:6]}"


@router.post("/roasts", response_model=RoastOut, status_code=status.HTTP_201_CREATED)
def create_roast(
    payload: RoastCreate,
    db: Session = Depends(get_db),
    user: User = Depends(_current_user),
):
    batch_number = (
        db.query(Roast)
        .filter(Roast.user_id == user.id, Roast.roast_date == payload.roast_date)
        .count()
    ) + 1

    roast = Roast(
        user_id=user.id,
        slug=_make_slug(payload.bean_origin, payload.roast_date),
        batch_number=batch_number,
        **payload.model_dump(),
    )
    db.add(roast)
    db.commit()
    db.refresh(roast)
    return roast


@router.get("/roasts", response_model=list[RoastOut])
def list_roasts(
    db: Session = Depends(get_db),
    user: User = Depends(_current_user),
):
    return db.query(Roast).filter(Roast.user_id == user.id).order_by(Roast.roast_date.desc()).all()


@router.get("/roasts/{roast_id}", response_model=RoastOut)
def get_roast(
    roast_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(_current_user),
):
    roast = db.query(Roast).filter(Roast.id == roast_id, Roast.user_id == user.id).first()
    if not roast:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Roast not found")
    return roast


@router.delete("/roasts/{roast_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_roast(
    roast_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(_current_user),
):
    roast = db.query(Roast).filter(Roast.id == roast_id, Roast.user_id == user.id).first()
    if not roast:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Roast not found")
    db.delete(roast)
    db.commit()


# --- Public endpoints (no auth) ---

@router.get("/r/{slug}", response_model=RoastPublic)
def public_roast(slug: str, db: Session = Depends(get_db)):
    roast = db.query(Roast).filter(Roast.slug == slug).first()
    if not roast:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Not found")
    return RoastPublic(
        **{c.name: getattr(roast, c.name) for c in Roast.__table__.columns},
        roastery_name=roast.user.roastery_name,
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
    return Response(content=buf.getvalue(), media_type="image/png")
