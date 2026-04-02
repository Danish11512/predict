# Frontend conventions (Predict)

## Svelte components

- Keep Svelte route files (`frontend/src/routes/**`) thin: orchestration and wiring only.
- Prefer extracting “pure” pieces (constants, types/interfaces, utility functions) into:
  - `frontend/src/lib/constants/`
  - `frontend/src/lib/interfaces/`
  - `frontend/src/lib/utils/`
- Avoid barrel exports for performance.

## Responsive behavior

- Prefer `matchMedia` + a single listener for layout breakpoints.
- Represent layout as explicit booleans (e.g. `isTop`) in the owning component.

## App header (`AppHeader.svelte`)

- **Desktop** (`min-width: 1025px`): three-column grid — left spacer, centered title, actions (tabs + theme toggle + account). Header is **sticky** at the top.
- **Compact** (`max-width: 1024px`): header is **fixed to the bottom** of the viewport. Primary navigation moves into a **drop-up** behind the menu control; tabs reuse the same `app-header__tab` styles as desktop, with **background** (not bottom border) for the active tab in the menu.
- **Centering on compact**: when the bottom bar is active, an empty **`app-header__balance`** column mirrors the actions column width (`1fr` / `auto` / `1fr` grid) so the title stays visually centered.
- **Theme**: `Theme` enum in `frontend/src/lib/interfaces/theme.ts` for persisted / `data-theme` string values; UI uses a boolean where appropriate (e.g. `isDarkMode` in `AppHeader`) with `isDarkTheme` / `themeFromIsDark` in `frontend/src/lib/utils/theme.ts`. Storage key and `prefers-color-scheme` media string in `frontend/src/lib/constants/theme.ts`; `resolveInitialTheme` / `applyThemeToDocument` / `persistTheme` in the same utils file. Tab definitions in `frontend/src/lib/constants/appHeaderTabs.ts`; header DOM ids and compact breakpoint query in `frontend/src/lib/constants/appHeader.ts`.
- **Menu button icons**: `frontend/static/icons/menu.png` and `menu-dark.png` (see `docs/third-party-assets.md`).

## Third-party assets

- If using third-party icons/assets that require attribution, record it in `docs/third-party-assets.md`.

