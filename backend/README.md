# Backend

FastAPI service for Kalshi integration. See the repository root `README.md` for setup and run commands.

## Environment

Copy `.env.example` to `.env`. Important variables:

| Variable | Purpose |
|----------|---------|
| `APP_ENV` | `development` (default) enables the dev hub, sqladmin, request log, and OpenAPI browser UIs. `production` disables those and hides `/docs`, `/redoc`, and `/openapi.json`. |
| `BACKEND_PORT` | Port for `uv run serve` (default `8000`). `run.sh` also reads this. |
| `FRONTEND_PORT` | Used by `run.sh` for the Vite dev server (not read by the FastAPI process). |

`run.sh` frees `BACKEND_PORT` and `FRONTEND_PORT` before start and on exit **only when** `APP_ENV` is not `production`.

## HTTP routes

Always available:

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Liveness; includes whether Kalshi credentials are configured. |
| GET | `/kalshi/portfolio/balance` | Proxies signed GET to Kalshi portfolio balance (requires API key + PEM). |
| GET | `/kalshi/markets` | Signed GET to Kalshi `/markets` (optional `limit`, `cursor`, `status`). |
| GET | `/kalshi/ws/smoke` | Opens Kalshi WebSocket with signed headers, subscribes to `ticker`, returns first frame or timeout note. |
| GET | `/kalshi/calendar-live` | Open + multivariate events (nested markets), max 10, calendar-style scoring. |

When `APP_ENV` is **not** `production`:

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Dev hub (links and sections for local tooling). |
| GET | `/docs` | Swagger UI. |
| GET | `/redoc` | ReDoc. |
| GET | `/openapi.json` | OpenAPI schema JSON. |
| * | `/crud/*` | sqladmin (CRUD shell; add SQLAlchemy `ModelView` classes when you introduce models). |
| GET | `/dev/requests` | HTML page that polls recent HTTP requests. |
| GET | `/dev/api/requests` | JSON array of recent requests (newest first). |

Request tracing writes one line per request to stderr on logger `backend.http` (`method=… path=… status=… duration_ms=…`). Polling `GET /dev/api/requests` is excluded from the buffer and from those lines to avoid noise.

When `APP_ENV` is `production`, only `/health` (and any future product routes you add) are intended for use; the table above is not mounted.
