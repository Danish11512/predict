# Predict

Fullstack scaffold for integrating with [Kalshi](https://kalshi.com/) using their production REST and WebSocket APIs. The backend holds API credentials and signing keys; the frontend talks to the API only through the Vite dev proxy (`/api` → FastAPI).

**Scope so far:** project layout, env templates, health check, Vite proxy, and **Kalshi-signed** REST helpers plus optional routes (`/kalshi/portfolio/balance`, `/kalshi/markets`, `/kalshi/calendar-live`, `/kalshi/ws/smoke`) when credentials are set. Order placement and streaming UI are not implemented yet.

## Prerequisites

- [Homebrew](https://brew.sh/) on macOS (or [Linuxbrew](https://docs.brew.sh/Homebrew-on-Linux)); then:
  - `brew install bun` — frontend tooling ([other installs](https://bun.sh/docs/installation))
  - `brew install uv` — Python tool runner ([other installs](https://docs.astral.sh/uv/getting-started/installation/))
- Python 3.12+ (installed and managed by uv when you run the backend)

## Kalshi configuration

1. Create API keys in your Kalshi account (production): **Account & security → API Keys** ([API keys guide](https://docs.kalshi.com/getting_started/api_keys)).
2. Copy `backend/.env.example` to `backend/.env`.
3. Set `KALSHI_API_KEY_ID` and `KALSHI_PRIVATE_KEY_PEM` (PEM text; use `\n` for newlines inside the quoted `.env` value).

Production endpoints (defaults in `.env.example`):

- REST base: `https://api.elections.kalshi.com/trade-api/v2` ([authenticated requests](https://docs.kalshi.com/getting_started/quick_start_authenticated_requests))
- WebSocket: `wss://api.elections.kalshi.com/trade-api/ws/v2` ([WebSockets](https://docs.kalshi.com/getting_started/quick_start_websockets))

Documentation index: [https://docs.kalshi.com/llms.txt](https://docs.kalshi.com/llms.txt)

## Run locally

Terminal 1 — API (from repo root):

```bash
cd backend
cp .env.example .env
# edit .env with your Kalshi credentials
uv run serve
```

Terminal 2 — frontend:

```bash
cd frontend
bun install
bun dev
```

Open the URL shown by Vite (default `http://localhost:5173`). The home page calls `GET /api/health` through the proxy.

Optional CORS: if you ever call the API directly from the browser (not via `/api`), set `CORS_ALLOWED_ORIGINS` in `backend/.env` to a comma-separated list of origins.

## Verify

```bash
cd backend && uv run python -c "from backend.app import app; print([r.path for r in app.routes])"
cd frontend && bun run build && bun run lint
```

## Layout

- `backend/` — FastAPI app (`src/backend/`), uv + `pyproject.toml`
- `frontend/` — React + TypeScript + Vite, Bun for install and scripts

Docker and CI are out of scope for this scaffold.
