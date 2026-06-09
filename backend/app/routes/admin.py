from app.core.config import settings
from app.core.database import get_db
from app.core.security import create_access_token
from app.models.roast import Roast
from app.models.user import User
from sqlalchemy import func
from app.schemas.user import Token
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from pydantic import BaseModel
from sqlalchemy.orm import Session

router = APIRouter(prefix="/admin", tags=["admin"])
bearer = HTTPBearer()


def _admin_user(
    creds: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db),
) -> User:
    try:
        payload = jwt.decode(creds.credentials, settings.secret_key, algorithms=[settings.algorithm])
        user_id = payload.get("sub")
    except JWTError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid token") from None
    user = db.get(User, user_id)
    if not user or not user.is_admin:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Admin access required")
    return user


class UserSummary(BaseModel):
    id: str
    email: str
    roastery_name: str
    is_beta: bool
    is_admin: bool
    email_verified: bool
    roast_count: int
    created_at: str

    model_config = {"from_attributes": True}


class AdminStats(BaseModel):
    total_users: int
    total_roasts: int
    verified_users: int
    beta_users: int


@router.get("/stats", response_model=AdminStats)
def get_stats(db: Session = Depends(get_db), _: User = Depends(_admin_user)):
    return AdminStats(
        total_users=db.query(User).count(),
        total_roasts=db.query(Roast).count(),
        verified_users=db.query(User).filter(User.email_verified == True).count(),  # noqa: E712
        beta_users=db.query(User).filter(User.is_beta == True).count(),  # noqa: E712
    )


@router.get("/users", response_model=list[UserSummary])
def list_users(db: Session = Depends(get_db), _: User = Depends(_admin_user)):
    roast_count_subq = (
        db.query(func.count(Roast.id))
        .filter(Roast.user_id == User.id)
        .correlate(User)
        .scalar_subquery()
    )
    rows = (
        db.query(User, roast_count_subq.label("rc"))
        .order_by(User.created_at.desc())
        .all()
    )
    return [
        UserSummary(
            id=u.id,
            email=u.email,
            roastery_name=u.roastery_name,
            is_beta=u.is_beta,
            is_admin=u.is_admin,
            email_verified=u.email_verified,
            roast_count=rc,
            created_at=u.created_at.isoformat(),
        )
        for u, rc in rows
    ]


@router.post("/impersonate/{user_id}", response_model=Token)
def impersonate(
    user_id: str,
    db: Session = Depends(get_db),
    admin: User = Depends(_admin_user),
):
    if user_id == admin.id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "No puedes impersonarte a ti mismo")
    target = db.get(User, user_id)
    if not target:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Usuario no encontrado")
    return Token(
        access_token=create_access_token(target.id),
        roastery_name=target.roastery_name,
        is_admin=False,
    )
