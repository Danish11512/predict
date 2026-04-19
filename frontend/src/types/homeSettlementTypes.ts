/** Kalshi Trade API — settlement row (subset used by home orders panel). */
export interface KalshiSettlementRow {
  ticker: string
  event_ticker: string
  revenue: number
  fee_cost: string
  yes_total_cost_dollars: string
  no_total_cost_dollars: string
  settled_time: string
}

/** Kalshi Trade API — fill row (subset). */
export interface KalshiFillRow {
  order_id: string
  ticker?: string
  market_ticker?: string
  ts?: number
  created_time?: string
}

export interface KalshiGetSettlementsResponse {
  settlements: KalshiSettlementRow[]
  cursor?: string | null
}

export interface KalshiGetFillsResponse {
  fills: KalshiFillRow[]
  cursor: string
}

export interface KalshiGetEventResponse {
  event?: {
    event_ticker: string
    title: string
  }
}

export interface HomeEventSettlementRow {
  eventTicker: string
  eventTitle: string | null
  /** Fill timestamp (ms) for representative fill among event markets; null when unknown. */
  orderFilledAtMs: number | null
  /** Sum of settlement payout (revenue ÷ 100) across markets in this event. */
  grossPayoutUsd: number
  netUsd: number
  latestSettledTime: string
}
