# Tienda Pública — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Crear una página pública de catálogo de productos por tostería — `/tienda/:slug` — completamente personalizable por cada tostador (colores, tipografía, layout, banner, about text), con preview en tiempo real desde el panel.

**Architecture:** Se añaden `roastery_slug`, `whatsapp_number` y `shop_theme` (JSONB) al modelo `User`. El backend sirve el tema junto al catálogo en `GET /tienda/:slug`. En el frontend, `PublicShopPage.tsx` es un thin wrapper sobre `ShopLayout.tsx`, que aplica los colores del tema como CSS inline en el contenedor y soporta 2 layouts (`list`/`grid`). El `ThemeEditor` en `BusinessProfilePage.tsx` muestra un preview en vivo con el mismo `ShopLayout` component renderizado con el tema en borrador.

**Tech Stack:** FastAPI, SQLAlchemy 2, Alembic, React 19, TypeScript, Tailwind v4

---

## File Map

| Archivo | Cambio |
|---------|--------|
| `backend/app/models/user.py` | +2 columnas: `roastery_slug` (unique), `whatsapp_number` |
| `backend/migrations/versions/0011_roastery_shop.py` | Nueva migración — añade columnas y genera slugs para usuarios existentes |
| `backend/app/routes/auth.py` | Auto-generar `roastery_slug` al registrar nuevo usuario |
| `backend/app/routes/shop.py` | NUEVO: `GET /tienda/:roastery_slug` — catálogo público |
| `backend/app/main.py` | Registrar el router `shop` |
| `backend/app/schemas/document.py` | Añadir `roastery_slug` y `whatsapp_number` a `BusinessProfileOut` y `BusinessProfileUpdate` |
| `frontend/src/lib/api.ts` | Añadir `api.public.shop()` + interfaces `ShopPublic`, `ShopProduct` + actualizar `BusinessProfile` |
| `backend/migrations/versions/0012_shop_theme.py` | Nueva migración — columna `shop_theme` JSONB |
| `backend/app/schemas/shop.py` | NUEVO: `ShopTheme` Pydantic schema con validación de colores |
| `frontend/src/components/ShopLayout.tsx` | NUEVO: componente compartido entre tienda pública y preview del editor |
| `frontend/src/pages/PublicShopPage.tsx` | NUEVO: thin wrapper sobre `ShopLayout` — solo fetching |
| `frontend/src/main.tsx` | Añadir ruta `/tienda/:slug` |
| `frontend/src/pages/PublicRoastPage.tsx` | Añadir link "Ver catálogo" si la tostería tiene slug |
| `frontend/src/pages/BusinessProfilePage.tsx` | Añadir campos `roastery_slug`, `whatsapp_number` + `ThemeEditor` con preview en vivo |
| `backend/tests/test_tienda_publica.py` | Tests: slug generation, public endpoint, ShopTheme validation |

---

## Task 1: Migración — añadir roastery_slug y whatsapp_number

**Files:**
- Create: `backend/migrations/versions/0011_roastery_shop.py`

La migración añade las columnas y rellena los slugs de usuarios existentes usando SQL puro (sin extensiones de PostgreSQL como `unaccent`). El slug para usuarios existentes usa la primera parte del ID para garantizar unicidad.

- [ ] **Step 1: Escribir el archivo de migración**

```python
# backend/migrations/versions/0011_roastery_shop.py
"""add roastery_slug and whatsapp_number to users

Revision ID: 0011
Revises: 0010
Create Date: 2026-06-15
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0011"
down_revision: Union[str, None] = "0010"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("roastery_slug", sa.String(100), nullable=True))
    op.add_column("users", sa.Column("whatsapp_number", sa.String(30), nullable=True))

    # Generar slug para usuarios existentes:
    # REGEXP_REPLACE limpia caracteres no alfanuméricos → guiones, + 6 chars del UUID para unicidad
    op.execute("""
        UPDATE users
        SET roastery_slug = LOWER(
            REGEXP_REPLACE(roastery_name, '[^a-zA-Z0-9]+', '-', 'g')
        ) || '-' || SUBSTRING(id::text, 1, 6)
        WHERE roastery_slug IS NULL
    """)

    op.create_unique_constraint("uq_users_roastery_slug", "users", ["roastery_slug"])


def downgrade() -> None:
    op.drop_constraint("uq_users_roastery_slug", "users", type_="unique")
    op.drop_column("users", "whatsapp_number")
    op.drop_column("users", "roastery_slug")
```

- [ ] **Step 2: Aplicar la migración**

```bash
docker compose exec backend alembic upgrade head
```

Resultado esperado:
```
INFO  [alembic.runtime.migration] Running upgrade 0010 -> 0011, add roastery_slug and whatsapp_number to users
```

- [ ] **Step 3: Verificar**

```bash
docker compose exec db psql -U postgres tostapp -c "SELECT email, roastery_slug FROM users LIMIT 5;"
```

Resultado esperado: cada usuario tiene un `roastery_slug` con formato `tostaderia-bonita-a3f7b9`.

---

## Task 2: User model — añadir campos

**Files:**
- Modify: `backend/app/models/user.py`

- [ ] **Step 1: Añadir los 2 campos al modelo**

En `backend/app/models/user.py`, añadir después de `business_country` (última columna de business profile):

```python
roastery_slug: Mapped[str | None] = mapped_column(String(100), unique=True, nullable=True)
whatsapp_number: Mapped[str | None] = mapped_column(String(30), nullable=True)
```

- [ ] **Step 2: Escribir el test**

Crear `backend/tests/test_tienda_publica.py`:

```python
from app.models.user import User


def test_user_has_shop_fields():
    columns = {c.name for c in User.__table__.columns}
    assert "roastery_slug" in columns
    assert "whatsapp_number" in columns


def test_roastery_slug_is_unique():
    slug_col = next(c for c in User.__table__.columns if c.name == "roastery_slug")
    assert slug_col.unique
```

- [ ] **Step 3: Correr tests**

```bash
docker compose exec backend pytest tests/test_tienda_publica.py -v
```

Resultado esperado: todos PASS.

- [ ] **Step 4: Commit**

```bash
git add backend/app/models/user.py \
        backend/migrations/versions/0011_roastery_shop.py \
        backend/tests/test_tienda_publica.py
git commit -m "feat: add roastery_slug and whatsapp_number to User model"
```

---

## Task 3: Auto-generar slug al registrar usuario

**Files:**
- Modify: `backend/app/routes/auth.py`

