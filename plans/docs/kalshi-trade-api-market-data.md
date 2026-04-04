# Kalshi Trade API — market data, time series, and odds

Reference for integrating Kalshi **Elections** market data into Predict. Use this doc when choosing endpoints and interpreting fields. Official spec: [Kalshi Trade API OpenAPI](https://docs.kalshi.com/openapi.yaml) (production server `https://api.elections.kalshi.com/trade-api/v2`).

---

## Base URL and versioning

- **Production base path:** `https://api.elections.kalshi.com/trade-api/v2`
- Paths in this document are **relative to that base** unless written as absolute URLs.
- **Do not** assume `https://api.elections.kalshi.com/v1/...` for series/markets listing: that shape has been observed to return **404** on the elections host. Prefer the documented **v2** routes below.

---

## Tickers (how they relate)

| Concept | Example | Notes |
|--------|---------|--------|
| **Series ticker** | `KXMARMAD` | Template / family for recurring events. |
| **Event ticker** | `KXMARMAD-26` | One tradable event instance (often `series` + period slug). |
| **Market ticker** | `KXMARMAD-26-MICH` | One binary outcome line inside the event (suffix is outcome-specific). |

**Deriving `event_ticker` from `market_ticker`:** split on `-`; the event is typically the **first two** segments (series + instance), e.g. `KXMARMAD-26-MICH` → `KXMARMAD-26`. Confirm against API responses (`event_ticker` on market objects) when possible.

---

## Odds from price (product convention)

For standard **binary** Kalshi markets, dollar prices are expressed on a **0–1.00** scale per contract notional (e.g. `"0.3500"` in `*_dollars` fields).

- **Implied probability (Yes):** treat the relevant **Yes price** as a probability-like number in **percent** by multiplying by 100 (e.g. `0.35` → 35%). This is the working definition of **effective odds** for UI unless you convert to American/fractional formats.
- **Bid vs ask vs last:**  
  - **Last traded:** `last_price_dollars` on the market.  
  - **Executable range:** `yes_bid_dollars` / `yes_ask_dollars` (and No side analogs) — use these when you need “what you’d pay / receive” rather than last print.
- **Time series buckets:** candlesticks expose OHLC-style `price.*_dollars` (e.g. `mean_dollars`, `close_dollars`). The same probability interpretation applies to those prices; they describe **that interval**, not necessarily a live quote.

We **do not** need a separate “odds API”: **odds for display and trend are derived from price fields** using the rules above.

---

## What to use when (summary)

| Goal | Source | Notes |
|------|--------|--------|
| History, trend, charts | **Candlesticks** time series | Bucketed; latest point is **recent interval-level**, not always live. |
| Recent bucket-level price | **Latest candlestick** (by `end_period_ts`) | Good for “about this hour/day”; stale vs order book if bucket is wide. |
| Latest price / effective odds | **`GET /markets/{ticker}`** | `last_price_dollars`, `yes_bid_dollars`, `yes_ask_dollars`, etc. |
| Depth beyond top of book | **`GET /markets/{ticker}/orderbook`** (or batch orderbooks) | OpenAPI documents yes/no **bids** and the complementarity with the other side; check auth in practice. |
| Full event context (title, all lines) | **`GET /events/{event_ticker}`** with `with_nested_markets=true` | One call for event metadata + all markets. |
| What actually pays at resolution | **Market object** settlement-related fields | See [Settlement and payout fields](#settlement-and-payout-fields) below. |

---

## Endpoints (detail)

### 1. Event + nested markets

**`GET /events/{event_ticker}`**

Query:

- `with_nested_markets` (boolean, default false): if **true**, markets are included on the `event` object (large payload).

Typical top-level `event` fields (names may evolve with API version):

- Identifiers: `event_ticker`, `series_ticker`
- Copy: `title`, `sub_title`
- Classification: `category`, `mutually_exclusive`, `available_on_brokers`, `collateral_return_type`, `product_metadata`
- `markets`: array of market objects (when nested)

Use this when you need **event title**, **subtitle**, and **every market line** for that event in one response.

### 2. Single market (live quote and metadata)

**`GET /markets/{ticker}`**

Returns a `market` object. Important groups:

- **Identifiers:** `ticker`, `event_ticker`
- **Copy:** `title`, `yes_sub_title`, `no_sub_title`, `rules_primary`, `rules_secondary`
- **Latest trading:** `last_price_dollars`, `previous_*`, `yes_bid_dollars`, `yes_ask_dollars`, `no_bid_dollars`, `no_ask_dollars`, sizes on bid/ask
- **Lifecycle:** `status`, `open_time`, `close_time`, `expiration_time`, `expected_expiration_time`, `latest_expiration_time`
- **Activity:** `volume_fp`, `volume_24h_fp`, `open_interest_fp`, `liquidity_dollars`
- **Structure:** `market_type`, `tick_size`, `notional_value_dollars`, `price_ranges`, `response_price_units`

**This is the primary source for “current” price and effective odds** (see [Odds from price](#odds-from-price-product-convention)).

### 3. Markets list (filter by event)

**`GET /markets`**

Useful query parameters:

- `event_ticker` — restrict to one event
- `limit`, `cursor` — pagination; repeat with `cursor` until empty

Returns `markets` plus `cursor` for next page.

### 4. Candlesticks (time series)

**`GET /series/{series_ticker}/markets/{ticker}/candlesticks`**

Required query:

- `start_ts` — Unix **seconds**
- `end_ts` — Unix **seconds**
- `period_interval` — `1` (minute), `60` (hour), or `1440` (day)

Optional:

- `include_latest_before_start` — boolean; when true, may prepend a synthetic point for continuity (per API docs)

Response includes `candlesticks` and `ticker`. Each candlestick includes at least:

- `end_period_ts` — Unix seconds; marks the **end** of the bucket (not the start)
- `price` — e.g. `open_dollars`, `high_dollars`, `low_dollars`, `close_dollars`, `mean_dollars`, `previous_dollars`
- `yes_ask` / `yes_bid` — OHLC-style aggregates for those sides where present
- `volume_fp`, `open_interest_fp`

**Use candlesticks for history and trend.** The **last element** (max `end_period_ts`) gives a **recent bucket-level** aggregate price, not a guaranteed live top-of-book.

**Historical cutoff:** markets settled before the exchange “historical cutoff” may only appear under historical endpoints in the spec (`GET /historical/markets/...`). See Kalshi historical data documentation if you ingest old settled markets.

### 5. Order book (depth)

**`GET /markets/{ticker}/orderbook`**

Query: `depth` (0 or negative = all levels; 1–100 for capped depth per spec).

**`GET /markets/orderbooks`** — batch variant; `tickers` query parameter (array).

OpenAPI describes binary market book semantics (yes bids / no bids and complement prices). The spec lists **signed** security on these operations; confirm whether your integration’s keys are required for read access in your environment.

### 6. Event-level aggregated candlesticks (optional)

**`GET /series/{series_ticker}/events/{ticker}/candlesticks`**

Aggregated across markets for an **event** (per spec summary). Same style of `start_ts`, `end_ts`, `period_interval` as market candlesticks. Use when the chart should represent the **event** rather than one **market** line.

---

## Settlement and payout fields

For **what actually pays** at resolution (and post-settlement state), rely on **market** fields from `GET /markets/{ticker}` or nested markets on the event, not on candlesticks.

Typical fields to consult (exact presence depends on `status` and timing):

- `result` — resolved outcome direction for the market when finalized
- `expiration_value` — value at expiration when applicable
- `settlement_ts`, `settlement_timer_seconds`
- `settlement_value_dollars` — settlement-related dollar amount when present

**Rules text** (`rules_primary`, `rules_secondary`) defines the real-world mapping to Yes/No. **Notional / contract economics** (`notional_value_dollars`, `price_ranges`, etc.) ground how dollars map to contracts.

*Predict product note:* we can **ignore deriving payout math from time series**; use the market + settlement fields above when we need resolution truth. **Odds for live UI** still come from **price** as described earlier.

---

## Authentication

- Many **read** paths (`/events/...`, `/markets/...`, market **candlesticks**) have been usable **without** credentials in manual checks, but **do not** rely on that for all routes or forever.
- OpenAPI marks many endpoints (order book, portfolio, trading) with **Kalshi access key + request signature + timestamp** headers. When integrating those, follow the current Kalshi authentication docs.

---

## Rate limiting and errors

- On **429**, respect **`Retry-After`** when present; use exponential backoff for retries.
- **404** on wrong base path or wrong ticker is common; validate tickers via `GET /markets/{ticker}` or event payload.

---

## Quick reference — absolute URL examples

Replace tickers as needed.

```text
GET https://api.elections.kalshi.com/trade-api/v2/events/KXMARMAD-26?with_nested_markets=true
GET https://api.elections.kalshi.com/trade-api/v2/markets/KXMARMAD-26-MICH
GET https://api.elections.kalshi.com/trade-api/v2/markets?event_ticker=KXMARMAD-26&limit=100
GET https://api.elections.kalshi.com/trade-api/v2/series/KXMARMAD/markets/KXMARMAD-26-MICH/candlesticks?start_ts=<unix>&end_ts=<unix>&period_interval=60
```

---

## Revision notes

- **2026-04-04:** Initial reference — v2 trade-api base, event/market/candlestick usage, odds-from-price convention, settlement fields for resolution truth, explicit split between time series vs snapshot vs order book.
