# Plan: Frontend organization (React + Vite)

_Created: 2026-04-10_

## Goal

Establish a scalable, feature-sliced layout for the `frontend/` app: clear boundaries for features vs shared code, `@/` path aliases (no barrel files), shadcn/ui readiness (Tailwind v4 + `components.json`), Prettier + ESLint without duplicate ignore files, and placeholder folders aligned with backend Kalshi routes—without shipping new UI until those screens are implemented.

## Directory layout (`frontend/src/`)

| Path | Purpose |
|------|---------|
| `app/` | App shell (e.g. root `App.tsx`), future providers/router entry |
| `features/` | Feature modules; one subfolder per API surface / user journey |
| `features/health/` | Health check UI (paired with `GET /health` via `/api/health` proxy) |
| `features/kalshi/calendar-live/` | `GET /kalshi/calendar-live` |
| `features/kalshi/calendar-live-sports/` | `GET /kalshi/calendar-live-sports` |
| `features/kalshi/markets/` | `GET /kalshi/markets` |
| `features/kalshi/portfolio-balance/` | `GET /kalshi/portfolio/balance` |
| `features/kalshi/ws-smoke/` | `GET /kalshi/ws/smoke` (or related WS testing) |
| `components/ui/` | shadcn-generated primitives only (empty until `shadcn add`) |
| `shared/api/` | HTTP client / fetch helpers (future) |
| `shared/hooks/` | Shared hooks (future) |
| `shared/lib/utils.ts` | `cn()` for shadcn (`clsx` + `tailwind-merge`) |
| `styles/` | Global CSS (`index.css` includes Tailwind) + feature/shell styles |
| `types/` | Shared types; use `*.types.ts` for type-only modules (e.g. `health.types.ts`) |

Git does not track empty directories; add the first real file under a feature when you implement it.

## Path aliases

- **Vite:** `resolve.alias` maps `@` → `src/`.
- **TypeScript:** `tsconfig.app.json` has `"paths": { "@/*": ["./src/*"] }` and `"ignoreDeprecations": "6.0"` (paths without legacy `baseUrl` noise for TS 6).

Imports use explicit paths such as `@/app/App.tsx`, `@/styles/index.css`, `@/types/health.types.ts`—**no** `index.ts` barrel re-exports.

## Tooling

| Concern | Setup |
|---------|--------|
| Bundler | Vite + `@vitejs/plugin-react` |
| CSS | Tailwind v4 via `@tailwindcss/vite`; global tokens remain in `styles/index.css` after `@import "tailwindcss"` |
| Lint | ESLint flat config + `typescript-eslint` + `eslint-config-prettier/flat` (formatting is Prettier’s job) |
| Format | Prettier (`.prettierrc.json`: no semicolons, single quotes); `lint` runs `eslint` then `prettier --check .` |
| shadcn | `components.json` at `frontend/` root; aliases: `components` → `@/components`, `utils` → `@/shared/lib/utils`, `lib` → `@/shared/lib`, `hooks` → `@/shared/hooks` |

Interactive `shadcn init` was not used (CLI prompted for Radix vs Base); Tailwind and `components.json` were added manually. Add components with `bunx shadcn@latest add <name>` from `frontend/` when ready.

## Git / Prettier ignore policy

- **Single** `frontend/.gitignore` for the package (no `frontend/.prettierignore`).
- Prettier respects `.gitignore` by default for ignore patterns.
- Lockfiles (`bun.lock`, `*.lock`) are **not** gitignored; they are skipped for formatting via Prettier `overrides` (`requirePragma: true` on those globs).
- Repo root `.gitignore` should not duplicate `frontend/dist/`; `dist/` at repo root already ignores build output; `frontend/.gitignore` still lists `dist` for clarity when working only under `frontend/`.

## Dev proxy

`vite.config.ts` proxies `/api` → `http://127.0.0.1:${BACKEND_PORT}` with path rewrite stripping `/api`, so the browser calls `/api/kalshi/...` and the backend sees `/kalshi/...`.

## Verification (gate)

From `frontend/`:

```bash
bun run build
bun run lint
```

## Backend correlation context (calendar / live)

For aligning UI with Kalshi calendar behavior, see the analysis in the transcript on **card_feed** (`/live_data/card_feed?category=Sports`) vs aggregation fallback, and fields such as `is_live`, `game_status`, `widget_status`. Sports calendar fidelity is highest when the payload reports `source: "card_feed"`; fallback aggregation can diverge from kalshi.com/calendar ordering.

## Next implementation steps (not done in this plan)

1. Add shadcn primitives as needed (`button`, `card`, etc.) and `lucide-react` if required by CLI.
2. Under each `features/kalshi/*` folder, add a small route or section component that fetches the matching endpoint and renders JSON or structured layout.
3. Centralize `fetch` base URL or error handling in `shared/api/` when more than one feature needs it.