Al crear un nuevo usuario (POST /auth/register), generar automáticamente el `roastery_slug` desde el nombre de la tostería. Si hay colisión, añadir un sufijo UUID.

- [ ] **Step 1: Añadir la función helper de slug al inicio de auth.py**

Añadir estas importaciones si no están ya presentes:
```python
import re
import unicodedata
import uuid
```

Añadir la función helper (después de los imports, antes del router):

```python
def _make_roastery_slug(name: str) -> str:
    normalized = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode("ascii")
    base = re.sub(r"[^a-z0-9]+", "-", normalized.lower()).strip("-") or "tostadora"
    return f"{base}-{uuid.uuid4().hex[:6]}"
```

- [ ] **Step 2: Usar el helper al crear el usuario**

En el endpoint `POST /auth/register`, localizar la creación del objeto `User`. Añadir `roastery_slug` en la creación:

```python
user = User(
    email=data.email,
    hashed_password=hash_password(data.password),
    roastery_name=data.roastery_name,
    roastery_slug=_make_roastery_slug(data.roastery_name),
    is_beta=True,
    # ... resto de campos igual
)
```

Si el registro tiene un bloque `try/except IntegrityError` para el slug de la tostería (por colisión UUID remota), envolver en bucle igual al patrón de roasts:

```python
for _ in range(3):
    slug = _make_roastery_slug(data.roastery_name)
    user = User(
        email=data.email,
        hashed_password=hash_password(data.password),
        roastery_name=data.roastery_name,
        roastery_slug=slug,
        is_beta=True,
    )
    db.add(user)
    try:
        db.commit()
        db.refresh(user)
        break
    except IntegrityError:
        db.rollback()
else:
    raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, "No se pudo generar slug único")
```

- [ ] **Step 3: Test de generación de slug**

Añadir en `backend/tests/test_tienda_publica.py`:

```python
from app.routes.auth import _make_roastery_slug


def test_make_roastery_slug_basic():
    slug = _make_roastery_slug("El Molino del Sur")
    # Should be lowercase, hyphens, ends in -xxxxxx (6 hex chars)
    assert slug.startswith("el-molino-del-sur-")
    assert len(slug) == len("el-molino-del-sur-") + 6


def test_make_roastery_slug_accents():
    slug = _make_roastery_slug("Café Ñoño")
    # Accents stripped, ñ stripped, spaces become hyphens
    assert "-" in slug
    assert slug == slug.lower()
    assert " " not in slug


def test_make_roastery_slug_empty_name():
    slug = _make_roastery_slug("!@#$%")
    # Falls back to "tostadora" when all chars are stripped
    assert slug.startswith("tostadora-")
```

- [ ] **Step 4: Correr tests**

```bash
docker compose exec backend pytest tests/test_tienda_publica.py -v
```

Resultado esperado: todos PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/app/routes/auth.py backend/tests/test_tienda_publica.py
git commit -m "feat: auto-generate roastery_slug on user registration"
```

---

## Task 4: Endpoint público de catálogo

**Files:**
- Create: `backend/app/routes/shop.py`
- Modify: `backend/app/main.py`

- [ ] **Step 1: Crear `backend/app/routes/shop.py`**

```python
from typing import Optional

from app.core.database import get_db
from app.models.product import Product
from app.models.user import User
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

router = APIRouter(tags=["shop"])


class ShopProduct(BaseModel):
    id: str
    name: str
    description: Optional[str]
    unit: str
    price: float
    stock_quantity: float

    model_config = {"from_attributes": True}


class ShopPublic(BaseModel):
    roastery_name: str
    roastery_slug: str
    business_city: Optional[str]
    business_country: Optional[str]
    business_logo: Optional[str]
    business_website: Optional[str]
    whatsapp_number: Optional[str]
    products: list[ShopProduct]


@router.get("/tienda/{roastery_slug}", response_model=ShopPublic)
def get_shop(roastery_slug: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.roastery_slug == roastery_slug, User.is_active == True).first()  # noqa: E712
    if not user:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Tostería no encontrada")
    products = (
        db.query(Product)
        .filter(Product.user_id == user.id)
        .order_by(Product.name)
        .all()
    )
    return ShopPublic(
        roastery_name=user.roastery_name,
        roastery_slug=user.roastery_slug,
        business_city=user.business_city,
        business_country=user.business_country,
        business_logo=user.business_logo,
        business_website=user.business_website,
        whatsapp_number=user.whatsapp_number,
        products=[ShopProduct.model_validate(p) for p in products],
    )
```

- [ ] **Step 2: Registrar el router en main.py**

Añadir el import de shop al bloque de imports en `backend/app/main.py`:

```python
from app.routes import admin, artisan, auth, customers, documents, finance, inventory, products, purchases, roasts, sales, shop, suppliers
```

Y añadir al final de la lista de `include_router`:

```python
app.include_router(shop.router)
```

- [ ] **Step 3: Test del endpoint público**

Añadir en `backend/tests/test_tienda_publica.py`:

```python
from app.routes.shop import ShopPublic, ShopProduct


def test_shop_public_schema_has_required_fields():
    fields = ShopPublic.model_fields
    assert "roastery_name" in fields
    assert "roastery_slug" in fields
    assert "products" in fields
    assert "whatsapp_number" in fields


def test_shop_product_schema():
    fields = ShopProduct.model_fields
    assert "name" in fields
    assert "price" in fields
    assert "stock_quantity" in fields
    # SKU not exposed publicly
    assert "sku" not in fields
```

- [ ] **Step 4: Correr tests**

```bash
docker compose exec backend pytest tests/test_tienda_publica.py -v
```

Resultado esperado: todos PASS.

- [ ] **Step 5: Verificar endpoint manualmente**

```bash
# Obtener el slug del primer usuario para probar
docker compose exec db psql -U postgres tostapp -c "SELECT roastery_slug FROM users LIMIT 1;"
# Resultado: algo como "mi-tosteria-a3f7b9"

