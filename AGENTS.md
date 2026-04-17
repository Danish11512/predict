## Learned User Preferences

- Prefers commit-per-step strategy when implementing multi-step features
- Expects runtime verification (actual output) before claiming a fix is done -- never "should work"
- Wants extracted, reusable code: util functions, types, interfaces, constants in dedicated files
- Component acronyms stay uppercase in filenames (e.g., `OTP.tsx` not `Otp.tsx`)
- Provides HAR files and DOM paths as primary evidence for API behavior and UI fixes
- Wants programmatic image processing (invert, resize) done inline rather than manual asset prep
- Uses `/ralph` pipeline for feature work: plan -> approve -> implement step-by-step
- Clean up all debug artifacts (log files, instrumentation code) after debugging sessions
- Prefers `bun run check` as the frontend gate; `uv run python -c "..."` for backend import smoke tests
- Uses `docs/ai/features/` for feature docs and `.cursor/plans/` for implementation plans
- Prefers no semicolons in JS/TS when optional
- Expects agents to trace end-to-end and find ALL issues, not just the first obvious one

## Learned Workspace Facts

- Backend: Python/FastAPI in `backend/`, managed with `uv`, no pytest/ruff configured; settings are Pydantic with `validation_alias` env vars in `backend/src/backend/settings.py`. Optional dev deps: `uv sync --extra dev` installs `sqlalchemy` + `sqladmin` for `/crud` in the dev console.
- Frontend: Vite + React in `frontend/`, managed with `bun`; React Router 7 Framework Mode (`src/app/`, `react-router.config.ts`, route modules); shadcn/ui + Tailwind v4; register shadcn CSS variables in `@theme inline` (e.g. `--color-background: var(--background)`) so utilities like `bg-background` emit CSS; path aliases per top-level `src/` folder (e.g. `@components`, `@app`, `@typings` for `src/types`); browser `fetch` targets `/api` (Vite proxy to FastAPI)
- Kalshi signing: RSA-PSS over `timestamp + METHOD + path` (no query string); REST base and WS URL from env; parsed key cached via `@lru_cache` on PEM in `signing.py`
- Kalshi LIVE detection: `promoted_milestone_id` on event -> `GET /live_data/batch` -> `details.status == "live"` and `widget_status == "live"` means in-play
- Sports classification: series ticker prefix allowlist + category/metadata/title heuristics + multivariate leg checking in `backend/src/backend/kalshi/sports_live.py`; optional same-calendar-day filter via `KALSHI_SPORTS_LIVE_REQUIRE_TODAY_ET` + `KALSHI_SPORTS_LIVE_TZ`
- Calendar LIVE: `backend/src/backend/kalshi/calendar_live.py` builds sports strip via v1 `card_feed` + aggregation fallback; `finalize_sports_calendar_from_aggregation` for fallback; shaped rows include `series_title` / `series_category` from `GET /series/{ticker}`. HTTP product route: `GET /calendar-live` (short TTL in-process cache to cut duplicate Kalshi fan-out). Pooled `httpx.AsyncClient` instances from FastAPI lifespan in `app.py` (`http_client.set_kalshi_http_clients`).
- FastAPI routes (flat paths, no `/kalshi` prefix): `GET /health`, `GET /portfolio/balance`, `GET /markets`, `GET /calendar-live`, `GET /ws/smoke` (see `routers/kalshi.py`)
- Dev startup: `run.sh` sources `backend/.env`, exports `APP_ENV`/`BACKEND_PORT`/`FRONTEND_PORT`; frees pinned ports on start and cleanup in dev mode only (`APP_ENV != production`)
- Dev console: HTML dev pages from `backend/src/backend/dev_console.py` at `/` (hub), `/dev/*`; calendar table at `/dev/calendar-live`; polling endpoints need `Cache-Control: no-store` to prevent stale cached responses
- `backend/src/backend/kalshi/http_client.py`: `kalshi_get` / `kalshi_v1_get` take `params: dict[str, Any] | None` (passed to httpx; batch milestone IDs use a comma-joined string for `milestone_ids`)
- Calendar-live explorer (`frontend/src/components/explorer/calendar-live/`): markets sorted by `last_price_dollars` descending; primary market label prefers `yes_sub_title` then `title`, with ticker de-emphasized; broader UI conventions in `docs/frontend-conventions.md`
- Rate limits: Kalshi Basic tier is 20 reads/s; backend uses TTL cache on `/calendar-live` responses (see `CALENDAR_LIVE_SPORTS_HTTP_CACHE_TTL_SEC` in `kalshi/constants.py`) plus pooled HTTP clients to reduce connection overhead
