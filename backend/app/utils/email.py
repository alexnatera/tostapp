"""
Email via Resend (https://resend.com).
Free tier: 3,000 emails/month. Set RESEND_API_KEY in .env to enable.
Without the key, emails are printed to console (dev mode).
"""
import urllib.request
import urllib.error
import json

from app.core.config import settings

_RESEND_URL = "https://api.resend.com/emails"


def send_email(to_email: str, subject: str, body_html: str) -> bool:
    if not settings.resend_api_key:
        print(f"\n{'='*60}")
        print(f"[DEV EMAIL] To: {to_email}")
        print(f"[DEV EMAIL] Subject: {subject}")
        print(f"[DEV EMAIL] Body (truncated): {body_html[:200]}")
        print(f"{'='*60}\n")
        return True

    payload = json.dumps({
        "from": settings.email_from,
        "to": [to_email],
        "subject": subject,
        "html": body_html,
    }).encode()

    req = urllib.request.Request(
        _RESEND_URL,
        data=payload,
        headers={
            "Authorization": f"Bearer {settings.resend_api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            return resp.status in (200, 201)
    except Exception as e:
        print(f"[EMAIL ERROR] {to_email}: {e}")
        return False


def send_verification_email(to_email: str, code: str) -> bool:
    return send_email(
        to_email=to_email,
        subject="Verifica tu email — Tostapp",
        body_html=f"""
        <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px">
          <h2 style="color:#92400e">Bienvenido a Tostapp ☕</h2>
          <p>Tu código de verificación es:</p>
          <div style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#1c1917;
                      background:#fef3c7;border-radius:12px;padding:20px;text-align:center">
            {code}
          </div>
          <p style="color:#78716c;font-size:14px">Este código expira en 24 horas.<br>
          Si no creaste esta cuenta, ignora este mensaje.</p>
        </div>""",
    )


def send_reset_email(to_email: str, reset_url: str) -> bool:
    return send_email(
        to_email=to_email,
        subject="Restablece tu contraseña — Tostapp",
        body_html=f"""
        <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px">
          <h2 style="color:#92400e">¿Olvidaste tu contraseña?</h2>
          <p>Haz clic en el botón para restablecerla:</p>
          <a href="{reset_url}"
             style="display:inline-block;background:#92400e;color:white;padding:14px 28px;
                    border-radius:10px;text-decoration:none;font-weight:600">
            Restablecer contraseña
          </a>
          <p style="color:#78716c;font-size:14px;margin-top:24px">
            Este link expira en 1 hora.<br>
            Si no solicitaste esto, ignora el mensaje.
          </p>
        </div>""",
    )