curl http://localhost:8000/tienda/mi-tosteria-a3f7b9
```

Resultado esperado: JSON con `roastery_name`, `products: []` (vacío si no hay productos), etc.

- [ ] **Step 6: Commit**

```bash
git add backend/app/routes/shop.py backend/app/main.py backend/tests/test_tienda_publica.py
git commit -m "feat: add public shop endpoint GET /tienda/:roastery_slug"
```

---

## Task 5: Schemas — añadir roastery_slug y whatsapp_number al perfil

**Files:**
- Modify: `backend/app/schemas/document.py`

Los schemas `BusinessProfileOut` y `BusinessProfileUpdate` están en `document.py` (por convención actual del proyecto). Añadir los nuevos campos.

- [ ] **Step 1: Actualizar BusinessProfileOut**

En `backend/app/schemas/document.py`, localizar `BusinessProfileOut` (línea ~82) y añadir los 2 nuevos campos:

```python
class BusinessProfileOut(BaseModel):
    roastery_name: str
    business_address: Optional[str]
    business_phone: Optional[str]
    business_email: Optional[str]
    business_tax_id: Optional[str]
    business_logo: Optional[str]
    business_website: Optional[str]
    business_city: Optional[str]
    business_country: Optional[str]
    roastery_slug: Optional[str]
    whatsapp_number: Optional[str]

    model_config = {"from_attributes": True}
```

- [ ] **Step 2: Actualizar BusinessProfileUpdate**

Localizar `BusinessProfileUpdate` (línea ~96) y añadir:

```python
class BusinessProfileUpdate(BaseModel):
    roastery_name: Optional[str] = None
    business_address: Optional[str] = None
    business_phone: Optional[str] = None
    business_email: Optional[str] = None
    business_tax_id: Optional[str] = None
    business_logo: Optional[str] = None
    business_website: Optional[str] = None
    business_city: Optional[str] = None
    business_country: Optional[str] = None
    roastery_slug: Optional[str] = None
    whatsapp_number: Optional[str] = None
```

- [ ] **Step 3: Test de schema**

Añadir en `backend/tests/test_tienda_publica.py`:

```python
def test_business_profile_schemas_have_shop_fields():
    from app.schemas.document import BusinessProfileOut, BusinessProfileUpdate
    assert "roastery_slug" in BusinessProfileOut.model_fields
    assert "whatsapp_number" in BusinessProfileOut.model_fields
    assert "roastery_slug" in BusinessProfileUpdate.model_fields
    assert "whatsapp_number" in BusinessProfileUpdate.model_fields
```

- [ ] **Step 4: Correr tests**

```bash
docker compose exec backend pytest tests/test_tienda_publica.py -v
```

Resultado esperado: todos PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/app/schemas/document.py backend/tests/test_tienda_publica.py
git commit -m "feat: expose roastery_slug and whatsapp_number via business profile endpoint"
```

---

## Task 6: Frontend — api.ts

**Files:**
- Modify: `frontend/src/lib/api.ts`

- [ ] **Step 1: Añadir interfaces ShopProduct y ShopPublic**

Al final del archivo `frontend/src/lib/api.ts`, antes del último `export`:

```typescript
export interface ShopProduct {
  id: string;
  name: string;
  description?: string;
  unit: string;
  price: number;
  stock_quantity: number;
}

export interface ShopPublic {
  roastery_name: string;
  roastery_slug: string;
  business_city?: string;
  business_country?: string;
  business_logo?: string;
  business_website?: string;
  whatsapp_number?: string;
  products: ShopProduct[];
}
```

- [ ] **Step 2: Actualizar la interfaz BusinessProfile**

Localizar `interface BusinessProfile` (~línea 329) y añadir los 2 campos nuevos:

```typescript
export interface BusinessProfile {
  roastery_name: string;
  business_address?: string;
  business_phone?: string;
  business_email?: string;
  business_tax_id?: string;
  business_logo?: string;
  business_website?: string;
  business_city?: string;
  business_country?: string;
  roastery_slug?: string;
  whatsapp_number?: string;
}
```

- [ ] **Step 3: Añadir api.public.shop()**

Localizar el objeto `public` dentro de `api` y añadir el método `shop`:

```typescript
public: {
    roast: (slug: string) => req<RoastPublic>(`/r/${slug}`),
    qrUrl: (slug: string) => `${BASE}/r/${slug}/qr.png`,
    shop: (slug: string) => req<ShopPublic>(`/tienda/${slug}`),
  },
```

- [ ] **Step 4: Verificar TypeScript**

```bash
docker compose exec frontend npm run build 2>&1 | tail -10
```

Resultado esperado: sin errores de tipo.

---

## Task 7: Frontend — ShopLayout.tsx + PublicShopPage.tsx

**Files:**
- Create: `frontend/src/components/ShopLayout.tsx`
- Create: `frontend/src/pages/PublicShopPage.tsx`

`ShopLayout` es el componente compartido que renderiza la tienda con el tema aplicado. `PublicShopPage` es un thin wrapper que solo hace el fetch y pasa los datos.

- [ ] **Step 1: Crear ShopLayout.tsx**

