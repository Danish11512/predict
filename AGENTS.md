## Learned User Preferences

- Use explicit `/execute` subcommands (`run`, `sync`, `check`, etc.) instead of bare `/execute` when driving the consolidated execute flow.
- Keep Svelte route files thin: orchestration and state machine in `frontend/src/routes/+page.svelte`; screen UI, styling, and page-specific logic in `frontend/src/lib/pages/`; reusable UI in `frontend/src/lib/components/`.
- Prefer simple abstraction over a complicated frontend structure; avoid unnecessary indirection.

## Learned Workspace Facts

- Full-stack layout: Python FastAPI backend under `backend/` (entry via `backend/scripts/serve.py`), SvelteKit frontend under `frontend/` (Vite, TypeScript). Repo root `./run.sh` starts the backend first, waits for readiness (e.g. `GET /live-games`), then starts the frontend with `PUBLIC_API_BASE_URL` pointing at this API.
- Frontend tooling is Bun-oriented (`bun install`, `bun run dev`, `bun run check`, `bun run build`) when Bun is available.
- On Python 3.9, PEP 604 union types in annotations can crash at import unless modules use `from __future__ import annotations` (or the runtime is bumped to 3.10+).
- Environment naming: `KALSHI_PUBLIC_URL` is the Kalshi website URL for Selenium; `PUBLIC_API_BASE_URL` is the Predict FastAPI base URL for the frontend (not Kalshi). `BASE_URL` remains a legacy alias for the Kalshi site URL when `KALSHI_PUBLIC_URL` is unset.
- Integration behavior and steps are documented in `plans/implementation/frontend-backend-api-plan.md` (OTP intro, SSE `/stream`, `POST /stream/response`, `GET /live-games`, refresh-safe OTP, loader until SSE `data` for live games after OTP submit).
- Frontend file-placement and extraction conventions are documented in `docs/frontend-conventions.md`; third-party assets and attribution live in `docs/third-party-assets.md`.
