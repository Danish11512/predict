#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$REPO_ROOT/backend"
FRONTEND_DIR="$REPO_ROOT/frontend"
BACKEND_VENV="$BACKEND_DIR/.venv"
BACKEND_PORT="${PORT:-8000}"
FRONTEND_PORT="${FRONTEND_PORT:-5173}"

if ! command -v python3 >/dev/null 2>&1; then
  echo "Error: python3 is required but was not found."
  exit 1
fi

if ! command -v bun >/dev/null 2>&1 && ! command -v npm >/dev/null 2>&1; then
  echo "Error: bun or npm is required to run the frontend."
  exit 1
fi

echo "Backend http://localhost:$BACKEND_PORT | Frontend http://localhost:$FRONTEND_PORT"

if [ ! -d "$BACKEND_VENV" ]; then
  echo "Creating backend virtual environment at backend/.venv..."
  python3 -m venv "$BACKEND_VENV"
fi

BACKEND_PYTHON="$BACKEND_VENV/bin/python"

if [ ! -x "$BACKEND_PYTHON" ]; then
  echo "Error: backend virtual environment is missing python executable."
  exit 1
fi

# Python deps: install inside backend virtual environment
if ! "$BACKEND_PYTHON" -c "import fastapi, uvicorn, selenium, dotenv" 2>/dev/null; then
  echo "Installing backend Python dependencies into backend/.venv..."
  "$BACKEND_PYTHON" -m pip install -r "$BACKEND_DIR/requirements.txt"
fi

# Frontend deps: node_modules and vite
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
(cd "$FRONTEND_DIR" && if command -v bun >/dev/null 2>&1; then exec bun run dev -- --host 0.0.0.0 --port "$FRONTEND_PORT"; else exec npm run dev -- --host 0.0.0.0 --port "$FRONTEND_PORT"; fi) &
FRONTEND_PID=$!

wait