```tsx
import { Link } from "react-router-dom";
import { type ShopPublic, type ShopProduct, type ShopTheme } from "../lib/api";

const fmt = (n: number) => `$${Math.round(n).toLocaleString("es-CL")}`;

const DEFAULT_THEME: ShopTheme = {
  primary_color: "#92400e",
  accent_color: "#d97706",
  bg_color: "#fafaf9",
  text_color: "#1c1917",
  font_family: "sans",
  layout: "list",
};

const FONT_CLASS: Record<string, string> = {
  sans: "font-sans",
  serif: "font-serif",
  mono: "font-mono",
};

export default function ShopLayout({ shop }: { shop: ShopPublic }) {
  const theme: ShopTheme = { ...DEFAULT_THEME, ...(shop.theme ?? {}) };

  const whatsappUrl = shop.whatsapp_number
    ? `https://wa.me/${shop.whatsapp_number.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(`Hola, me interesa comprar café de ${shop.roastery_name}`)}`
    : null;

  const inStock = shop.products.filter((p) => p.stock_quantity > 0);
  const outOfStock = shop.products.filter((p) => p.stock_quantity <= 0);

  return (
    <div
      className={`min-h-screen ${FONT_CLASS[theme.font_family] ?? "font-sans"}`}
      style={{ backgroundColor: theme.bg_color, color: theme.text_color }}
    >
      <div className="max-w-lg mx-auto px-4 py-10 space-y-6">

        {theme.banner_image && (
          <div className="w-full h-40 rounded-2xl overflow-hidden">
            <img src={theme.banner_image} alt="Banner" className="w-full h-full object-cover" />
          </div>
        )}

        <div className="text-center space-y-2">
          {shop.business_logo && (
            <div className="w-20 h-20 mx-auto rounded-2xl overflow-hidden border border-black/10 mb-4">
              <img src={shop.business_logo} alt={shop.roastery_name} className="w-full h-full object-contain p-2" />
            </div>
          )}
          <h1 className="text-2xl font-bold">{shop.roastery_name}</h1>
          {(shop.business_city || shop.business_country) && (
            <p className="text-sm opacity-60">
              {[shop.business_city, shop.business_country].filter(Boolean).join(", ")}
            </p>
          )}
          {theme.about_text && (
            <p className="text-sm opacity-75 max-w-sm mx-auto leading-relaxed">{theme.about_text}</p>
          )}
          <div className="flex justify-center gap-4 pt-1">
            {shop.business_website && (
              <a href={shop.business_website} target="_blank" rel="noopener noreferrer"
                className="text-xs hover:underline" style={{ color: theme.accent_color }}>
                {shop.business_website.replace(/^https?:\/\//, "")}
              </a>
            )}
            {theme.instagram_url && (
              <a href={theme.instagram_url} target="_blank" rel="noopener noreferrer"
                className="text-xs hover:underline" style={{ color: theme.accent_color }}>
                Instagram
              </a>
            )}
          </div>
        </div>

        {whatsappUrl && (
          <a href={whatsappUrl} target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full font-semibold rounded-2xl py-3.5 transition-opacity hover:opacity-90 text-sm text-white"
            style={{ backgroundColor: theme.primary_color }}>
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            Pedir por WhatsApp
          </a>
        )}

        {shop.products.length === 0 ? (
          <div className="text-center py-12 rounded-2xl border border-black/10">
            <div className="text-4xl mb-3">☕</div>
            <p className="text-sm opacity-60">Esta tostería aún no ha publicado su catálogo.</p>
          </div>
        ) : (
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider opacity-50 mb-3">Catálogo</h2>
            {theme.layout === "grid" ? (
              <div className="grid grid-cols-2 gap-3">
                {inStock.map((p) => <ProductCard key={p.id} product={p} accentColor={theme.accent_color} grid />)}
                {outOfStock.map((p) => <ProductCard key={p.id} product={p} accentColor={theme.accent_color} grid outOfStock />)}
              </div>
            ) : (
              <div className="space-y-2">
                {inStock.map((p) => <ProductCard key={p.id} product={p} accentColor={theme.accent_color} />)}
                {outOfStock.length > 0 && inStock.length > 0 && (
                  <p className="text-xs opacity-40 pt-2 pb-1">Sin stock actualmente:</p>
                )}
                {outOfStock.map((p) => <ProductCard key={p.id} product={p} accentColor={theme.accent_color} outOfStock />)}
              </div>
            )}
          </div>
        )}

        <div className="rounded-2xl p-5 text-center" style={{ backgroundColor: theme.primary_color }}>
          <p className="text-white/70 text-sm mb-3">¿Eres tostador de café artesanal?</p>
          <Link to="/register"
            className="block w-full bg-white font-semibold rounded-xl py-3 hover:opacity-90 transition-opacity text-sm"
            style={{ color: theme.primary_color }}>
            Crea tu catálogo gratis en Tostapp →
          </Link>
        </div>

        <p className="text-center text-xs opacity-30">Catálogo generado con Tostapp</p>
      </div>
    </div>
  );
}

function ProductCard({
  product: p,
  accentColor,
  grid = false,
  outOfStock = false,
}: {
  product: ShopProduct;
  accentColor: string;
  grid?: boolean;
  outOfStock?: boolean;
}) {
  return (
    <div className={`bg-white/80 rounded-2xl border border-black/10 ${grid ? "p-3" : "p-4 flex gap-3"} ${outOfStock ? "opacity-50" : ""}`}>
      {!grid && (
        <div className="w-10 h-10 rounded-xl bg-black/5 flex items-center justify-center text-lg shrink-0">☕</div>
      )}
      {grid && <div className="text-3xl mb-2 text-center">☕</div>}
      <div className={grid ? "text-center" : "flex-1 min-w-0"}>
        <p className={`font-medium text-sm ${grid ? "mb-1" : ""}`}>{p.name}</p>
        {p.description && !grid && (
          <p className="text-xs opacity-60 mt-0.5 line-clamp-2">{p.description}</p>
        )}
        <div className={`flex items-center gap-3 mt-1.5 ${grid ? "justify-center" : ""}`}>
          <span className="text-sm font-semibold" style={{ color: accentColor }}>
            {fmt(p.price)} / {p.unit}
          </span>
          <span className={`text-xs font-medium ${outOfStock ? "text-red-500" : "text-emerald-600"}`}>
            {outOfStock ? "Sin stock" : "Disponible"}
          </span>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Crear PublicShopPage.tsx (thin wrapper)**

```tsx
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api, type ShopPublic } from "../lib/api";
import ShopLayout from "../components/ShopLayout";

export default function PublicShopPage() {
  const { slug } = useParams<{ slug: string }>();
  const [shop, setShop] = useState<ShopPublic | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (slug) api.public.shop(slug).then(setShop).catch(() => setError(true));
  }, [slug]);

  if (error) return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 flex items-center justify-center p-6">
      <p className="text-stone-500 dark:text-stone-400">Esta tostería no existe o no está disponible.</p>
    </div>
  );
  if (!shop) return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-amber-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return <ShopLayout shop={shop} />;
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/ShopLayout.tsx frontend/src/pages/PublicShopPage.tsx
git commit -m "feat: ShopLayout component + PublicShopPage thin wrapper with theme support"
```

---

## Task 8: Router — añadir ruta /tienda/:slug

**Files:**
- Modify: `frontend/src/main.tsx`

- [ ] **Step 1: Importar y registrar la nueva página**

En `frontend/src/main.tsx`, añadir el import después de los imports existentes de páginas públicas:

```tsx
import PublicShopPage from "./pages/PublicShopPage";
```

Añadir la ruta junto a la ruta pública `/r/:slug`:

```tsx
<Route path="/r/:slug" element={<PublicRoastPage />} />
<Route path="/tienda/:slug" element={<PublicShopPage />} />
```

- [ ] **Step 2: Build de verificación**

```bash
docker compose exec frontend npm run build 2>&1 | tail -10
```

Resultado esperado: build exitoso.

- [ ] **Step 3: Smoke test**

```bash
docker compose exec db psql -U postgres tostapp -c "SELECT roastery_slug FROM users LIMIT 1;"
```

Abrir `http://localhost:5173/tienda/<slug>` en el navegador. Resultado esperado: página de catálogo con nombre de la tostería y colores por defecto (marrón café).

- [ ] **Step 4: Commit**

```bash
git add frontend/src/main.tsx
git commit -m "feat: add /tienda/:slug route for public shop"
```

---

## Task 9: Link desde PublicRoastPage al catálogo

**Files:**
- Modify: `frontend/src/pages/PublicRoastPage.tsx`

El endpoint público de tueste (`/r/:slug`) devuelve `roastery_name` pero no `roastery_slug`. Hay que:
1. Añadir `roastery_slug` a `RoastPublic` en `api.ts`
2. Añadir `roastery_slug` al schema `RoastPublic` en `backend/app/schemas/roast.py`
3. Exponer `roastery_slug` del usuario en el endpoint `public_roast` de `roasts.py`
4. Añadir el link en `PublicRoastPage.tsx`

- [ ] **Step 1: Añadir roastery_slug al schema RoastPublic en backend**

En `backend/app/schemas/roast.py`, localizar la clase `RoastPublic` y añadir:

```python
roastery_slug: str | None = None
```

- [ ] **Step 2: Exponer roastery_slug en el endpoint public_roast**

En `backend/app/routes/roasts.py`, localizar la función `public_roast` (~línea 156) y actualizar el return:

```python
return RoastPublic(
    **{c.name: getattr(roast, c.name) for c in Roast.__table__.columns},
    roastery_name=roast.user.roastery_name,
    roastery_slug=roast.user.roastery_slug,
)
```

- [ ] **Step 3: Añadir roastery_slug a la interfaz RoastPublic en api.ts**

Localizar `export interface RoastPublic` (~línea 374) y añadir:

```typescript
export interface RoastPublic {
  slug: string;
  roastery_name: string;
  roastery_slug?: string;
  bean_origin: string;
  farm?: string;
  variety?: string;
  process?: string;
  roast_date: string;
  roast_level: string;
  tasting_notes?: string;
  roaster_notes?: string;
  batch_number: number;
}
```

- [ ] **Step 4: Añadir el link en PublicRoastPage.tsx**

En `frontend/src/pages/PublicRoastPage.tsx`, añadir el link "Ver catálogo" justo antes del bloque CTA de registro de Tostapp. El bloque CTA de registro empieza con `<div className="bg-amber-800...`. Insertar antes:

```tsx
{roast.roastery_slug && (
  <Link
    to={`/tienda/${roast.roastery_slug}`}
    className="flex items-center justify-center gap-2 w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-200 font-medium rounded-2xl py-3.5 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors text-sm"
  >
    Ver catálogo de {roast.roastery_name} →
  </Link>
)}
```

`Link` ya está importado al inicio de `PublicRoastPage.tsx`.

- [ ] **Step 5: Test de regresión del endpoint de tueste**

```bash
docker compose exec backend pytest tests/ -v
```

Resultado esperado: todos PASS.

- [ ] **Step 6: Smoke test del link**

1. Crear un tueste de prueba
2. Ir a la URL pública del tueste: `http://localhost:5173/r/<slug>`
3. Verificar que aparece el link "Ver catálogo de <Tostería> →"
4. Clicar el link → redirige a `/tienda/<roastery_slug>` con el catálogo

- [ ] **Step 7: Commit**

```bash
git add backend/app/schemas/roast.py \
        backend/app/routes/roasts.py \
        frontend/src/lib/api.ts \
        frontend/src/pages/PublicRoastPage.tsx
git commit -m "feat: link public roast page to shop catalog via roastery_slug"
```

---

## Task 10: Perfil del negocio — campos de tienda

**Files:**
- Modify: `frontend/src/pages/BusinessProfilePage.tsx`

Añadir dos campos al formulario de perfil:
- **URL de tienda / slug** (`roastery_slug`) — con ayuda de texto explicando la URL que generará
- **WhatsApp** (`whatsapp_number`) — número para el botón de pedido

- [ ] **Step 1: Añadir los nuevos campos al formulario**

En `frontend/src/pages/BusinessProfilePage.tsx`, añadir una nueva sección después de la sección "Contacto" (antes del botón submit). Insertar el siguiente bloque:

```tsx
{/* Tienda pública */}
<div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-5 space-y-4">
  <p className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider">Tienda pública</p>
  <Field label="Slug de la tostería (URL de tu catálogo)">
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-stone-400 dark:text-stone-500 pointer-events-none">
        /tienda/
      </span>
      <input
        type="text"
        placeholder="mi-tosteria"
        value={profile.roastery_slug ?? ""}
        onChange={(e) => set("roastery_slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
        className={`${inputCls} pl-16`}
      />
    </div>
    <p className="text-xs text-stone-400 dark:text-stone-500 mt-1">
      Solo letras minúsculas, números y guiones. Ej: <em>el-molino-del-sur</em>
    </p>
  </Field>
  <Field label="Número de WhatsApp (para recibir pedidos)">
    <input
      type="tel"
      placeholder="+56912345678"
      value={profile.whatsapp_number ?? ""}
      onChange={(e) => set("whatsapp_number", e.target.value)}
      className={inputCls}
    />
    <p className="text-xs text-stone-400 dark:text-stone-500 mt-1">
      Incluye el código de país. Ej: +56912345678
    </p>
  </Field>
</div>
```

- [ ] **Step 2: Verificar TypeScript**

```bash
docker compose exec frontend npm run build 2>&1 | tail -10
```

Resultado esperado: sin errores.

- [ ] **Step 3: Smoke test del formulario**

1. Ir a `http://localhost:5173/profile` como usuario autenticado
2. Verificar que aparece la sección "Tienda pública"
3. Llenar `roastery_slug` con `mi-tosteria-test` y `whatsapp_number` con `+56912345678`
4. Clicar "Guardar cambios"
5. Recargar la página — verificar que los valores se mantienen
6. Ir a `http://localhost:5173/tienda/mi-tosteria-test` — verificar que muestra el catálogo

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/BusinessProfilePage.tsx
git commit -m "feat: add roastery_slug and whatsapp_number fields to business profile form"
```

---

## Task 11: Test de regresión final

- [ ] **Step 1: Correr todos los tests**

```bash
docker compose exec backend pytest tests/ -v
```

Resultado esperado: todos los tests PASS — incluyendo `test_csv_export.py`, `test_slug.py`, `test_admin_subscription.py`, `test_tienda_publica.py`.

- [ ] **Step 2: Build frontend**

```bash
docker compose exec frontend npm run build 2>&1 | tail -10
```

Resultado esperado: sin errores.

- [ ] **Step 3: Linting**

```bash
docker compose exec backend ruff check app/
```

Resultado esperado: sin errores.

- [ ] **Step 4: Push**

```bash
git push origin main
```

---

## Task 12: Migración — columna shop_theme JSONB

**Files:**
- Create: `backend/migrations/versions/0012_shop_theme.py`

- [ ] **Step 1: Escribir la migración**

```python
# backend/migrations/versions/0012_shop_theme.py
"""add shop_theme jsonb to users

Revision ID: 0012
Revises: 0011
Create Date: 2026-06-15
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB

revision: str = "0012"
down_revision: Union[str, None] = "0011"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("shop_theme", JSONB, nullable=True))


def downgrade() -> None:
    op.drop_column("users", "shop_theme")
```

- [ ] **Step 2: Aplicar la migración**

```bash
docker compose exec backend alembic upgrade head
```

Resultado esperado:
```
INFO  [alembic.runtime.migration] Running upgrade 0011 -> 0012, add shop_theme jsonb to users
```

- [ ] **Step 3: Añadir shop_theme al modelo User**

En `backend/app/models/user.py`, importar JSONB si no está ya:

```python
from sqlalchemy.dialects.postgresql import JSONB
```

Añadir la columna después de `whatsapp_number`:

```python
shop_theme: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
```

- [ ] **Step 4: Test**

Añadir en `backend/tests/test_tienda_publica.py`:

```python
def test_user_has_shop_theme():
    columns = {c.name for c in User.__table__.columns}
    assert "shop_theme" in columns
```

```bash
docker compose exec backend pytest tests/test_tienda_publica.py::test_user_has_shop_theme -v
```

Resultado esperado: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/migrations/versions/0012_shop_theme.py backend/app/models/user.py backend/tests/test_tienda_publica.py
git commit -m "feat: add shop_theme JSONB column to users"
```

---

## Task 13: Backend — ShopTheme schema + actualizar endpoint tienda

**Files:**
- Create: `backend/app/schemas/shop.py`
- Modify: `backend/app/routes/shop.py`

- [ ] **Step 1: Crear backend/app/schemas/shop.py**

```python
# backend/app/schemas/shop.py
import re
from typing import Literal, Optional

from pydantic import BaseModel, field_validator


HEX_RE = re.compile(r"^#[0-9a-fA-F]{6}$")


class ShopTheme(BaseModel):
    primary_color: str = "#92400e"
    accent_color: str = "#d97706"
    bg_color: str = "#fafaf9"
    text_color: str = "#1c1917"
    font_family: Literal["sans", "serif", "mono"] = "sans"
    layout: Literal["list", "grid"] = "list"
    about_text: Optional[str] = None
    banner_image: Optional[str] = None
    instagram_url: Optional[str] = None
    facebook_url: Optional[str] = None

    @field_validator("primary_color", "accent_color", "bg_color", "text_color")
    @classmethod
    def must_be_hex(cls, v: str) -> str:
        if not HEX_RE.match(v):
            raise ValueError(f"'{v}' is not a valid hex color (#rrggbb)")
        return v

    @field_validator("about_text")
    @classmethod
    def max_500_chars(cls, v: Optional[str]) -> Optional[str]:
        if v and len(v) > 500:
            raise ValueError("about_text must be 500 characters or fewer")
        return v

    model_config = {"extra": "ignore"}
```

- [ ] **Step 2: Actualizar ShopPublic en routes/shop.py para incluir theme**

En `backend/app/routes/shop.py`:

1. Añadir import de `ShopTheme`:
```python
from app.schemas.shop import ShopTheme
```

2. Añadir campo `theme` a `ShopPublic`:
```python
class ShopPublic(BaseModel):
    roastery_name: str
    roastery_slug: str
    business_city: Optional[str]
    business_country: Optional[str]
    business_logo: Optional[str]
    business_website: Optional[str]
    whatsapp_number: Optional[str]
    theme: ShopTheme
    products: list[ShopProduct]
```

3. Actualizar el return de `get_shop` para incluir el tema:
```python
theme = ShopTheme(**(user.shop_theme or {}))
return ShopPublic(
    roastery_name=user.roastery_name,
    roastery_slug=user.roastery_slug,
    business_city=user.business_city,
    business_country=user.business_country,
    business_logo=user.business_logo,
    business_website=user.business_website,
    whatsapp_number=user.whatsapp_number,
    theme=theme,
    products=[ShopProduct.model_validate(p) for p in products],
)
```

- [ ] **Step 3: Tests del schema**

Añadir en `backend/tests/test_tienda_publica.py`:

```python
def test_shop_theme_defaults():
    from app.schemas.shop import ShopTheme
    t = ShopTheme()
    assert t.primary_color == "#92400e"
    assert t.layout == "list"
    assert t.font_family == "sans"


def test_shop_theme_hex_validation():
    from app.schemas.shop import ShopTheme
    import pytest
    from pydantic import ValidationError
    with pytest.raises(ValidationError):
        ShopTheme(primary_color="red")      # no hex
    with pytest.raises(ValidationError):
        ShopTheme(primary_color="#gggggg")  # invalid hex chars


def test_shop_theme_about_text_max():
    from app.schemas.shop import ShopTheme
    import pytest
    from pydantic import ValidationError
    with pytest.raises(ValidationError):
        ShopTheme(about_text="x" * 501)


def test_shop_theme_partial_override():
    from app.schemas.shop import ShopTheme
    t = ShopTheme(primary_color="#ff0000")
    assert t.primary_color == "#ff0000"
    assert t.accent_color == "#d97706"  # default intact


def test_shop_public_has_theme():
    from app.routes.shop import ShopPublic
    assert "theme" in ShopPublic.model_fields
```

- [ ] **Step 4: Correr tests**

```bash
docker compose exec backend pytest tests/test_tienda_publica.py -v
```

Resultado esperado: todos PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/app/schemas/shop.py backend/app/routes/shop.py backend/tests/test_tienda_publica.py
git commit -m "feat: ShopTheme Pydantic schema with hex validation + expose theme in shop endpoint"
```

---

## Task 14: Frontend — interfaces ShopTheme + actualizar api.ts

**Files:**
- Modify: `frontend/src/lib/api.ts`

- [ ] **Step 1: Añadir interfaz ShopTheme**

En `frontend/src/lib/api.ts`, añadir junto a `ShopPublic` y `ShopProduct`:

```typescript
export interface ShopTheme {
  primary_color: string;
  accent_color: string;
  bg_color: string;
  text_color: string;
  font_family: "sans" | "serif" | "mono";
  layout: "list" | "grid";
  about_text?: string;
  banner_image?: string;
  instagram_url?: string;
  facebook_url?: string;
}
```

- [ ] **Step 2: Actualizar ShopPublic para incluir theme**

Localizar `export interface ShopPublic` y añadir el campo:

```typescript
export interface ShopPublic {
  roastery_name: string;
  roastery_slug: string;
  business_city?: string;
  business_country?: string;
  business_logo?: string;
  business_website?: string;
  whatsapp_number?: string;
  theme: ShopTheme;
  products: ShopProduct[];
}
```

- [ ] **Step 3: Añadir shop_theme a BusinessProfile**

Localizar `export interface BusinessProfile` y añadir:

```typescript
export interface BusinessProfile {
  roastery_name: string;
  business_address?: string;
  business_phone?: string;
  business_email?: string;
  business_tax_id?: string;
  business_logo?: string;
  business_website?: string;
  business_city?: string;
  business_country?: string;
  roastery_slug?: string;
  whatsapp_number?: string;
  shop_theme?: ShopTheme;
}
```

- [ ] **Step 4: Añadir shop_theme a BusinessProfileUpdate del backend**

En `backend/app/schemas/document.py`, añadir import de ShopTheme:

```python
from app.schemas.shop import ShopTheme
```

Añadir el campo a `BusinessProfileUpdate`:

```python
class BusinessProfileUpdate(BaseModel):
    # ... campos existentes ...
    shop_theme: Optional[ShopTheme] = None
```

Y a `BusinessProfileOut`:

```python
class BusinessProfileOut(BaseModel):
    # ... campos existentes ...
    shop_theme: Optional[dict] = None
```

- [ ] **Step 5: Verificar TypeScript**

```bash
docker compose exec frontend npm run build 2>&1 | tail -10
```

Resultado esperado: sin errores.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/lib/api.ts backend/app/schemas/document.py
git commit -m "feat: add ShopTheme TypeScript interface + shop_theme to BusinessProfile API"
```

---

## Task 15: Frontend — ThemeEditor en BusinessProfilePage

**Files:**
- Modify: `frontend/src/pages/BusinessProfilePage.tsx`

El ThemeEditor tiene dos partes: (1) controles de edición (color pickers, selector de layout, about text), y (2) preview en vivo via `<ShopLayout>` escalado al 45%.

- [ ] **Step 1: Añadir state local para draftTheme**

Al inicio de `BusinessProfilePage.tsx`, después de los imports existentes añadir:

```tsx
import ShopLayout from "../components/ShopLayout";
import { type ShopTheme } from "../lib/api";
```

Dentro del componente, añadir state del tema borrador:

```tsx
const [draftTheme, setDraftTheme] = useState<ShopTheme>({
  primary_color: "#92400e",
  accent_color: "#d97706",
  bg_color: "#fafaf9",
  text_color: "#1c1917",
  font_family: "sans",
  layout: "list",
  ...(profile.shop_theme ?? {}),
});

const setTheme = <K extends keyof ShopTheme>(key: K, value: ShopTheme[K]) =>
  setDraftTheme((t) => ({ ...t, [key]: value }));
```

Inicializar cuando el perfil carga (en el `useEffect` que hace el fetch):

```tsx
useEffect(() => {
  api.profile.get().then((p) => {
    setProfile(p);
    setDraftTheme({ ...DEFAULT_THEME, ...(p.shop_theme ?? {}) });
  });
}, []);
```

Donde `DEFAULT_THEME` es la misma constante que en ShopLayout:

```tsx
const DEFAULT_THEME: ShopTheme = {
  primary_color: "#92400e",
  accent_color: "#d97706",
  bg_color: "#fafaf9",
  text_color: "#1c1917",
  font_family: "sans",
  layout: "list",
};
```

- [ ] **Step 2: Incluir draftTheme en el submit**

En la función `handleSubmit`, añadir `shop_theme: draftTheme` al objeto enviado:

```tsx
await api.profile.update({ ...profile, shop_theme: draftTheme });
```

- [ ] **Step 3: Añadir la sección ThemeEditor al formulario**

Después de la sección "Tienda pública" (slug + whatsapp), añadir una nueva sección con los controles:

```tsx
{/* Tema de la tienda */}
<div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-5 space-y-5">
  <p className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider">
    Apariencia de tu tienda
  </p>

  {/* Colores */}
  <div className="grid grid-cols-2 gap-4">
    {(["primary_color", "accent_color", "bg_color", "text_color"] as const).map((key) => (
      <label key={key} className="flex flex-col gap-1">
        <span className="text-xs text-stone-500 dark:text-stone-400">
          {{ primary_color: "Color principal", accent_color: "Color de acento", bg_color: "Fondo", text_color: "Texto" }[key]}
        </span>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={draftTheme[key]}
            onChange={(e) => setTheme(key, e.target.value)}
            className="w-8 h-8 rounded cursor-pointer border border-stone-300 dark:border-stone-600"
          />
          <span className="text-xs font-mono text-stone-500">{draftTheme[key]}</span>
        </div>
      </label>
    ))}
  </div>

  {/* Paletas preset para café */}
  <div>
    <p className="text-xs text-stone-400 dark:text-stone-500 mb-2">Paletas rápidas:</p>
    <div className="flex gap-2 flex-wrap">
      {[
        { name: "Café clásico", primary_color: "#92400e", accent_color: "#d97706", bg_color: "#fafaf9", text_color: "#1c1917" },
        { name: "Oscuro elegante", primary_color: "#d97706", accent_color: "#fbbf24", bg_color: "#1c1917", text_color: "#fafaf9" },
        { name: "Verde naturaleza", primary_color: "#166534", accent_color: "#22c55e", bg_color: "#f0fdf4", text_color: "#14532d" },
        { name: "Slate moderno", primary_color: "#1e293b", accent_color: "#3b82f6", bg_color: "#f8fafc", text_color: "#0f172a" },
        { name: "Terracota", primary_color: "#9a3412", accent_color: "#ea580c", bg_color: "#fff7ed", text_color: "#431407" },
        { name: "Lavanda suave", primary_color: "#6d28d9", accent_color: "#a78bfa", bg_color: "#faf5ff", text_color: "#2e1065" },
      ].map((preset) => (
        <button
          key={preset.name}
          type="button"
          onClick={() => setDraftTheme((t) => ({ ...t, ...preset }))}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 text-xs hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
          style={{ borderLeftColor: preset.primary_color, borderLeftWidth: 3 }}
        >
          {preset.name}
        </button>
      ))}
    </div>
  </div>

  {/* Tipografía */}
  <div className="flex gap-3">
    {(["sans", "serif", "mono"] as const).map((f) => (
      <button
        key={f}
        type="button"
        onClick={() => setTheme("font_family", f)}
        className={`flex-1 py-2 rounded-xl border text-sm transition-colors ${
          draftTheme.font_family === f
            ? "border-amber-600 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 font-medium"
            : "border-stone-200 dark:border-stone-700 text-stone-500 dark:text-stone-400"
        }`}
      >
        {{ sans: "Sans-serif", serif: "Serif", mono: "Monoespaciada" }[f]}
      </button>
    ))}
  </div>

  {/* Layout */}
  <div className="flex gap-3">
    {(["list", "grid"] as const).map((l) => (
      <button
        key={l}
        type="button"
        onClick={() => setTheme("layout", l)}
        className={`flex-1 py-2 rounded-xl border text-sm transition-colors ${
          draftTheme.layout === l
            ? "border-amber-600 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 font-medium"
            : "border-stone-200 dark:border-stone-700 text-stone-500 dark:text-stone-400"
        }`}
      >
        {{ list: "Lista vertical", grid: "Cuadrícula" }[l]}
      </button>
    ))}
  </div>

  {/* About text */}
  <Field label="Texto sobre la tostería (máx. 500 caracteres)">
    <textarea
      rows={3}
      placeholder="Somos una tostería artesanal fundada en..."
      value={draftTheme.about_text ?? ""}
      onChange={(e) => setTheme("about_text", e.target.value.slice(0, 500))}
      className={`${inputCls} resize-none`}
    />
    <p className="text-xs text-stone-400 dark:text-stone-500 mt-1 text-right">
      {(draftTheme.about_text ?? "").length}/500
    </p>
  </Field>

  {/* Instagram */}
  <Field label="URL de Instagram (opcional)">
    <input
      type="url"
      placeholder="https://instagram.com/mi_tosteria"
      value={draftTheme.instagram_url ?? ""}
      onChange={(e) => setTheme("instagram_url", e.target.value)}
      className={inputCls}
    />
  </Field>
</div>
```

- [ ] **Step 4: Añadir el preview en vivo**

Después del bloque del ThemeEditor y antes del botón "Guardar cambios", añadir el preview escalado. Hay que construir un `ShopPublic` de prueba con el `draftTheme`:

```tsx
{/* Preview en vivo */}
<div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-5">
  <p className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-3">
    Vista previa de tu tienda
  </p>
  <div className="relative w-full overflow-hidden rounded-xl border border-stone-200 dark:border-stone-700" style={{ height: "380px" }}>
    <div style={{ transform: "scale(0.45)", transformOrigin: "top left", width: "222%", pointerEvents: "none" }}>
      <ShopLayout
        shop={{
          roastery_name: profile.roastery_name || "Mi Tostería",
          roastery_slug: profile.roastery_slug ?? "mi-tosteria",
          business_city: profile.business_city ?? undefined,
          business_country: profile.business_country ?? undefined,
          business_logo: profile.business_logo ?? undefined,
          business_website: profile.business_website ?? undefined,
          whatsapp_number: profile.whatsapp_number ?? undefined,
          theme: draftTheme,
          products: [],
        }}
      />
    </div>
  </div>
  <p className="text-xs text-stone-400 dark:text-stone-500 mt-2 text-center">
    Vista previa a escala — así se verá tu catálogo en <code>/tienda/{profile.roastery_slug ?? "tu-slug"}</code>
  </p>
</div>
```

- [ ] **Step 5: Verificar TypeScript**

```bash
docker compose exec frontend npm run build 2>&1 | tail -10
```

Resultado esperado: sin errores de tipo.

- [ ] **Step 6: Smoke test del ThemeEditor**

1. Ir a `http://localhost:5173/profile` como usuario autenticado
2. Hacer scroll hasta la sección "Apariencia de tu tienda"
3. Cambiar un color con el color picker → el preview debajo cambia en tiempo real
4. Seleccionar una paleta preset → preview se actualiza con todos los colores
5. Cambiar tipografía a "Serif" → preview cambia font
6. Cambiar layout a "Cuadrícula" → preview no cambia (sin productos) pero layout selector se activa
7. Escribir texto en "Sobre la tostería" → aparece en el preview
8. Guardar cambios
9. Ir a `/tienda/<slug>` → verificar que los colores guardados se aplican

- [ ] **Step 7: Commit**

```bash
git add frontend/src/pages/BusinessProfilePage.tsx
git commit -m "feat: ThemeEditor with live preview in BusinessProfilePage"
```

---

## Task 16: Test de regresión final (con theming)

- [ ] **Step 1: Correr todos los tests**

```bash
docker compose exec backend pytest tests/ -v
```

Resultado esperado: todos PASS — incluyendo `test_tienda_publica.py` con tests de `ShopTheme`.

- [ ] **Step 2: Build frontend**

```bash
docker compose exec frontend npm run build 2>&1 | tail -10
```

Resultado esperado: sin errores.

- [ ] **Step 3: Linting backend**

```bash
docker compose exec backend ruff check app/
```

Resultado esperado: sin errores.

- [ ] **Step 4: Push**

```bash
git push origin main
```

---

## Flujo de usuario completo (verificación end-to-end)

```
1.  Tostador registra cuenta → roastery_slug auto-generado (ej: la-pausa-cafe-a3f7b9)
2.  Tostador va a /profile → configura slug legible + número WhatsApp
3.  Tostador personaliza tema → elige paleta, tipografía, layout, texto "sobre nosotros"
4.  Preview en tiempo real muestra cómo quedará la tienda
5.  Tostador guarda → colores/tema persisten en shop_theme JSONB
6.  Tostador va a /products → añade productos con precio y stock
7.  Cliente escanea QR de bolsa → ve /r/:slug (página de tueste)
8.  Cliente ve link "Ver catálogo de [Tostería] →"
9.  Cliente va a /tienda/:slug → ve catálogo con colores y layout personalizados
10. Cliente toca botón WhatsApp (con color del tema) → abre chat con mensaje pre-llenado
11. Tostador recibe pedido por WhatsApp → gestiona venta offline
```
