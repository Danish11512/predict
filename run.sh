#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$REPO_ROOT/backend"
FRONTEND_DIR="$REPO_ROOT/frontend"
BACKEND_VENV="$BACKEND_DIR/.venv"
BACKEND_PORT="${PORT:-8000}"
FRONTEND_PORT="${FRONTEND_PORT:-5173}"
READINESS_TIMEOUT_SEC="${READINESS_TIMEOUT_SEC:-120}"
READINESS_INTERVAL_SEC="${READINESS_INTERVAL_SEC:-1}"
# Where the **browser** reaches **this repo's FastAPI** (not Kalshi). Kalshi's URL is KALSHI_PUBLIC_URL in .env.
export PUBLIC_API_BASE_URL="${PUBLIC_API_BASE_URL:-http://localhost:$BACKEND_PORT}"

if ! [ -f "$REPO_ROOT/.env" ]; then
  echo "Error: Missing $REPO_ROOT/.env. Copy .env.example to .env and fill required values." >&2
  exit 1
fi

if ! command -v python3 >/dev/null 2>&1; then
  echo "Error: python3 is required but was not found." >&2
  exit 1
fi

if ! command -v curl >/dev/null 2>&1; then
  echo "Error: curl is required for backend readiness checks." >&2
  exit 1
fi

if ! command -v bun >/dev/null 2>&1 && ! command -v npm >/dev/null 2>&1; then
  echo "Error: bun or npm is required to run the frontend." >&2
  exit 1
fi

echo "Backend http://localhost:$BACKEND_PORT | Frontend http://localhost:$FRONTEND_PORT"
echo "PUBLIC_API_BASE_URL=$PUBLIC_API_BASE_URL"

if [ ! -d "$BACKEND_VENV" ]; then
  echo "Creating backend virtual environment at backend/.venv..."
  python3 -m venv "$BACKEND_VENV"
fi

BACKEND_PYTHON="$BACKEND_VENV/bin/python"

if [ ! -x "$BACKEND_PYTHON" ]; then
  echo "Error: backend virtual environment is missing python executable." >&2
  exit 1
fi

if ! "$BACKEND_PYTHON" -c "import fastapi, uvicorn, selenium, dotenv" 2>/dev/null; then
  echo "Installing backend Python dependencies into backend/.venv..."
  "$BACKEND_PYTHON" -m pip install -r "$BACKEND_DIR/requirements.txt"
fi

if ! [ -d "$FRONTEND_DIR/node_modules" ] || ! [ -x "$FRONTEND_DIR/node_modules/.bin/vite" ]; then
  echo "Installing frontend dependencies..."
  if command -v bun >/dev/null 2>&1; then
    (cd "$FRONTEND_DIR" && bun install)
  else
    (cd "$FRONTEND_DIR" && npm install)
  fi
fi

cleanup() {
  echo ""
  echo "Shutting down backend and frontend..."
  kill "${BACKEND_PID:-}" "${FRONTEND_PID:-}" 2>/dev/null || true
  sleep 2
  kill -9 "${BACKEND_PID:-}" "${FRONTEND_PID:-}" 2>/dev/null || true
}
trap cleanup INT TERM

(cd "$BACKEND_DIR" && PORT="$BACKEND_PORT" exec "$BACKEND_PYTHON" scripts/serve.py) &
BACKEND_PID=$!

deadline=$(($(date +%s) + READINESS_TIMEOUT_SEC))
while true; do
  if curl -sfS "http://127.0.0.1:${BACKEND_PORT}/live-games" -o /dev/null; then
    echo "Backend is ready."
    break
  fi
  if (( $(date +%s) >= deadline )); then
    echo "Error: Backend did not become ready within ${READINESS_TIMEOUT_SEC}s (GET http://127.0.0.1:${BACKEND_PORT}/live-games failed). Check backend logs above." >&2
    kill "${BACKEND_PID:-}" 2>/dev/null || true
    exit 1
  fi
  sleep "$READINESS_INTERVAL_SEC"
done

(cd "$FRONTEND_DIR" && export PUBLIC_API_BASE_URL && if command -v bun >/dev/null 2>&1; then exec bun run dev -- --host 0.0.0.0 --port "$FRONTEND_PORT"; else exec npm run dev -- --host 0.0.0.0 --port "$FRONTEND_PORT"; fi) &
FRONTEND_PID=$!

wait
