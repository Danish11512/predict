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

- Backend: Python/FastAPI in `backend/`, managed with `uv`, no pytest/ruff configured; settings are Pydantic with `validation_alias` env vars in `backend/src/backend/settings.py`
- Frontend: Vite + React in `frontend/`, managed with `bun`; React Router 7 Framework Mode (`src/app/`, `react-router.config.ts`, route modules); shadcn/ui + Tailwind v4; register shadcn CSS variables in `@theme inline` (e.g. `--color-background: var(--background)`) so utilities like `bg-background` emit CSS; path aliases per top-level `src/` folder (e.g. `@components`, `@app`, `@typings` for `src/types`); browser `fetch` targets `/api` (Vite proxy to FastAPI)
- Kalshi signing: HMAC over `timestamp + METHOD + path` (no query string); REST base and WS URL from env
- Kalshi LIVE detection: `promoted_milestone_id` on event -> `GET /live_data/batch` -> `details.status == "live"` and `widget_status == "live"` means in-play
- Sports classification: series ticker prefix allowlist + category/metadata/title heuristics + multivariate leg checking in `backend/src/backend/kalshi/sports_live.py`; in-play filter via `KALSHI_SPORTS_CALENDAR_LIVE_IN_PLAY_ONLY` (default true, `?in_play_only=false` overrides)
- Calendar LIVE aggregation: milestones + open events + multivariate scored in `calendar_live.py`; sports and in-play filters in `finalize_calendar_live_payload`; shaped event rows include `series_title` and `series_category` from Kalshi `GET /series/{ticker}` when series metadata is available
- LIVE events pipeline and discovery: `live_discovery.py` (paginate milestones → `live_data/batch` → enrich events/multivariate → filter active markets), `live_store.py` (in-memory snapshot + background poll in FastAPI lifespan), `ws_ticker.py` (Kalshi WS `ticker` subscriptions); routes at `/kalshi/live/events` and `/kalshi/live/tickers`
- Dev startup: `run.sh` sources `backend/.env`, exports `APP_ENV`/`BACKEND_PORT`/`FRONTEND_PORT`; frees pinned ports on start and cleanup in dev mode only (`APP_ENV != production`)
- Dev console: HTML dev pages served at `/dev/*` from `backend/src/backend/dev_console.py`; polling endpoints need `Cache-Control: no-store` to prevent stale cached responses
- `backend/src/backend/kalshi/http_client.py` params accept `Mapping | Sequence[tuple]` for repeated query params like `milestone_ids`
- Calendar-live explorer (`frontend/src/components/explorer/calendar-live/`): markets sorted by `last_price_dollars` descending; primary market label prefers `yes_sub_title` then `title`, with ticker de-emphasized; broader UI conventions in `docs/frontend-conventions.md`
- Rate limits: Kalshi Basic tier is 20 reads/s; backend defaults to 8 reads/s with configurable poll interval
