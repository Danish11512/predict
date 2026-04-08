---
task: Live sports Kalshi data in SSE (REST + WebSocket, payouts, live stats)
test_command: "cd backend && python3 -m unittest discover -s tests -v && cd ../frontend && bun run check && bun run build"
---

# Task: Live sports Kalshi data in SSE (REST baseline + WebSocket deltas)

Enrich the **same live-game rows** the backend already pushes on SSE (`event: data`) so each row stays aligned with **scraped sports tiles** from Selenium, while adding Trade API v2 data, **per-market prices** (bid / ask / mid / last with `"-"` when empty), **per-contract settlement payouts**, **volume / OI**, **milestones**, **live data**, and **game stats**. Feed everything through the **existing** `GET /stream` / `GET /live-games` payload shape (extend nested objects; do not replace the scrape-driven game list).

**Production host:** `https://api.elections.kalshi.com/trade-api/v2`  
**WebSocket:** `wss://api.elections.kalshi.com` (handshake auth required per [WebSocket Connection](https://docs.kalshi.com/websockets/websocket-connection))  
**Historical boundary:** call [`GET /historical/cutoff`](https://docs.kalshi.com/api-reference/historical/get-historical-cutoff-timestamps) when designing tests or archival fallbacks; nested markets from [`GET /events/{ticker}?with_nested_markets=true`](https://docs.kalshi.com/api-reference/events/get-event) omit markets settled before that cutoff (acceptable per product decision).

## Product rules (locked)

| Topic | Decision |
| --- | --- |
| Which events | **Match SSE today:** one game row per scraped live tile; resolve `event_ticker` from `market_href` the same way as `live_games_enrich` (`market_ticker` → strip last `-segment`). Tests must prove enriched **event tickers** match that pipeline for the same scrape fixture. |
| Sports scope | **All sports** (no competition allowlist). |
| Multivariate | **Exclude** (`mve_filter=exclude` on market queries; do not pull multivariate-only event lists for v1). |
| Nested markets | **`with_nested_markets=true`** is acceptable; known caveat for pre-cutoff settled markets is OK. |
| Transport | **REST** for full baseline snapshots; **WebSocket** for deltas ([market ticker](https://docs.kalshi.com/websockets/market-ticker), [orderbook](https://docs.kalshi.com/websockets/orderbook-updates), [public trades](https://docs.kalshi.com/websockets/public-trades) as needed). Merge deltas into the in-memory snapshot that backs SSE. |
| Prices | For each market expose **`yes_bid` / `yes_ask` / `no_bid` / `no_ask` / `last`** (dollar strings from API) plus computed **`mid_yes`** = midpoint of yes bid/ask when both present; use string **`"-"`** for any missing quote component or mid. |
| Payout (binary) | **Per contract at settlement:** YES pays `notional_value_dollars` if outcome YES, else `$0`; NO is complementary (pays notional if NO wins, else `$0`). Document in payload as explicit derived fields (e.g. `payout_yes_wins_dollars`, `payout_no_wins_dollars`) alongside raw `notional_value_dollars`. |
| Payout (scalar) | Include market in payload; **after determination only**, use `settlement_value_dollars` for YES/LONG settlement value; before determination omit payout summary or mark `null`. |
| Live v1 | **Include** [`GET /live_data/milestone/{milestone_id}`](https://docs.kalshi.com/api-reference/live-data/get-live-data) and [`GET /game_stats` (by milestone)](https://docs.kalshi.com/api-reference/live-data/get-game-stats) where milestone IDs are known (from [`GET /milestones`](https://docs.kalshi.com/api-reference/milestone/get-milestones) with `category=Sports`, linking via `related_event_tickers` / `primary_event_tickers`). |
| Env | **Production** Trade API; credentials from env (see `.env.example`). |

## Success criteria

1. [ ] **Payload contract:** `GET /live-games` and SSE `event: data` still return `{"updated_utc", "games"}`. Each element remains `{ "scraped", "event", "markets" }` at minimum; **add** documented optional keys (e.g. `milestone`, `live_data`, `game_stats`, `markets_enriched` or in-place extended `markets` entries) without breaking the frontend’s current readers (backward compatible or version behind a flag documented in code comments).
2. [ ] **Parity with scrape:** For a given scrape-derived list, the set of **event tickers** (and market tickers from href) matches the existing `live_games_enrich` dedupe rules; add automated test(s) that mock scrape rows and assert parity.
3. [ ] **REST baseline:** Implement authenticated Trade API reads (RSA headers per [Quick Start: Authenticated Requests](https://docs.kalshi.com/getting_started/quick_start_authenticated_requests)) for milestones, events with nested markets, single markets when needed, historical cutoff, live data, and game stats. Use **cursor pagination** on all list endpoints, **Retry-After / exponential backoff** on 429, and a **documented max pages / budget** per poll cycle to avoid stalls.
4. [ ] **WebSocket deltas:** Maintain a WS connection in the backend process; subscribe to tickers derived from the current live snapshot; merge ticker / orderbook / trade deltas into the same snapshot used for SSE pushes.
5. [ ] **Prices & payout fields:** Every emitted market includes the price rule above and binary payout derived fields; scalar uses `settlement_value_dollars` only post-determination (`Market.status` / `result` as per API).
6. [ ] **Multivariate:** Confirmed excluded from fetch paths for v1 (no combo events in the primary list).
7. [ ] **`.env.example`:** Documents `KALSHI_API_KEY_ID`, `KALSHI_PRIVATE_KEY_PATH`, production `KALSHI_TRADE_API_BASE`, and optional `KALSHI_WS_URL` if non-default.
8. [ ] **Verification:** All of the following pass with no new failures: `cd backend && python3 -m unittest discover -s tests -v`, `cd frontend && bun run check`, `cd frontend && bun run build`.

## References (Kalshi)

- [Get Historical Cutoff Timestamps](https://docs.kalshi.com/api-reference/historical/get-historical-cutoff-timestamps)
- [Get Events / nested markets](https://docs.kalshi.com/api-reference/events/get-events)
- [Get Markets](https://docs.kalshi.com/api-reference/market/get-markets)
- [Get Milestones](https://docs.kalshi.com/api-reference/milestone/get-milestones)
- [Targets & Milestones](https://docs.kalshi.com/getting_started/targets_and_milestones)
- [Get Live Data](https://docs.kalshi.com/api-reference/live-data/get-live-data)
- [Get Game Stats](https://docs.kalshi.com/api-reference/live-data/get-game-stats)
- [WebSocket Connection](https://docs.kalshi.com/websockets/websocket-connection)

---

## Ralph Instructions

1. Work on the next incomplete criterion (marked `[ ]`).
2. Check off completed criteria (change `[ ]` to `[x]`).
3. Run the full verification block in criterion 8 after substantive changes.
4. Commit your changes frequently.
5. When ALL criteria are `[x]`, output: `<ralph>COMPLETE</ralph>`
6. If stuck on the same issue 3+ times, output: `<ralph>GUTTER</ralph>`
