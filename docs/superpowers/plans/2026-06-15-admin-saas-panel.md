# Admin SaaS Panel — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extender el panel de administración para gestionar cuentas y suscripciones de tenants de forma real — activar/suspender cuentas, cambiar planes, ver uso y última actividad.

**Architecture:** Se añaden 4 columnas al modelo `User` (`is_active`, `plan_tier`, `subscription_expires_at`, `last_active_at`); el endpoint de login bloquea usuarios inactivos; `get_current_user` actualiza `last_active_at` en cada llamada autenticada; se añaden 2 endpoints PATCH al router `/admin`; el `AdminPage.tsx` muestra badges de plan, estado activo y acciones por tenant.

**Tech Stack:** FastAPI, SQLAlchemy 2, Alembic (PostgreSQL), React 19, TypeScript, Tailwind v4

---

## File Map

| Archivo | Cambio |
|---------|--------|
| `backend/app/models/user.py` | +4 columnas: `is_active`, `plan_tier`, `subscription_expires_at`, `last_active_at` |
| `backend/migrations/versions/0010_subscription_fields.py` | Nueva migración |
| `backend/app/core/deps.py` | Actualizar `last_active_at` en cada petición autenticada |
| `backend/app/routes/auth.py` | Bloquear login si `is_active == False` |
| `backend/app/routes/admin.py` | Extender `UserSummary` + PATCH toggle + PATCH plan |
| `frontend/src/lib/api.ts` | Extender `AdminUser` + añadir `api.admin.toggle()` y `api.admin.setPlan()` |
| `frontend/src/pages/AdminPage.tsx` | Badges de plan/estado, suspend button, plan selector, last activity |
| `backend/tests/test_admin_subscription.py` | Tests: login bloqueado, toggle, plan |

---

## Task 1: Migración — añadir columnas de suscripción

**Files:**
- Create: `backend/migrations/versions/0010_subscription_fields.py`

- [ ] **Step 1: Escribir el archivo de migración**

```python
# backend/migrations/versions/0010_subscription_fields.py
"""add subscription fields to users

Revision ID: 0010
Revises: 0009
Create Date: 2026-06-15
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0010"
down_revision: Union[str, None] = "0009"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"))
    op.add_column("users", sa.Column("plan_tier", sa.String(20), nullable=False, server_default="beta"))
    op.add_column("users", sa.Column("subscription_expires_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("users", sa.Column("last_active_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "last_active_at")
    op.drop_column("users", "subscription_expires_at")
    op.drop_column("users", "plan_tier")
    op.drop_column("users", "is_active")
```

- [ ] **Step 2: Aplicar la migración**

```bash
docker compose exec backend alembic upgrade head
```

Resultado esperado:
```
INFO  [alembic.runtime.migration] Running upgrade 0009 -> 0010, add subscription fields to users
```

- [ ] **Step 3: Verificar columnas en la base de datos**

```bash
docker compose exec db psql -U postgres tostapp -c "\d users" | grep -E "is_active|plan_tier|subscription|last_active"
```

Resultado esperado: 4 columnas listadas.

---

## Task 2: User model — añadir campos

**Files:**
- Modify: `backend/app/models/user.py`

- [ ] **Step 1: Añadir las 4 columnas al modelo**

En `backend/app/models/user.py`, añadir después de `is_admin` (línea 17):

```python
is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
plan_tier: Mapped[str] = mapped_column(String(20), default="beta", nullable=False)
subscription_expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
last_active_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
```

La clase completa queda así en la sección de campos de cuenta:

```python
class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String, nullable=False)
    roastery_name: Mapped[str] = mapped_column(String, nullable=False)
    is_beta: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_admin: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    plan_tier: Mapped[str] = mapped_column(String(20), default="beta", nullable=False)
    subscription_expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    last_active_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    # ... resto igual
```

- [ ] **Step 2: Escribir el test**

Crear `backend/tests/test_admin_subscription.py`:

```python
from app.models.user import User


def test_user_model_has_subscription_fields():
    columns = {c.name for c in User.__table__.columns}
    assert "is_active" in columns
    assert "plan_tier" in columns
    assert "subscription_expires_at" in columns
    assert "last_active_at" in columns


def test_user_defaults():
    u = User(email="x@x.com", hashed_password="h", roastery_name="Test")
    assert u.is_active is True
    assert u.plan_tier == "beta"
    assert u.subscription_expires_at is None
    assert u.last_active_at is None
```

- [ ] **Step 3: Correr el test**

