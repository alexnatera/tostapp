# Tostapp ☕

SaaS para tostadores de café artesanal. Registra tus tuestes, genera etiquetas con QR de trazabilidad y comparte la historia de tu café.

## Stack

- **Backend:** FastAPI + SQLAlchemy + PostgreSQL
- **Frontend:** React 19 + Vite + Tailwind CSS v4 (PWA)
- **Infraestructura:** Docker Compose

## Inicio rápido

```bash
cp .env.example .env
# Edita .env con tus valores

docker compose up --build
```

- App: http://localhost:5173
- API docs: http://localhost:8000/docs

## Estructura

```
tostapp/
├── backend/         # FastAPI
│   └── app/
│       ├── models/  # SQLAlchemy ORM
│       ├── routes/  # Endpoints
│       ├── schemas/ # Pydantic
│       └── core/    # Config, DB, seguridad
├── frontend/        # React PWA
│   └── src/
│       ├── pages/   # Vistas
│       └── lib/     # API client, auth store
└── docker-compose.yml
```

## Flujo MVP

1. Tostador registra un tueste (origen, nivel, notas)
2. Sistema genera slug único y QR
3. Etiqueta QR se descarga → va en la bolsa
4. Cliente escanea → ve la historia del café en `/r/:slug`
