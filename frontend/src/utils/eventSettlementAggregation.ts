import type {
  HomeEventSettlementRow,
  KalshiFillRow,
  KalshiSettlementRow,
} from '@typings/homeSettlementTypes'

export interface LatestFillEntry {
  orderId: string
  ts: number
}

export interface SettlementAggregateBucket {
  netUsd: number
  grossPayoutUsd: number
  tickers: Set<string>
  latestSettledTime: string
}

/** Gross payout from Kalshi settlement row (revenue is cents). */
export function settlementGrossPayoutUsd(s: KalshiSettlementRow): number {
  const rev = typeof s.revenue === 'number' ? s.revenue : 0
  return rev / 100
}

/** Net realized USD: payout − fees − YES cost basis − NO cost basis (Kalshi settlement semantics). */
export function settlementNetUsdUsd(s: KalshiSettlementRow): number {
  const payout = settlementGrossPayoutUsd(s)
  const fee = parseFixedPointDollars(s.fee_cost)
  const yesCost = parseFixedPointDollars(s.yes_total_cost_dollars)
  const noCost = parseFixedPointDollars(s.no_total_cost_dollars)
  return payout - fee - yesCost - noCost
}

export function parseFixedPointDollars(raw: string | undefined): number {
  if (raw === undefined || raw === '') {
    return 0
  }
  const n = Number(raw)
  return Number.isFinite(n) ? n : 0
}

export function fillTimestampMs(f: KalshiFillRow): number {
  if (typeof f.ts === 'number' && Number.isFinite(f.ts)) {
    const raw = f.ts > 1e12 ? f.ts : f.ts * 1000
    if (raw > 0) {
      return raw
    }
  }
  if (f.created_time) {
    const ms = Date.parse(f.created_time)
    return Number.isFinite(ms) && ms > 0 ? ms : 0
  }
  return 0
}

/** Kalshi sometimes duplicates identifiers on fills — index every non-empty ticker key. */
function fillTickerKeys(f: KalshiFillRow): string[] {
  const a = f.ticker?.trim()
  const b = f.market_ticker?.trim()
  if (a && b && a !== b) {
    return [a, b]
  }
  if (a) {
    return [a]
  }
  if (b) {
    return [b]
  }
  return []
}

/** Merge fills into latest fill per market ticker by max timestamp. */
export function mergeFillPage(
  latestByTicker: Map<string, LatestFillEntry>,
  fills: KalshiFillRow[],
): void {
  for (const f of fills) {
    const ts = fillTimestampMs(f)
    if (ts <= 0) {
      continue
    }
    const keys = fillTickerKeys(f)
    if (keys.length === 0) {
      continue
    }
    const entry: LatestFillEntry = { orderId: f.order_id, ts }
    for (const ticker of keys) {
      const prev = latestByTicker.get(ticker)
      if (prev === undefined || ts >= prev.ts) {
        latestByTicker.set(ticker, entry)
      }
    }
  }
}

/** Parse Kalshi settlement `settled_time` (ISO 8601) for display fallback. */
export function parseIsoDateTimeMs(iso: string | undefined): number | null {
  if (iso === undefined || iso.trim() === '') {
    return null
  }
  const ms = Date.parse(iso)
  return Number.isFinite(ms) && ms > 0 ? ms : null
}

export function upsertSettlement(
  agg: Map<string, SettlementAggregateBucket>,
  s: KalshiSettlementRow,
): void {
  const key = s.event_ticker
  const rowNet = settlementNetUsdUsd(s)
  const rowGross = settlementGrossPayoutUsd(s)
  const prev = agg.get(key)
  const settled = s.settled_time ?? ''
  if (prev === undefined) {
    agg.set(key, {
      netUsd: rowNet,
      grossPayoutUsd: rowGross,
      tickers: new Set([s.ticker]),
      latestSettledTime: settled,
    })
    return
  }
  prev.netUsd += rowNet
  prev.grossPayoutUsd += rowGross
  prev.tickers.add(s.ticker)
  if (settled > prev.latestSettledTime) {
    prev.latestSettledTime = settled
  }
}

/** Latest fill (by execution time) among market tickers for this event’s settlements. */
export function pickRepresentativeFillForEvent(
  tickers: Set<string>,
  latestByTicker: Map<string, LatestFillEntry>,
): LatestFillEntry | null {
  let best: LatestFillEntry | null = null
  for (const t of tickers) {
    const e = latestByTicker.get(t)
    if (e === undefined) {
      continue
    }
    if (best === null || e.ts > best.ts) {
      best = e
    }
  }
  return best
}

export function aggregatesToSortedRows(
  agg: Map<string, SettlementAggregateBucket>,
  latestByTicker: Map<string, LatestFillEntry>,
): HomeEventSettlementRow[] {
  const rows: HomeEventSettlementRow[] = []
  for (const [eventTicker, b] of agg) {
    const rep = pickRepresentativeFillForEvent(b.tickers, latestByTicker)
    rows.push({
      eventTicker,
      eventTitle: null,
      orderFilledAtMs: rep != null && rep.ts > 0 ? rep.ts : null,
      grossPayoutUsd: b.grossPayoutUsd,
      netUsd: b.netUsd,
      latestSettledTime: b.latestSettledTime,
    })
  }
  rows.sort((a, b) => (a.latestSettledTime < b.latestSettledTime ? 1 : -1))
  return rows
}

/** Prefer fill execution time; otherwise settlement payout time (still on API). */
export function rowDisplayInstant(row: HomeEventSettlementRow): {
  ms: number | null
  source: 'fill' | 'settlement'
} {
  if (row.orderFilledAtMs != null && row.orderFilledAtMs > 0) {
    return { ms: row.orderFilledAtMs, source: 'fill' }
  }
  const settledMs = parseIsoDateTimeMs(row.latestSettledTime)
  if (settledMs != null) {
    return { ms: settledMs, source: 'settlement' }
  }
  return { ms: null, source: 'settlement' }
}
