# Feature: home-aside-refactor

_Created: 2026-04-19_

---

## Goal

Move home right-column UI (placeholder card + orders panel) into `frontend/src/components/home/`, extract fetch/virtual-scroll logic into a dedicated hook and small presentational pieces, co-locate CSS, dedupe helpers into `utils`/`constants`, preserve behavior and API usage—**backend out of scope**.

---

## Requirements

### Problem Statement

`HomeOrdersPanel` and aside layout live under `pages/home/` with formatting/query helpers inlined; styles mix into `homePage.css`. Harder to reuse and navigate.

### Goals

- **`components/home/`** owns aside placeholder + orders UI; **`pages/home/`** stays route shell + grid only.
- **Hook + presentational split**: container wiring vs row/list markup.
- **Pure helpers** in `utils` (query string, USD/time formatting); **constants** centralized.
- **CSS** next to components under `components/home/`; **`homePage.css`** keeps page grid + games column + shared tokens usage only.
- **Calendar-live explorer** untouched.

### Non-Goals

- Backend routes, aggregation math in `@utils/eventSettlementAggregation.ts` (keep file; only adjust imports/call sites if needed).

### Success Criteria

- **`bun run check`** passes.
- **Visual parity**: aside layout, placeholder height/border, orders virtual list, refresh, scroll-load, row content/colors.
- **No new network endpoints** or extra requests vs current implementation.
- **Fewer redundant modules** at page level (`HomeOrdersPanel` removed from `pages/`).

---

## Design

### Components & Responsibilities

| Piece | Responsibility |
|--------|----------------|
| `HomeAsidePlaceholderCard` | Empty bordered card matching `home-games__article` visual |
| `HomeOrderSettlementRow` | Single virtualized row (title, ticker, payout, time, P&amp;L classes) |
| `HomeOrdersPanel` | Toolbar + scroll region + virtual list; uses hook |
| `useHomeOrdersPanel` | Refs, state, fetch pagination, title side-effects, virtualizer config |

### Data Flow

Unchanged: `/portfolio/fills` → merge fills; `/portfolio/settlements` paginated → `upsertSettlement` → `aggregatesToSortedRows`; `/events/{ticker}` for titles.

---

## Planning

### Scope

**Touch:** `frontend/src/pages/home/HomePage.tsx`, `frontend/src/pages/home/homePage.css`, delete `frontend/src/pages/home/HomeOrdersPanel.tsx` after move.

**Add:** `frontend/src/components/home/*.tsx`, `frontend/src/components/home/*.css`, `frontend/src/hooks/useHomeOrdersPanel.ts` (name final TBD—avoid clash with component name).

**Maybe add:** `frontend/src/constants/homeOrdersConstants.ts`, `frontend/src/utils/httpQueryString.ts` (or one small util file if preferred single import).

### Flow Analysis

HomePage renders aside → placeholder + wrapper → orders panel. After refactor: import from `@components/home/...`; CSS import path updates.

### Task Breakdown

- [ ] **Step 1 — Constants + pure utils**
  - Files: `frontend/src/constants/homeOrdersConstants.ts` (limits, `ROW_HEIGHT_PX`, `SCROLL_LOAD_THRESHOLD_PX`), `frontend/src/utils/httpQueryString.ts` (`buildQuery`), `frontend/src/utils/homeOrdersDisplayFormat.ts` (USD + instant formatters—or merge formatters into one existing money util if project already has one).
  - Action: Lift inlined constants/functions from current panel; no behavior change.
  - Test criteria: `bun run check`; no runtime change.
  - > Research: Prefer one `buildQuery` in `utils` for future portfolio calls; grep before duplicating formatters elsewhere.

- [ ] **Step 2 — `useHomeOrdersPanel` hook**
  - Files: `frontend/src/hooks/useHomeOrdersPanel.ts`.
  - Action: Move aggregation refs, fills/settlements fetch loops, settlement cursor state, scroll `loadMore`, title fetch effect, `useVirtualizer` setup; return data + handlers + refs for the panel.
  - Test criteria: Hook compiles; panel still drives same URLs with same limits.

- [ ] **Step 3 — Presentational components**
  - Files: `frontend/src/components/home/HomeOrderSettlementRow.tsx`, `frontend/src/components/home/HomeAsidePlaceholderCard.tsx`.
  - Action: Row receives props (row, resolved title label, preformatted strings as needed to keep row dumb); placeholder applies same border/min-height classes as today (`home-games__article` + sizing wrapper classes moved from page CSS).
  - Test criteria: Snapshot/visual spot-check row markup unchanged.

- [ ] **Step 4 — `HomeOrdersPanel` in components + CSS**
  - Files: `frontend/src/components/home/HomeOrdersPanel.tsx`, `frontend/src/components/home/homeOrdersPanel.css` (toolbar, scroll, row, virtual root, P&amp;L colors).
  - Action: Compose hook + row list; import component CSS; delete `pages/home/HomeOrdersPanel.tsx`; update exports/imports.
  - Test criteria: Refresh + infinite scroll + virtual list identical behavior.

- [ ] **Step 5 — Page layout CSS cleanup**
  - Files: `frontend/src/pages/home/homePage.css`, optional `frontend/src/components/home/homeAside.css` (only `.home-aside`, `.home-aside__*` if extracted).
  - Action: Strip moved rules from `homePage.css`; ensure `HomePage` imports placeholder/panel CSS or per-component imports cover aside.
  - Test criteria: Grid + gap + responsive column unchanged.

- [ ] **Step 6 — Wire `HomePage`**
  - Files: `frontend/src/pages/home/HomePage.tsx`.
  - Action: Import `HomeAsidePlaceholderCard`, `HomeOrdersPanel` from `@components/home/...`; remove stale `./HomeOrdersPanel` path.
  - Test criteria: `bun run check`; manual smoke on home route.

### Dependencies

Steps 1 → 2 → 3 → 4 → 5 → 6 (strict order).

### Risks & Open Questions

- **Hook naming**: `useHomeOrdersPanel` vs `useHomeSettlementRows` — pick one that matches exported component.
- **CSS load order**: Ensure theme variables still apply (import order in panel/placeholder).

### Execution Order

As listed; single squashed commit per user preference after full verification.

---

## Implementation Notes

_Populated during execution_

---

## Testing

- `bun run check` (project gate).
- Manual: home → refresh orders, scroll to trigger load-more, compare row counts/tickers to pre-refactor.
