# Feature: kalshi-game-progress-milestone-accept

_Created: 2026-04-20_

---

## Goal

Attach structured `game_progress` whenever `/live_data/batch` returns a usable row for an event milestone; do not drop progress because `details.widget_status` is not `"live"`. Rely on existing calendar/live presentation signals (`is_live`, sports filtering) separately.

---

## Requirements

### Problem Statement

Home and explorer omitted `game_progress` for events where Kalshi returned batch live_data but `widget_status` was not `"live"`, so fewer games showed Kalshi stats than expected.

### Goals

- Remove `widget_status == live` gate inside `game_progress_from_live_data`.
- Keep requiring non-null `live_data` dict with dict `details` (batch shape).

### Non-Goals

- Changing milestone resolution or `/live_data/batch` fan-out.
- Frontend changes unless types need widening (none expected).

### Success Criteria

- Batch-backed rows with any `widget_status` still emit non-null `game_progress` when `details` is a dict.

---

## Planning

### Task Breakdown

- [x] Step 1 — Drop `_kalshi_in_play`; document caller responsibility in `game_progress_from_live_data` docstring.
  - Files: `backend/src/backend/kalshi/game_progress.py`, `AGENTS.md`

### Risks & Open Questions

See clarifications below (empty `details`, post-game batch rows).

---

## Implementation Notes

- Removed `_kalshi_in_play`; `game_progress_from_live_data` now runs whenever `live_data.details` is a dict.

---

## Clarifications (Ralph Step 1 — answer if defaults wrong)

FEATURE: kalshi-game-progress-milestone-accept  
GOAL: Accept batch milestone live_data for progress without widget_status gate.

--- Clarifications ---

1. **[Scope]** OK to still require `details` be a dict (possibly empty)? Or treat missing `details` as accepted if top-level live_data has fields?
2. **[Edge]** If Kalshi returns batch row after final whistle (widget `final` / stale) — OK to show last snapshot + `progress_warning`, or hide via separate rule?
3. **`is_live` mismatch]** Row `is_live: false` but batch returns details — still show `GameProgressSection` on Home (today: any non-null `game_progress`)?
4. **[Docs]** Historical `calendar-live-live-data-progress-enrichment.md` mentions `_kalshi_in_play`; OK to leave as archive or tighten in follow-up?

Answer SKIP for N/A.
