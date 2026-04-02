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

## Third-party assets

- If using third-party icons/assets that require attribution, record it in `docs/third-party-assets.md`.

