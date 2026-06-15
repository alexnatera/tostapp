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
    is_active: bool
    plan_tier: str
    email_verified: bool
    roast_count: int
    created_at: str
    last_active_at: str | None
    subscription_expires_at: str | None

    model_config = {"from_attributes": True}


class PlanUpdate(BaseModel):
    plan_tier: str
    subscription_expires_at: str | None = None


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
            is_active=u.is_active,
            plan_tier=u.plan_tier,
            email_verified=u.email_verified,
            roast_count=rc,
            created_at=u.created_at.isoformat(),
            last_active_at=u.last_active_at.isoformat() if u.last_active_at else None,
            subscription_expires_at=u.subscription_expires_at.isoformat() if u.subscription_expires_at else None,
        )
        for u, rc in rows
    ]


def _build_user_summary(target: User, db: Session) -> UserSummary:
    roast_count = db.query(func.count(Roast.id)).filter(Roast.user_id == target.id).scalar() or 0
    return UserSummary(
        id=target.id,
        email=target.email,
        roastery_name=target.roastery_name,
        is_beta=target.is_beta,
        is_admin=target.is_admin,
        is_active=target.is_active,
        plan_tier=target.plan_tier,
        email_verified=target.email_verified,
        roast_count=roast_count,
        created_at=target.created_at.isoformat(),
        last_active_at=target.last_active_at.isoformat() if target.last_active_at else None,
        subscription_expires_at=target.subscription_expires_at.isoformat() if target.subscription_expires_at else None,
    )


@router.patch("/users/{user_id}/toggle", response_model=UserSummary)
def toggle_user_active(
    user_id: str,
    db: Session = Depends(get_db),
    admin: User = Depends(_admin_user),
):
    if user_id == admin.id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "No puedes suspender tu propia cuenta")
    target = db.get(User, user_id)
    if not target:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Usuario no encontrado")
    target.is_active = not target.is_active
    db.commit()
    db.refresh(target)
    return _build_user_summary(target, db)


@router.patch("/users/{user_id}/plan", response_model=UserSummary)
def set_user_plan(
    user_id: str,
    data: PlanUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(_admin_user),
):
    valid_plans = {"beta", "pro", "enterprise"}
    if data.plan_tier not in valid_plans:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"plan_tier debe ser uno de: {', '.join(sorted(valid_plans))}",
        )
    target = db.get(User, user_id)
    if not target:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Usuario no encontrado")
    target.plan_tier = data.plan_tier
    if data.subscription_expires_at:
        from datetime import UTC, datetime
        target.subscription_expires_at = datetime.fromisoformat(data.subscription_expires_at).replace(tzinfo=UTC)
    else:
        target.subscription_expires_at = None
    db.commit()
    db.refresh(target)
    return _build_user_summary(target, db)


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
