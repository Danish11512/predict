## Learned User Preferences

- Prefers commit-per-step strategy when implementing multi-step features
- Expects runtime verification (actual output) before claiming a fix is done -- never "should work"
- Wants extracted, reusable code: util functions, types, interfaces, constants in dedicated files
- Component acronyms stay uppercase in filenames (e.g., `OTP.svelte` not `Otp.svelte`)
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
- Frontend: SvelteKit in `frontend/`, managed with `bun`; structure is `src/lib/{api,components,constants,interfaces,pages,stores,utils}`
- Kalshi signing: HMAC over `timestamp + METHOD + path` (no query string); REST base and WS URL from env
- Kalshi LIVE detection: `promoted_milestone_id` on event -> `GET /live_data/batch` -> `details.status == "live"` and `widget_status == "live"` means in-play
- Sports classification: series ticker prefix allowlist + category/metadata/title heuristics + multivariate leg checking in `backend/src/backend/kalshi/sports_live.py`; in-play filter via `KALSHI_SPORTS_CALENDAR_LIVE_IN_PLAY_ONLY` (default true, `?in_play_only=false` overrides)
- Calendar LIVE aggregation: milestones + open events + multivariate scored in `calendar_live.py`; sports and in-play filters in `finalize_calendar_live_payload`
- LIVE events pipeline: `live_discovery.py` (paginate milestones -> batch `live_data` -> enrich events), `live_store.py` (in-memory snapshot + background poll), `ws_ticker.py` (WebSocket ticker cache); routes at `/kalshi/live/events` and `/kalshi/live/tickers`
- Dev startup: `run.sh` sources `backend/.env`, exports `APP_ENV`/`BACKEND_PORT`/`FRONTEND_PORT`; frees pinned ports on start and cleanup in dev mode only (`APP_ENV != production`)
- Dev console: HTML dev pages served at `/dev/*` from `backend/src/backend/dev_console.py`; polling endpoints need `Cache-Control: no-store` to prevent stale cached responses
- `backend/src/backend/kalshi/http_client.py` params accept `Mapping | Sequence[tuple]` for repeated query params like `milestone_ids`
- Frontend conventions documented in `docs/frontend-conventions.md`
- LIVE events discovery: `live_discovery.py` paginates milestones → `live_data/batch` → enriches events/multivariate → filters active markets; `live_store.py` holds snapshot with background poll in FastAPI lifespan; `ws_ticker.py` maintains Kalshi WS `ticker` subscriptions
- Rate limits: Kalshi Basic tier is 20 reads/s; backend defaults to 8 reads/s with configurable poll interval
