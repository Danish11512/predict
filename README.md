# Predict

Predict is split into a SvelteKit frontend and a Python backend that scrapes live Kalshi sports markets, exposes the current payload, and streams updates over SSE.

## Repository Layout

- `frontend/` - SvelteKit app built with Bun, TypeScript, and Vite
- `backend/` - FastAPI + Selenium backend
- `plans/docs/` - markdown documentation and architecture notes
- `plans/implementation/` - feature plans that are ready to build
- `run.sh` - canonical full-stack launcher (backend first, readiness wait, then frontend)

## Environment

Local development expects a **repository root** `.env` file. Do not commit `.env`.

1. Copy the template: `cp .env.example .env`
2. Set **Kalshi’s public website URL** with `KALSHI_PUBLIC_URL` (Selenium opens this in Chrome; it is **not** the Predict API). Legacy alias: `BASE_URL` if `KALSHI_PUBLIC_URL` is unset.
3. Set **`KALSHI_EMAIL`** and **`KALSHI_PASSWORD`** for the scraper login on that site.
4. **`PUBLIC_API_BASE_URL`** is the origin of **this repo’s FastAPI server** as seen from the browser (SvelteKit loads it via `frontend/vite.config.ts` `envDir`). It must not point at kalshi.com. Defaults to `http://localhost:8000` when the API listens on `PORT=8000`.
5. **`PORT`** is only the **uvicorn listen port** for the Predict API, not a Kalshi URL.

See `.env.example` for sectioned comments. **`./run.sh`** starts the API first, waits for `GET /live-games`, then starts the frontend with `PUBLIC_API_BASE_URL` aimed at that API.

## How It Works

The backend starts from `backend/scripts/serve.py`, which loads repo-root environment variables and runs the FastAPI app in `backend/src/app.py`.

The main runtime flow is:

1. FastAPI starts a background runner on application startup.
2. The runner creates a Selenium Chrome driver, opens Kalshi, logs in, navigates to the sports category, and polls live market tiles.
3. Each scrape updates an in-memory payload in `backend/src/state.py`.
4. The backend exposes the latest payload at `GET /live-games`.
5. The backend streams live events at `GET /stream` and accepts user responses at `POST /stream/response` when login or verification needs input.

## Backend API

- `GET /live-games` - returns the latest scraped payload, or an empty shell before the first scrape
- `GET /stream` - Server-Sent Events feed for `data`, `request`, `progress`, and `error` events
- `POST /stream/response` - submits a user response for a pending request by `request_id`

## Backend Modules

- `backend/src/app.py` - FastAPI app, SSE stream, request handoff, lifecycle hooks
- `backend/src/runner.py` - orchestrates browser startup, login, navigation, and polling
- `backend/src/auth.py` - login and verification flow
- `backend/src/sports.py` - scrapes live game tiles into structured records
- `backend/src/state.py` - shared payload cache and queue management
- `backend/src/driver.py` - Selenium Chrome driver setup
- `backend/src/config.py` - environment loading and runtime configuration
- `backend/src/utils.py` - timing helpers

## Plans

For a fuller backend architecture map, see [plans/docs/backend-overview.md](plans/docs/backend-overview.md).

## Getting Started

Create `.env` from `.env.example` before the first run (the backend entrypoint exits with a clear error if `.env` is missing).

Full stack (recommended):

```bash
cp .env.example .env
# edit .env — KALSHI_PUBLIC_URL, KALSHI_EMAIL, KALSHI_PASSWORD; PUBLIC_API_BASE_URL if not using defaults
./run.sh
```

Frontend only (you must set `PUBLIC_API_BASE_URL` in `.env` or in the shell so the app can reach the API):

```bash
cd frontend
bun install
bun run dev
```

Backend only:

```bash
cd backend
python3 -m pip install -r requirements.txt
python3 scripts/serve.py
```

## Tooling

- SvelteKit for the frontend app
- Bun for package management and frontend scripts
- TypeScript for the frontend codebase
- FastAPI for the backend API
- Selenium for browser automation and scraping
