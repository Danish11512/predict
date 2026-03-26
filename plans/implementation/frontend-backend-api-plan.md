# Frontend / Backend API Connection Plan

## Goal
Map the existing backend APIs onto a three-screen frontend flow so the Svelte app knows when to show the OTP intro, the loading state, and the home screen that renders live game data.

## Scope

In scope:
- `backend/src/app.py` - API and SSE contract consumed by the frontend
- `backend/src/state.py` - event shapes that drive OTP, progress, error, and data states
- `backend/src/auth.py` - source of the OTP/verification request event
- `backend/src/sports.py` - source of the live games payload used by the home screen
- `frontend/src/routes/+page.svelte` - entry screen that will become the screen state controller
- `frontend/src/routes/+layout.svelte` - shared app shell and global styles import
- `frontend/src/lib/*` - client helpers, stores, and types for API consumption
- `frontend/src/app.css` - styling for the three screens

Out of scope:
- Adding new backend endpoints
- Replacing SSE with WebSockets or polling-only architecture
- Persisting auth/session state beyond the current in-memory backend flow
- Changing the backend login or scraping behavior unless a response shape needs a compatibility fix

## API Plan

### 1. `GET /stream`
Primary realtime channel for the app.

What it connects to in the frontend:
- The screen-state controller on app load
- The OTP intro screen
- The loader screen
- The home screen for live updates

How it should connect:
- Open one SSE connection as soon as the app mounts.
- Parse event types and update a shared frontend store.
- Treat this stream as the source of truth for login prompts, progress, backend errors, and live data refreshes.

Event-to-UI mapping:
- `request` -> show the OTP intro screen and bind the prompt, `request_id`, and optional `field` name.
- `progress` -> switch or remain on the loader screen and update the progress indicator.
- `data` -> hydrate the home screen with the latest payload and continue listening for updates.
- `error` -> show an error state or retry prompt on top of the current screen.

### 2. `POST /stream/response`
User input submission for a pending backend request.

What it connects to in the frontend:
- The OTP input on the intro screen

How it should connect:
- Send `{ request_id, value }` when the user submits a code.
- Keep the SSE connection open after submission so the app can receive `progress` and `data` events.
- If the backend returns `404`, treat the request as stale and prompt the user to wait for a new request or reconnect.

UI behavior:
- Disable the submit button while the request is in flight.
- On success, move from the intro screen to the loader screen.
- On failure, keep the OTP screen visible and show the error inline.

### 3. `GET /live-games`
Snapshot endpoint for bootstrapping and recovery.

What it connects to in the frontend:
- The home screen as the initial data source
- The loader screen as a fallback when the SSE stream has not yet produced data

How it should connect:
- Fetch once after the SSE connection is established.
- Use the response to render the home screen immediately if data already exists.
- Re-fetch on reconnect or manual retry so the home screen can recover from a dropped stream without waiting for the next SSE `data` event.

Response contract the frontend should expect:
- `updated_utc`: ISO timestamp or `null`
- `games`: array of live game records, possibly empty

## Flow Analysis

### Screen 1 - Intro / OTP
1. The app loads and opens the SSE stream.
2. If the backend emits a `request` event, the intro screen becomes visible.
3. The screen displays the backend prompt and a single OTP input.
4. The user submits the code, which posts to `POST /stream/response`.

### Screen 2 - Loader
1. After OTP submission, the app shows a loader while the backend finishes login and scraping.
2. `progress` events update the loader state if the backend emits percentages.
3. A successful `data` event or a non-empty `GET /live-games` response moves the app to the home screen.

### Screen 3 - Home
1. The home screen renders the `games` array from `GET /live-games` or the most recent SSE `data` event.
2. The screen remains subscribed to `GET /stream` so future `data` events update the list in place.
3. If the stream drops, the app should fall back to a snapshot refresh instead of blanking the home view.

### Error Paths
- Unknown `request_id` from `POST /stream/response` should be treated as a stale request, not a fatal app crash.
- `error` SSE events should surface a recoverable UI message unless the backend clearly indicates a terminal failure.
- Empty `games` data should keep the loader visible until the first useful snapshot arrives.

## Implementation Steps

### Step 1 - Define the frontend API contract
- Files: `frontend/src/lib/*`
- Action: add typed helpers for SSE parsing, snapshot fetches, and OTP response submission.
- Test criteria: the frontend can represent `request`, `progress`, `error`, and `data` events with one shared shape.

### Step 2 - Introduce a screen-state store
- Files: `frontend/src/lib/*`, `frontend/src/routes/+page.svelte`
- Action: model the three-screen flow as a small state machine with explicit transitions for `intro`, `loader`, and `home`.
- Test criteria: screen transitions are driven by backend events, not hard-coded timers.

### Step 3 - Wire the OTP intro screen
- Files: `frontend/src/routes/+page.svelte`, `frontend/src/app.css`
- Action: render the prompt from the SSE `request` event and submit the code to `POST /stream/response`.
- Test criteria: a received request event makes the OTP form appear and submit payloads include the matching `request_id`.

### Step 4 - Wire the loader screen
- Files: `frontend/src/routes/+page.svelte`, `frontend/src/app.css`
- Action: show a loading state while waiting for `progress` or the first usable data snapshot.
- Test criteria: progress updates change the loader UI and the screen persists until data is available.

### Step 5 - Wire the home screen
- Files: `frontend/src/routes/+page.svelte`, `frontend/src/app.css`
- Action: render live games from `GET /live-games` and update the list when SSE `data` events arrive.
- Test criteria: the home view renders the snapshot payload and stays in sync with later stream updates.

### Step 6 - Add reconnect and fallback behavior
- Files: `frontend/src/lib/*`, `frontend/src/routes/+page.svelte`
- Action: on SSE disconnect or load failure, retry the stream and use `GET /live-games` as a recovery path.
- Test criteria: a dropped stream does not force the app back to an empty state.

## Constraints

- Keep the backend contract unchanged unless the frontend needs an explicit compatibility fix.
- Use one SSE connection per app session instead of separate connections per screen.
- Prefer a single-page state machine over route-based screen switching unless routing becomes necessary later.
- Preserve the existing backend CORS allowance so local frontend dev on a separate port continues to work.
- Keep the home screen resilient to empty payloads and delayed startup.

## Risks & Open Questions

- Should the intro, loader, and home screens be separate routes or a single route with internal state? The current plan assumes a single route with screen states.
- Should the home screen keep polling `GET /live-games` periodically, or is SSE-only refresh sufficient once the stream is stable?
- Does the OTP prompt always arrive before the first `data` payload, or do we need to handle a snapshot-first startup path?
- Should the frontend keep the OTP form visible after submission until the backend confirms progression, or immediately switch to the loader?