import secrets
from datetime import UTC, datetime, timedelta

from app.core.config import settings
from app.core.database import get_db
from app.core.security import create_access_token, hash_password, verify_password
from app.models.user import User
from app.utils.email import send_reset_email, send_verification_email
from app.schemas.user import (
    ForgotPasswordRequest,
    ResetPasswordRequest,
    Token,
    UserCreate,
    UserLogin,
    UserOut,
    VerifyEmailRequest,
)
from fastapi import APIRouter, Depends, HTTPException, Request, status
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.orm import Session

router = APIRouter(prefix="/auth", tags=["auth"])
limiter = Limiter(key_func=get_remote_address)


def _generate_code() -> str:
    """6-digit verification code."""
    return str(secrets.randbelow(900000) + 100000)


def _generate_reset_token() -> str:
    """32-char hex token for password reset."""
    return secrets.token_hex(32)


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
@limiter.limit(settings.rate_limit_auth)
def register(request: Request, payload: UserCreate, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status.HTTP_409_CONFLICT, "Email already registered")

    verification_code = _generate_code()
    code_expires = datetime.now(UTC) + timedelta(hours=24)

    user = User(
        email=payload.email,
        hashed_password=hash_password(payload.password),
        roastery_name=payload.roastery_name,
        is_admin=bool(settings.admin_email and payload.email == settings.admin_email),
        verification_code=verification_code,
        verification_code_expires=code_expires,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    send_verification_email(user.email, verification_code)

    return user


@router.post("/login", response_model=Token)
@limiter.limit(settings.rate_limit_auth)
def login(request: Request, payload: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()

    # Check account lockout
    if user and user.locked_until and user.locked_until > datetime.now(UTC):
        remaining = int((user.locked_until - datetime.now(UTC)).total_seconds() / 60)
        raise HTTPException(
            status.HTTP_423_LOCKED,
            f"Cuenta bloqueada. Intenta de nuevo en {remaining} min.",
        )

    if not user or not verify_password(payload.password, user.hashed_password):
        # Track failed attempts
        if user:
            user.login_attempts += 1
            if user.login_attempts >= 5:
                user.locked_until = datetime.now(UTC) + timedelta(minutes=15)
                user.login_attempts = 0
            db.commit()
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid credentials")

    # Reset on successful login
    user.login_attempts = 0
    user.locked_until = None
    db.commit()

    return Token(
        access_token=create_access_token(user.id),
        roastery_name=user.roastery_name,
        is_admin=user.is_admin,
    )


# --- Email verification ---

@router.post("/verify-email")
def verify_email(payload: VerifyEmailRequest, db: Session = Depends(get_db)):
    """Verify email with the 6-digit code sent on registration."""
    user = db.query(User).filter(
        User.verification_code == payload.code,
        User.email_verified == False,  # noqa: E712
    ).first()

    if not user:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Código inválido o ya utilizado")

    if user.verification_code_expires and user.verification_code_expires < datetime.now(UTC):
        raise HTTPException(status.HTTP_410_GONE, "El código expiró. Solicita uno nuevo.")

    user.email_verified = True
    user.verification_code = None
    user.verification_code_expires = None
    db.commit()
    return {"message": "Email verificado ✓"}


@router.post("/resend-verification")
@limiter.limit("3/minute")
def resend_verification(request: Request, email: str, db: Session = Depends(get_db)):
    """Resend verification code. In dev mode, returns the code in the response."""
    user = db.query(User).filter(User.email == email, User.email_verified == False).first()  # noqa: E712
    if not user:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Usuario no encontrado o email ya verificado")

    user.verification_code = _generate_code()
    user.verification_code_expires = datetime.now(UTC) + timedelta(hours=24)
    db.commit()

    # TODO: Send via email provider (SendGrid/SES) in production
    if not settings.email_verification_required:
        print(f"[DEV] Verification code for {email}: {user.verification_code}")
    return {"message": "Código reenviado"}


# --- Password reset ---

@router.post("/forgot-password")
@limiter.limit("3/minute")
def forgot_password(request: Request, payload: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """Generate a password reset token. Always returns 200 to prevent email enumeration."""
    user = db.query(User).filter(User.email == payload.email).first()
    if user:
        user.reset_token = _generate_reset_token()
        user.reset_token_expires = datetime.now(UTC) + timedelta(hours=1)
        db.commit()

        reset_url = f"{settings.frontend_url}/reset-password?token={user.reset_token}"
        send_reset_email(user.email, reset_url)

    return {"message": "Si el email existe, recibirás un link para restablecer tu contraseña."}


@router.post("/reset-password")
@limiter.limit("5/minute")
def reset_password(request: Request, payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    """Reset password using token from forgot-password."""
    user = db.query(User).filter(
        User.reset_token == payload.token,
        User.reset_token_expires > datetime.now(UTC),
    ).first()

    if not user:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Token inválido o expirado")

    user.hashed_password = hash_password(payload.new_password)
    user.reset_token = None
    user.reset_token_expires = None
    user.login_attempts = 0
    user.locked_until = None
    db.commit()

    return {"message": "Contraseña actualizada ✓"}
