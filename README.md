# Tostapp ☕

SaaS para tostadores de café artesanal. Registra tus tuestes, genera etiquetas con QR de trazabilidad y comparte la historia de tu café con tus clientes.

**Problema:** Los micro-tostadores (10–500 bolsas/semana) no tienen sistema consistente para registrar tuestes — usan papel, Excel, o nada. Cropster cuesta $100–300/mes y está diseñado para operaciones grandes.

**Solución:** Flujo mobile-first en <60 segundos: registra → genera QR → pega en la bolsa → cliente escanea y ve la historia del café.

## Stack

| Capa | Tecnología |
|---|---|
| Backend | FastAPI + SQLAlchemy 2 + Alembic + PostgreSQL |
| Frontend | React 19 + Vite + Tailwind v4 (PWA) |
| Auth | JWT (python-jose + passlib bcrypt) |
| QR | qrcode[pil] — generado server-side, PNG |
| Infra | Docker Compose (db + backend + frontend) |

## Inicio rápido

```bash
cp .env.example .env
# Editar .env con tus valores (ver sección Variables de entorno)

docker compose up --build
```

- App: http://localhost:5173
- API docs: http://localhost:8000/docs
- DB admin: conéctate a `localhost:5432` con las credenciales del .env

## Variables de entorno

```env
POSTGRES_PASSWORD=tu_password_seguro
SECRET_KEY=clave_jwt_minimo_32_chars
FRONTEND_URL=http://localhost:5173
VITE_API_URL=http://localhost:8000
```

## Estructura

```
tostapp/
├── backend/
│   ├── app/
│   │   ├── core/       # config, database, security
│   │   ├── models/     # SQLAlchemy ORM (User, Roast)
│   │   ├── routes/     # auth, roasts (CRUD + export + QR)
│   │   └── schemas/    # Pydantic (RoastCreate, RoastOut, RoastPublic)
│   ├── migrations/     # Alembic — env.py + versions/
│   ├── tests/          # pytest (slug, CSV)
│   ├── alembic.ini
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── lib/        # api.ts (typed client), auth.ts (Zustand)
│       └── pages/      # Dashboard, NewRoast, RoastDetail, PublicRoast, Login, Register
├── nginx/
└── docker-compose.yml
```

## Flujo MVP

```
Tostador registra →  /roasts/new (3 campos + detalles opcionales)
       ↓
Sistema genera slug único + QR PNG
       ↓
/roasts/:id — descarga QR → pega en bolsa
       ↓
Cliente escanea → /r/:slug — historia del café + CTA Tostapp
```

## Endpoints principales

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| POST | `/auth/register` | — | Registro tostador |
| POST | `/auth/login` | — | Login → JWT |
| GET | `/roasts` | JWT | Listar mis tuestes |
| POST | `/roasts` | JWT | Crear tueste + generar slug/QR |
| GET | `/roasts/{id}` | JWT | Detalle de tueste |
| DELETE | `/roasts/{id}` | JWT | Eliminar tueste |
| GET | `/roasts/export` | JWT | Exportar CSV (utf-8 + BOM para Excel) |
| GET | `/r/{slug}` | — | Página pública del tueste |
| GET | `/r/{slug}/qr.png` | — | QR PNG (Cache-Control: 24h) |

## Tests

```bash
cd backend
pip install -r requirements.txt
pytest tests/ -v
```

Cobertura actual: slug generation (4 casos), CSV format (3 casos).

---

## Estado del proyecto — jun 2026

### Completado ✅

| Componente | Estado |
|---|---|
| Auth JWT (registro + login) | ✅ |
| Modelo Roast (13 campos + is_beta) | ✅ |
| CRUD tuestes + validación Pydantic | ✅ |
| QR PNG server-side + cache header | ✅ |
| Página pública `/r/:slug` | ✅ |
| Formulario 3 campos primarios + colapsable | ✅ |
| Labels en español (Claro/Medio/Oscuro) | ✅ |
| Sticky submit button en 375px | ✅ |
| Migraciones Alembic (reemplaza create_all) | ✅ |
| CHECK constraint roast_level en DB | ✅ |
| Exportación CSV (utf-8 BOM, Excel-compatible) | ✅ |
| Estados loading/error/success en UI | ✅ |
| Toast "¡Copiado!" en clipboard | ✅ |
| CTA tostadores en página pública | ✅ |
| Historia del tostador antes del grid de datos | ✅ |
| Auth: fuente única (Zustand persist) | ✅ |
| Tests unitarios slug + CSV | ✅ |

### Pendiente — próxima sesión 🔜

| Tarea | Prioridad | Notas |
|---|---|---|
| **Deploy en VPS** | CRÍTICO | Sin esto no hay beta. Docker Compose + nginx + SSL |
| Campo `shop_url` en Roast | Alto | Link "Comprar café →" en página pública → integra con cualquier tienda |
| Campos `total_bags` / `bags_sold` | Alto | Muestra stock en página pública ("Quedan 14 bolsas") |
| Analytics pixel en `/r/:slug` | Medio | Medir cuántos QRs se escanean desde día 1 |
| Olvidé mi contraseña | Medio | Manual para beta de 10 usuarios, pero se necesita antes de escalar |

### Backlog / post-beta 📋

| Feature | Por qué esperar |
|---|---|
| Integración Shopify (push producto al crear tueste) | Requiere OAuth por cliente — complejidad alta, post-PMF |
| Stripe / billing | Beta gratuita 90 días; Stripe entra al cerrar beta |
| Subdominios por tostadora (`mitienda.tostapp.com`) | Feature de tier pagado, cero URLs existentes se rompen al agregar |
| JWT revocation (token_version) | Riesgo bajo en beta de 10 usuarios de confianza |
| Multi-usuario / equipos | Fuera de scope MVP |
| Curvas de tueste / análisis avanzado | Fuera de scope MVP |

---

## Decisiones de arquitectura

- **Alembic en vez de `create_all`:** Las migraciones corren antes de uvicorn en el Dockerfile (`alembic upgrade head && uvicorn ...`). Nunca más schema drift silencioso.
- **Slug collision:** `_make_slug` reintenta hasta 3 veces capturando `IntegrityError` — nunca expone errores de DB al cliente.
- **Token storage:** Zustand `persist` es la única fuente de verdad. `api.ts` lee desde `tostapp-auth` JSON — no hay doble escritura a localStorage.
- **Ruta CSV antes de `/{id}`:** FastAPI evalúa rutas en orden de registro. `/roasts/export` se registra explícitamente antes de `/roasts/{roast_id}` para evitar que "export" sea interpretado como un ID.
- **`shop_url` y stock:** Pendiente — se agrega cuando el deploy esté listo para no acumular migraciones sin DB real.

## Modelo de negocio

- **Beta:** 90 días gratuita, acceso completo. `is_beta: bool` en User para gestión de acceso.
- **Post-beta:** Suscripción mensual por volumen de etiquetas QR generadas.
- **Canal de adquisición primario:** El QR en la bolsa → consumidor escanea → ve historia del café → CTA "¿Eres tostador? Crea tu cuenta gratis" → registro.
- **KPI estrella:** Primer tueste completado en <60 segundos en 375px.
- **KPI retención:** ≥60% de beta users loguean ≥5 tuestes en los primeros 30 días.
