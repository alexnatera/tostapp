#!/usr/bin/env bash
# Tostapp — one-command production deploy
# Usage: ./deploy.sh
# Requirements: Docker + Docker Compose installed, .env file present.
set -euo pipefail

ENV_FILE=".env"
COMPOSE_FILE="docker-compose.yml"

# ── Preflight checks ────────────────────────────────────────────────────────
if ! command -v docker &>/dev/null; then
  echo "ERROR: docker not found. Install Docker first." >&2
  exit 1
fi

if [ ! -f "$ENV_FILE" ]; then
  echo "ERROR: .env file not found. Copy .env.example and fill in your values:" >&2
  echo "  cp .env.example .env && nano .env" >&2
  exit 1
fi

# Verify required variables are set
required_vars=(POSTGRES_PASSWORD APP_URL APP_DOMAIN SECRET_KEY)
missing=()
for var in "${required_vars[@]}"; do
  value=$(grep -E "^${var}=" "$ENV_FILE" | cut -d= -f2- | tr -d '"' | tr -d "'")
  if [ -z "$value" ] || [[ "$value" == change_me* ]]; then
    missing+=("$var")
  fi
done

if [ ${#missing[@]} -gt 0 ]; then
  echo "ERROR: The following variables are not set in .env:" >&2
  for v in "${missing[@]}"; do echo "  - $v" >&2; done
  exit 1
fi

echo "==> Building and starting Tostapp..."
docker compose -f "$COMPOSE_FILE" pull caddy 2>/dev/null || true
docker compose -f "$COMPOSE_FILE" build --pull
docker compose -f "$COMPOSE_FILE" up -d --remove-orphans

echo ""
echo "==> Waiting for database to be healthy..."
attempts=0
until docker compose exec db pg_isready -U tostapp &>/dev/null; do
  attempts=$((attempts + 1))
  if [ $attempts -ge 30 ]; then
    echo "ERROR: Database did not become healthy in time." >&2
    docker compose logs db | tail -20 >&2
    exit 1
  fi
  sleep 2
done

echo ""
echo "==> Running database migrations..."
docker compose exec backend alembic upgrade head

APP_URL=$(grep -E "^APP_URL=" "$ENV_FILE" | cut -d= -f2- | tr -d '"' | tr -d "'")
echo ""
echo "✓ Tostapp is running at $APP_URL"
echo "  Caddy will provision TLS automatically on first request (may take ~30s)."
echo ""
echo "  Useful commands:"
echo "    docker compose logs -f          — stream all logs"
echo "    docker compose logs -f caddy    — Caddy / TLS logs"
echo "    docker compose down             — stop everything"