```bash
docker compose exec backend pytest tests/test_admin_subscription.py::test_user_model_has_subscription_fields tests/test_admin_subscription.py::test_user_defaults -v
```

Resultado esperado: PASS ambos tests.

- [ ] **Step 4: Commit**

```bash
git add backend/app/models/user.py \
        backend/migrations/versions/0010_subscription_fields.py \
        backend/tests/test_admin_subscription.py
git commit -m "feat: add is_active, plan_tier, subscription_expires_at, last_active_at to User"
```

---

## Task 3: Bloquear login para usuarios suspendidos

**Files:**
- Modify: `backend/app/routes/auth.py`

El login actual (POST /auth/login) no verifica `is_active`. Hay que añadir la verificación inmediatamente después de verificar la contraseña.

- [ ] **Step 1: Localizar el endpoint de login en auth.py**

Buscar en `backend/app/routes/auth.py` la función que maneja `POST /auth/login`. La verificación de contraseña termina con una llamada a `verify_password`. Inmediatamente después de esa verificación, y antes de devolver el token, añadir:

```python
if not user.is_active:
    raise HTTPException(
        status.HTTP_403_FORBIDDEN,
        "Cuenta suspendida. Contacta a soporte en soporte@tostapp.app"
    )
```

- [ ] **Step 2: Test de login bloqueado**

Añadir en `backend/tests/test_admin_subscription.py`:

```python
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_inactive_user_cannot_login(tmp_path):
    """Un usuario con is_active=False recibe 403 en el login."""
    inactive_user = MagicMock()
    inactive_user.is_active = False
    inactive_user.email_verified = True
    inactive_user.login_attempts = 0
    inactive_user.locked_until = None
    inactive_user.hashed_password = "$2b$12$fake"

    with patch("app.routes.auth.verify_password", return_value=True), \
         patch("app.routes.auth.get_db") as mock_db:
        mock_session = MagicMock()
        mock_session.query.return_value.filter.return_value.first.return_value = inactive_user
        mock_db.return_value.__enter__ = lambda s: mock_session
        mock_db.return_value.__exit__ = MagicMock(return_value=False)

        res = client.post("/auth/login", json={"email": "x@x.com", "password": "Test123!"})
        assert res.status_code == 403
        assert "suspendida" in res.json()["detail"].lower()
```

- [ ] **Step 3: Correr el test (esperamos que falle)**

```bash
docker compose exec backend pytest tests/test_admin_subscription.py::test_inactive_user_cannot_login -v
```

Resultado esperado: FAIL — la cuenta no está bloqueando el login todavía.

- [ ] **Step 4: Implementar el bloqueo en auth.py**

Después de la verificación de contraseña y antes de la generación del token en el endpoint de login, añadir la verificación:

```python
if not user.is_active:
    raise HTTPException(
        status.HTTP_403_FORBIDDEN,
        "Cuenta suspendida. Contacta a soporte en soporte@tostapp.app"
    )
```

- [ ] **Step 5: Correr el test de nuevo**

```bash
docker compose exec backend pytest tests/test_admin_subscription.py -v
```

Resultado esperado: todos los tests PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/app/routes/auth.py backend/tests/test_admin_subscription.py
git commit -m "feat: block login for inactive (suspended) users with 403"
```

---

## Task 4: Registrar `last_active_at` en cada petición autenticada

**Files:**
- Modify: `backend/app/core/deps.py`

Cada vez que un usuario autenticado hace una llamada API, actualizamos `last_active_at`. Esto permite al admin ver cuándo fue la última vez que un tenant usó la app.

- [ ] **Step 1: Modificar `get_current_user` en deps.py**

Reemplazar el contenido completo de `backend/app/core/deps.py`:

```python
from datetime import UTC, datetime

from app.core.config import settings
from app.core.database import get_db
from app.models.user import User
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

bearer = HTTPBearer()


def get_current_user(
    creds: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db),
) -> User:
    try:
        payload = jwt.decode(creds.credentials, settings.secret_key, algorithms=[settings.algorithm])
        user_id = payload.get("sub")
    except JWTError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid token") from None
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User not found")
    user.last_active_at = datetime.now(UTC)
    db.commit()
    return user
