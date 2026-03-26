# Predict

Predict is split into a SvelteKit frontend and a Python backend that scrapes live Kalshi sports markets, exposes the current payload, and streams updates over SSE.

## Repository Layout

- `frontend/` - SvelteKit app built with Bun, TypeScript, and Vite
- `backend/` - FastAPI + Selenium backend
- `plans/docs/` - markdown documentation and architecture notes
- `plans/implementation/` - feature plans that are ready to build
- `run.sh` - convenience launcher for both apps

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

Frontend:

```bash
cd frontend
bun install
bun run dev
```

Backend:

```bash
cd backend
python3 -m pip install -r requirements.txt
python3 scripts/serve.py
```

Or run both with:

```bash
./run.sh
```

## Tooling

- SvelteKit for the frontend app
- Bun for package management and frontend scripts
- TypeScript for the frontend codebase
- FastAPI for the backend API
- Selenium for browser automation and scraping
