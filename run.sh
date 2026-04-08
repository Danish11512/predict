#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

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
}
trap cleanup INT TERM EXIT

echo "Starting backend (uv run serve) then frontend (bun dev)…" >&2
echo "Press Ctrl+C to stop both." >&2

(cd "$ROOT/backend" && uv run serve) &
sleep 1
(cd "$ROOT/frontend" && bun dev) &

wait