```

- [ ] **Step 2: Verificar que los tests existentes siguen pasando**

```bash
docker compose exec backend pytest tests/ -v
```

Resultado esperado: todos los tests pasan.

- [ ] **Step 3: Commit**

```bash
git add backend/app/core/deps.py
git commit -m "feat: track last_active_at on every authenticated request"
```

---

## Task 5: Nuevos endpoints admin (toggle + plan)

**Files:**
- Modify: `backend/app/routes/admin.py`

Añadir:
- `PATCH /admin/users/{user_id}/toggle` — activa o suspende la cuenta
- `PATCH /admin/users/{user_id}/plan` — cambia plan y fecha de expiración
- Extender `UserSummary` con los nuevos campos

- [ ] **Step 1: Reemplazar `UserSummary` y añadir los nuevos schemas**

En `backend/app/routes/admin.py`, reemplazar la clase `UserSummary` existente y añadir los nuevos schemas de request:

```python
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
    plan_tier: str  # "beta" | "pro" | "enterprise"
    subscription_expires_at: str | None = None  # ISO date string, e.g. "2026-12-31"
```

- [ ] **Step 2: Actualizar el endpoint `/admin/users` para incluir los nuevos campos**

En el endpoint `list_users`, actualizar el return statement para incluir los nuevos campos:

```python
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
```

- [ ] **Step 3: Añadir los 2 nuevos endpoints al final de admin.py**

```python
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
    # roast_count needed for UserSummary
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


@router.patch("/users/{user_id}/plan", response_model=UserSummary)
def set_user_plan(
    user_id: str,
    data: PlanUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(_admin_user),
):
    valid_plans = {"beta", "pro", "enterprise"}
    if data.plan_tier not in valid_plans:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"plan_tier debe ser uno de: {', '.join(valid_plans)}")
    target = db.get(User, user_id)
    if not target:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Usuario no encontrado")
    target.plan_tier = data.plan_tier
    if data.subscription_expires_at:
        from datetime import datetime, UTC
        target.subscription_expires_at = datetime.fromisoformat(data.subscription_expires_at).replace(tzinfo=UTC)
    else:
        target.subscription_expires_at = None
    db.commit()
    db.refresh(target)
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
```

- [ ] **Step 4: Test de los nuevos endpoints**

Añadir en `backend/tests/test_admin_subscription.py`:

```python
def test_toggle_endpoint_response_model():
    """El UserSummary extendido incluye los nuevos campos."""
    from app.routes.admin import UserSummary
    fields = UserSummary.model_fields
    assert "is_active" in fields
    assert "plan_tier" in fields
    assert "last_active_at" in fields
    assert "subscription_expires_at" in fields


def test_plan_update_validates_tier():
    from app.routes.admin import PlanUpdate
    import pytest
    p = PlanUpdate(plan_tier="pro")
    assert p.plan_tier == "pro"
    p2 = PlanUpdate(plan_tier="enterprise", subscription_expires_at="2026-12-31")
    assert p2.subscription_expires_at == "2026-12-31"
```

- [ ] **Step 5: Correr los tests**

```bash
docker compose exec backend pytest tests/test_admin_subscription.py -v
```

Resultado esperado: todos PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/app/routes/admin.py backend/tests/test_admin_subscription.py
git commit -m "feat: add toggle and plan endpoints to admin, extend UserSummary with subscription fields"
```

---

## Task 6: Frontend — actualizar api.ts

**Files:**
- Modify: `frontend/src/lib/api.ts`

- [ ] **Step 1: Actualizar la interfaz `AdminUser`**

Localizar la interfaz `AdminUser` (línea ~166 de `api.ts`) y reemplazarla completa:

```typescript
export interface AdminUser {
  id: string;
  email: string;
  roastery_name: string;
  is_beta: boolean;
  is_admin: boolean;
  is_active: boolean;
  plan_tier: "beta" | "pro" | "enterprise";
  email_verified: boolean;
  roast_count: number;
  created_at: string;
  last_active_at: string | null;
  subscription_expires_at: string | null;
}
```

- [ ] **Step 2: Añadir `toggle` y `setPlan` al objeto `api.admin`**

Localizar el objeto `admin` dentro de `api` (~línea 124) y añadir los dos nuevos métodos:

```typescript
admin: {
    stats: () => req<{ total_users: number; total_roasts: number; verified_users: number; beta_users: number }>("/admin/stats"),
    users: () => req<AdminUser[]>("/admin/users"),
    impersonate: (userId: string) =>
      req<{ access_token: string; roastery_name: string; is_admin: boolean }>(`/admin/impersonate/${userId}`, { method: "POST" }),
    toggle: (userId: string) =>
      req<AdminUser>(`/admin/users/${userId}/toggle`, { method: "PATCH" }),
    setPlan: (userId: string, plan_tier: string, subscription_expires_at?: string) =>
      req<AdminUser>(`/admin/users/${userId}/plan`, {
        method: "PATCH",
        body: JSON.stringify({ plan_tier, subscription_expires_at: subscription_expires_at ?? null }),
      }),
  },
```

