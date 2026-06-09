import ast
import json
import uuid
import unicodedata
import re
from datetime import date, datetime

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.roast import Roast
from app.models.user import User
from app.schemas.roast import RoastOut
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

router = APIRouter(tags=["artisan"])


def _make_slug(origin: str, roast_date: date) -> str:
    normalized = unicodedata.normalize("NFKD", origin).encode("ascii", "ignore").decode("ascii")
    base = re.sub(r"[^a-z0-9]+", "-", normalized.lower()).strip("-") or "roast"
    return f"{base}-{roast_date.strftime('%Y%m%d')}-{uuid.uuid4().hex[:6]}"


def _parse_alog(content: bytes) -> dict:
    """Parse Artisan .alog file — Python dict notation (single quotes), not JSON."""
    text = content.decode("utf-8", errors="replace")
    # Try ast.literal_eval first (handles Python dict notation with single quotes)
    try:
        result = ast.literal_eval(text.strip())
        if isinstance(result, dict):
            return result
    except (ValueError, SyntaxError):
        pass
    # Fallback: some Artisan versions export valid JSON
    try:
        result = json.loads(text)
        if isinstance(result, dict):
            return result
    except json.JSONDecodeError:
        pass
    raise ValueError("No se pudo parsear el archivo .alog")


def _f_to_c(f: float) -> float:
    return round((f - 32) * 5 / 9, 1)


def _parse_roast_date(profile_data: dict) -> date:
    # Prefer ISO date field
    iso = profile_data.get("roastisodate")
    if iso:
        try:
            return datetime.strptime(iso[:10], "%Y-%m-%d").date()
        except (ValueError, TypeError):
            pass
    raw = profile_data.get("roastdate")
    if not raw:
        return date.today()
    for fmt in ("%a %b %d %Y", "%b %d, %Y", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%d", "%d/%m/%Y"):
        try:
            return datetime.strptime(raw.strip(), fmt).date()
        except (ValueError, TypeError):
            pass
    return date.today()


def _detect_roast_level(profile_data: dict, drop_temp_c: float | None) -> str:
    level_raw = profile_data.get("roastlevel") or profile_data.get("roast_level") or ""
    if level_raw:
        level_lower = str(level_raw).lower()
        if "light" in level_lower or "claro" in level_lower or "ligero" in level_lower:
            return "light"
        if "dark" in level_lower or "oscuro" in level_lower:
            return "dark"
        if "medium" in level_lower or "medio" in level_lower:
            return "medium"
    if drop_temp_c is not None:
        if drop_temp_c < 200:
            return "light"
        elif drop_temp_c < 215:
            return "medium"
        else:
            return "dark"
    return "medium"


@router.post("/roasts/import-artisan", response_model=RoastOut, status_code=status.HTTP_201_CREATED)
async def import_artisan(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    content = await file.read()
    try:
        profile_data = _parse_alog(content)
    except ValueError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, str(exc))

    computed = profile_data.get("computed") or {}
    use_fahrenheit = str(profile_data.get("mode", "")).upper() == "F"

    # Weight — real format: weight: [green_g, roasted_g, unit]
    weight = profile_data.get("weight")
    try:
        if isinstance(weight, (list, tuple)) and len(weight) >= 2:
            green_weight_g = int(float(weight[0]))
            roasted_weight_g = int(float(weight[1]))
        else:
            # Fallback to computed fields
            green_raw = computed.get("weightin") or profile_data.get("beanin")
            roasted_raw = computed.get("weightout") or profile_data.get("beanout")
            if green_raw is None or roasted_raw is None:
                raise HTTPException(
                    status.HTTP_422_UNPROCESSABLE_ENTITY,
                    "Faltan los pesos (verde/tostado) en el archivo .alog",
                )
            green_weight_g = int(float(green_raw))
            roasted_weight_g = int(float(roasted_raw))
    except (ValueError, TypeError):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Los valores de peso no son números válidos")

    # Bean origin
    bean_origin = (
        profile_data.get("title")
        or profile_data.get("beans", "").split("\n")[0]
        or "Importado de Artisan"
    )
    bean_origin = str(bean_origin).strip() or "Importado de Artisan"

    # Roast date
    roast_date = _parse_roast_date(profile_data)

    # Temperatures — real format: computed.CHARGE_BT / computed.DROP_BT (in mode units)
    charge_raw = computed.get("CHARGE_BT") or profile_data.get("chargeTemp")
    drop_raw = computed.get("DROP_BT") or profile_data.get("dropTemp")

    def _to_celsius(val) -> int | None:
        if val is None:
            return None
        try:
            f = float(val)
            return int(_f_to_c(f) if use_fahrenheit else f)
        except (ValueError, TypeError):
            return None

    charge_temp = _to_celsius(charge_raw)
    drop_temp = _to_celsius(drop_raw)

    # Roast level (based on drop temp in °C)
    roast_level = _detect_roast_level(profile_data, float(drop_temp) if drop_temp is not None else None)

    # Roast duration — real format: computed.totaltime in seconds
    total_seconds = computed.get("totaltime") or computed.get("DROP_time")
    if total_seconds is not None:
        try:
            roast_time_minutes = round(float(total_seconds) / 60.0, 2)
        except (ValueError, TypeError):
            roast_time_minutes = None
    else:
        roast_time_minutes = None

    # Batch number
    existing = (
        db.query(Roast)
        .filter(Roast.user_id == user.id, Roast.roast_date == roast_date)
        .count()
    )
    batch_number = existing + 1

    for _ in range(3):
        roast = Roast(
            user_id=user.id,
            slug=_make_slug(bean_origin, roast_date),
            batch_number=batch_number,
            bean_origin=bean_origin,
            roast_date=roast_date,
            roast_level=roast_level,
            green_weight_g=green_weight_g,
            roasted_weight_g=roasted_weight_g,
            charge_temp=charge_temp,
            drop_temp=drop_temp,
            roast_time_minutes=roast_time_minutes,
            profile_data=profile_data,
        )
        db.add(roast)
        try:
            db.commit()
            db.refresh(roast)
            return roast
        except IntegrityError:
            db.rollback()

    raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, "No se pudo guardar el tueste — intenta de nuevo")
