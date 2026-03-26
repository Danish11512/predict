# Frontend Overview

## Goal
Document how the frontend works end to end so the app structure, toolchain, and runtime flow are easy to understand and extend.

## Frontend Map

### Runtime
- SvelteKit app under `frontend/src`
- Vite powers local development and production builds
- Bun runs the package scripts in this workspace
- TypeScript is used for application code and Svelte component scripts

### Core Files
- `frontend/src/routes/+page.svelte` - Current landing page and starter content
- `frontend/src/routes/+layout.svelte` - Root layout that imports global styles
- `frontend/src/app.css` - Global styles, theme, layout, and responsive rules
- `frontend/src/app.html` - Base HTML shell for the SvelteKit app
- `frontend/src/lib/index.ts` - Shared app constant exported to the page

### Tooling
- `@sveltejs/kit` - App framework, routing, and build integration
- `@sveltejs/vite-plugin-svelte` - Svelte integration for Vite
- `@sveltejs/adapter-auto` - Default deployment adapter selection
- `vite` - Dev server and production bundling
- `svelte` - Component runtime and compiler
- `svelte-check` - Type and Svelte diagnostics
- `typescript` - Static typing for the project
- `prettier` - Code formatting
- `prettier-plugin-svelte` - Svelte-aware Prettier formatting
- `@types/node` - Node.js type definitions for tooling and scripts

## App Surface

### `GET /`
The only route currently implemented.

Behavior:
- Renders the starter landing page from `frontend/src/routes/+page.svelte`
- Reads `appName` from `frontend/src/lib/index.ts`
- Uses metadata in the component head for title and description

Page structure:
- Hero section with app name, short description, and highlight chips
- Secondary card that lists the next setup commands

## Global Shell
- `frontend/src/routes/+layout.svelte` imports `frontend/src/app.css` so all routes share the same styling
- `frontend/src/app.html` defines the document shell, favicon, viewport meta tag, and SvelteKit placeholders

## Design System

### Styling
- Global dark theme with layered gradients in `frontend/src/app.css`
- Shared typography, spacing, and card styles live in the global stylesheet
- Responsive behavior is handled with a small breakpoint for narrow screens

### Shared Values
- `appName` is exported from `frontend/src/lib/index.ts` and used as the page title/content source

## Flow

1. The browser loads `frontend/src/app.html`.
2. SvelteKit mounts the root layout from `frontend/src/routes/+layout.svelte`.
3. The layout imports `frontend/src/app.css`, which applies the global theme and layout rules.
4. `frontend/src/routes/+page.svelte` renders the starter content and injects `appName` into the page and document head.
5. Vite serves the app during development and bundles it for production builds.

## Setup

Frontend install and run:
```bash
cd frontend
bun install
bun run dev
```

Build and preview:
```bash
cd frontend
bun run build
bun run preview
```

Checks and formatting:
```bash
cd frontend
bun run check
bun run lint
```

## Notes

- The frontend is currently a standalone starter scaffold and does not yet wire to the backend API.
- `frontend/package.json` defines the canonical toolchain for this workspace; there are no extra runtime libraries beyond the SvelteKit stack.
- `@sveltejs/adapter-auto` keeps deployment target selection flexible until a specific platform is chosen.