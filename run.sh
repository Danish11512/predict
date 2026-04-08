#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

if [[ -f "$ROOT/backend/.env" ]]; then
  set -a
  # shellcheck source=/dev/null
  . "$ROOT/backend/.env"
  set +a
fi

BACKEND_PORT="${BACKEND_PORT:-8000}"
FRONTEND_PORT="${FRONTEND_PORT:-5173}"
APP_ENV="${APP_ENV:-development}"
export BACKEND_PORT FRONTEND_PORT APP_ENV

app_env_lower="$(printf '%s' "$APP_ENV" | tr '[:upper:]' '[:lower:]')"

free_port() {
  local port=$1
  if ! command -v lsof >/dev/null 2>&1; then
    echo "lsof not found; cannot free port $port. Install lsof or stop the process manually." >&2
    return 0
  fi
  local pids
  pids="$(lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null || true)"
  if [[ -z "$pids" ]]; then
    return 0
  fi
  kill -TERM $pids 2>/dev/null || true
  sleep 0.25
  pids="$(lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null || true)"
  if [[ -n "$pids" ]]; then
    kill -KILL $pids 2>/dev/null || true
  fi
}

free_dev_ports() {
  if [[ "$app_env_lower" == "production" ]]; then
    return 0
  fi
  free_port "$BACKEND_PORT"
  free_port "$FRONTEND_PORT"
}

die_missing_uv() {
  echo "uv not found." >&2
  if command -v brew >/dev/null 2>&1; then
    echo "Install with: brew install uv" >&2
  elif [[ "$(uname -s)" == "Darwin" ]]; then
    echo "On macOS, install Homebrew from https://brew.sh then run: brew install uv" >&2
  else
    echo "With Homebrew: brew install uv" >&2
    echo "Other installs (distro packages, scripts): https://docs.astral.sh/uv/getting-started/installation/" >&2
  fi
  exit 1
}

die_missing_bun() {
  echo "bun not found." >&2
  if command -v brew >/dev/null 2>&1; then
    echo "Install with: brew install bun" >&2
  elif [[ "$(uname -s)" == "Darwin" ]]; then
    echo "On macOS, install Homebrew from https://brew.sh then run: brew install bun" >&2
  else
    echo "With Homebrew: brew install bun" >&2
    echo "Other installs: https://bun.sh/docs/installation" >&2
  fi
  exit 1
}

command -v uv >/dev/null 2>&1 || die_missing_uv
command -v bun >/dev/null 2>&1 || die_missing_bun

if [[ ! -d "$ROOT/frontend/node_modules" ]]; then
  echo "frontend/node_modules missing; run: cd frontend && bun install" >&2
  exit 1
fi

cleanup() {
  for pid in $(jobs -p 2>/dev/null || true); do
    kill "$pid" 2>/dev/null || true
  done
  wait 2>/dev/null || true
  free_dev_ports
}
trap cleanup INT TERM EXIT

free_dev_ports

echo "APP_ENV=$APP_ENV BACKEND_PORT=$BACKEND_PORT FRONTEND_PORT=$FRONTEND_PORT" >&2
echo "Starting backend (uv run serve) then frontend (bun dev)…" >&2
echo "Press Ctrl+C to stop both." >&2

(cd "$ROOT/backend" && uv run serve) &
sleep 1
(cd "$ROOT/frontend" && bun dev) &

wait
