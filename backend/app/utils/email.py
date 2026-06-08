"""
Email utility for Tostapp.
Pluggable: uses SMTP settings from config, or prints to console in dev mode.
Swap this out for SendGrid/SES/Resend when you need production delivery.
"""
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.core.config import settings


def send_email(to_email: str, subject: str, body_html: str) -> bool:
    """
    Send an email. Returns True if sent (or logged in dev), False on failure.
    In dev mode without SMTP configured, prints to console instead.
    """
    if not settings.smtp_host:
        # Dev mode: print to console
        print(f"\n{'='*60}")
        print(f"[DEV EMAIL] To: {to_email}")
        print(f"[DEV EMAIL] Subject: {subject}")
        print(f"[DEV EMAIL] Body: {body_html}")
        print(f"{'='*60}\n")
        return True

    try:
        msg = MIMEMultipart("alternative")
        msg["From"] = settings.smtp_user
        msg["To"] = to_email
        msg["Subject"] = subject
        msg.attach(MIMEText(body_html, "html"))

        with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
            server.starttls()
            server.login(settings.smtp_user, settings.smtp_password)
            server.sendmail(settings.smtp_user, to_email, msg.as_string())
        return True
    except Exception as e:
        print(f"[EMAIL ERROR] Failed to send to {to_email}: {e}")
        return False


def send_verification_email(to_email: str, code: str) -> bool:
    """Send the 6-digit verification code."""
    return send_email(
        to_email=to_email,
        subject="Verifica tu email — Tostapp",
        body_html=f"""
        <h2>Bienvenido a Tostapp ☕</h2>
        <p>Tu código de verificación es:</p>
        <h1 style="font-size:32px;letter-spacing:4px;">{code}</h1>
        <p>Este código expira en 24 horas.</p>
        <p>Si no creaste esta cuenta, ignora este mensaje.</p>
        """,
    )


def send_reset_email(to_email: str, reset_url: str) -> bool:
    """Send the password reset link."""
    return send_email(
        to_email=to_email,
        subject="Restablece tu contraseña — Tostapp",
        body_html=f"""
        <h2>¿Olvidaste tu contraseña?</h2>
        <p>Haz clic en el botón para restablecerla:</p>
        <a href="{reset_url}" style="display:inline-block;background:#92400e;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;">
            Restablecer contraseña
        </a>
        <p>Este link expira en 1 hora.</p>
        <p>Si no solicitaste esto, ignora el mensaje.</p>
        """,
    )
