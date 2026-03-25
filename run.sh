#!/usr/bin/env bash
set -e
REPO_ROOT="$(cd "$(dirname "$0")" && pwd)"

echo "Backend http://localhost:8000 | Frontend http://localhost:5173"

# Python deps: fastapi + uvicorn
if ! python3 -c "import fastapi, uvicorn" 2>/dev/null; then
  echo "Installing Python dependencies..."
  python3 -m pip install -r "$REPO_ROOT/backend/requirements.txt"
fi

# Frontend deps: node_modules and vite
if ! [ -d "$REPO_ROOT/frontend/node_modules" ] || ! [ -x "$REPO_ROOT/frontend/node_modules/.bin/vite" ]; then
  echo "Installing frontend dependencies..."
  if command -v bun >/dev/null 2>&1; then
    (cd "$REPO_ROOT/frontend" && bun install)
  else
    (cd "$REPO_ROOT/frontend" && npm install)
  fi
fi

cleanup() {
  echo ""
  echo "Shutting down backend and frontend..."
  kill "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true
  sleep 2
  kill -9 "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true
  exit
}
trap cleanup INT TERM

(cd "$REPO_ROOT/backend" && exec python3 scripts/serve.py) &
BACKEND_PID=$!
(cd "$REPO_ROOT/frontend" && if command -v bun >/dev/null 2>&1; then exec bun run dev; else exec npm run dev; fi) &
FRONTEND_PID=$!

wait