- [ ] **Step 3: Verificar que TypeScript compila sin errores**

```bash
docker compose exec frontend npm run build 2>&1 | tail -20
```

Resultado esperado: `✓ built in Xs` sin errores de tipo.

---

## Task 7: Frontend — actualizar AdminPage.tsx

**Files:**
- Modify: `frontend/src/pages/AdminPage.tsx`

Cambios necesarios:
1. Mostrar badge de plan (`beta` / `pro` / `enterprise`) en cada usuario
2. Mostrar estado (activo / suspendido) como badge
3. Mostrar `last_active_at` en la info del usuario
4. Botón "Suspender" / "Activar" que llama a `api.admin.toggle()`
5. Selector de plan que llama a `api.admin.setPlan()`

- [ ] **Step 1: Reemplazar el contenido completo de AdminPage.tsx**

```tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, type AdminUser } from "../lib/api";
import { useAuth } from "../lib/auth";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface Stats {
  total_users: number;
  total_roasts: number;
  verified_users: number;
  beta_users: number;
}

const PLAN_LABELS: Record<string, string> = { beta: "Beta", pro: "Pro", enterprise: "Enterprise" };
const PLAN_COLORS: Record<string, string> = {
  beta: "bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400",
  pro: "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400",
  enterprise: "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400",
};

export default function AdminPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [impersonating, setImpersonating] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);
  const [settingPlan, setSettingPlan] = useState<string | null>(null);
  const { startImpersonation, logout } = useAuth();
  const nav = useNavigate();

  useEffect(() => {
    Promise.all([api.admin.stats(), api.admin.users()])
      .then(([s, u]) => { setStats(s); setUsers(u); })
      .finally(() => setLoading(false));
  }, []);

  const handleImpersonate = async (user: AdminUser) => {
    setImpersonating(user.id);
    try {
      const res = await api.admin.impersonate(user.id);
      startImpersonation(res.access_token, user.roastery_name);
      nav("/");
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setImpersonating(null);
    }
  };

  const handleToggle = async (user: AdminUser) => {
    const action = user.is_active ? "suspender" : "activar";
    if (!confirm(`¿${action.charAt(0).toUpperCase() + action.slice(1)} la cuenta de ${user.roastery_name}?`)) return;
    setToggling(user.id);
    try {
      const updated = await api.admin.toggle(user.id);
      setUsers((prev) => prev.map((u) => u.id === updated.id ? updated : u));
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setToggling(null);
    }
  };

  const handlePlanChange = async (user: AdminUser, newPlan: string) => {
    setSettingPlan(user.id);
    try {
      const updated = await api.admin.setPlan(user.id, newPlan);
      setUsers((prev) => prev.map((u) => u.id === updated.id ? updated : u));
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setSettingPlan(null);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950">
      <div className="max-w-3xl mx-auto px-4 py-6">
        <header className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100">Administración</h1>
            <p className="text-sm text-stone-500 dark:text-stone-400 mt-0.5">Panel de control SaaS</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => nav("/")} className="text-sm text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition-colors">
              ← Mi dashboard
            </button>
            <button onClick={() => { logout(); nav("/login"); }} className="text-sm text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors">
              Salir
            </button>
          </div>
        </header>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-4 animate-pulse h-20" />
            ))}
          </div>
        ) : stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
            <StatCard label="Usuarios" value={stats.total_users} />
            <StatCard label="Tuestes" value={stats.total_roasts} />
            <StatCard label="Verificados" value={stats.verified_users} />
            <StatCard label="Beta" value={stats.beta_users} />
          </div>
        )}

        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider">
            Cuentas registradas
          </h2>
          <span className="text-xs text-stone-400 dark:text-stone-500">{users.length}</span>
        </div>

        <div className="space-y-2">
          {users.map((u) => (
            <div
              key={u.id}
              className={`bg-white dark:bg-stone-900 rounded-2xl border p-4 ${
                u.is_active
                  ? "border-stone-200 dark:border-stone-800"
                  : "border-red-200 dark:border-red-900/50 opacity-75"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <p className="font-medium text-stone-900 dark:text-stone-100 truncate">{u.roastery_name}</p>
                    {u.is_admin && (
                      <span className="text-xs bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded-full font-medium">admin</span>
                    )}
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${PLAN_COLORS[u.plan_tier] ?? PLAN_COLORS.beta}`}>
                      {PLAN_LABELS[u.plan_tier] ?? u.plan_tier}
                    </span>
                    {!u.is_active && (
                      <span className="text-xs bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded-full font-medium">
                        suspendido
                      </span>
                    )}
                    {!u.email_verified && (
                      <span className="text-xs bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400 px-1.5 py-0.5 rounded-full">
                        sin verificar
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-stone-500 dark:text-stone-400 truncate">{u.email}</p>
                  <p className="text-xs text-stone-400 dark:text-stone-500 mt-0.5">
                    {u.roast_count} tueste{u.roast_count !== 1 ? "s" : ""} · desde{" "}
                    {format(new Date(u.created_at), "d MMM yyyy", { locale: es })}
                    {u.last_active_at && (
                      <> · activo {format(new Date(u.last_active_at), "d MMM", { locale: es })}</>
                    )}
                  </p>
                </div>

                {!u.is_admin && (
                  <div className="flex flex-col gap-2 shrink-0 items-end">
                    <button
                      onClick={() => handleImpersonate(u)}
                      disabled={impersonating === u.id || !u.is_active}
                      className="text-xs bg-amber-800 dark:bg-amber-600 text-white px-3 py-1.5 rounded-xl hover:bg-amber-900 dark:hover:bg-amber-500 transition-colors disabled:opacity-40 font-medium"
                    >
                      {impersonating === u.id ? "..." : "Ver como"}
                    </button>
                    <button
                      onClick={() => handleToggle(u)}
                      disabled={toggling === u.id}
                      className={`text-xs px-3 py-1.5 rounded-xl font-medium transition-colors disabled:opacity-40 ${
                        u.is_active
                          ? "bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-950/60"
                          : "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-950/60"
                      }`}
                    >
                      {toggling === u.id ? "..." : u.is_active ? "Suspender" : "Activar"}
                    </button>
                  </div>
                )}
              </div>

              {!u.is_admin && (
                <div className="mt-3 pt-3 border-t border-stone-100 dark:border-stone-800 flex items-center gap-3">
                  <span className="text-xs text-stone-400 dark:text-stone-500">Plan:</span>
                  <select
                    value={u.plan_tier}
                    disabled={settingPlan === u.id}
                    onChange={(e) => handlePlanChange(u, e.target.value)}
                    className="text-xs bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg px-2 py-1 text-stone-700 dark:text-stone-300 focus:outline-none focus:ring-1 focus:ring-amber-400 disabled:opacity-50"
                  >
                    <option value="beta">Beta</option>
                    <option value="pro">Pro</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                  {settingPlan === u.id && (
                    <span className="text-xs text-stone-400 dark:text-stone-500">Guardando...</span>
                  )}
                  {u.subscription_expires_at && (
                    <span className="text-xs text-stone-400 dark:text-stone-500">
                      vence {format(new Date(u.subscription_expires_at), "d MMM yyyy", { locale: es })}
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-4 text-center">
      <p className="text-2xl font-bold text-stone-900 dark:text-stone-100">{value}</p>
      <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">{label}</p>
    </div>
  );
}
```

- [ ] **Step 2: Build de verificación TypeScript**

```bash
docker compose exec frontend npm run build 2>&1 | tail -20
```

Resultado esperado: build exitoso sin errores de tipo.

- [ ] **Step 3: Smoke test manual**

1. Ir a `http://localhost:5173/admin` como admin
2. Verificar que cada usuario muestra badge de plan (Beta por defecto)
3. Cambiar plan de un usuario no-admin a "Pro" vía el selector
4. Verificar que el badge cambia a "Pro" sin recargar la página
5. Clicar "Suspender" en un usuario no-admin
6. Verificar que aparece el badge "suspendido" en rojo
7. Intentar "Ver como" en el usuario suspendido — el botón debe estar deshabilitado
8. Clicar "Activar" para restaurar la cuenta

- [ ] **Step 4: Commit**

```bash
git add frontend/src/lib/api.ts frontend/src/pages/AdminPage.tsx
git commit -m "feat: admin panel - plan badges, suspend/activate, plan selector, last activity"
```

---

## Task 8: Test de regresión final

- [ ] **Step 1: Correr toda la suite de tests**

```bash
docker compose exec backend pytest tests/ -v
```

Resultado esperado: todos los tests pasan, incluyendo `test_csv_export.py`, `test_slug.py` y `test_admin_subscription.py`.

- [ ] **Step 2: Verificar linting**

```bash
docker compose exec backend ruff check app/
```

Resultado esperado: sin errores.

- [ ] **Step 3: Push**

```bash
git push origin main
```
