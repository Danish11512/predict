/** Shapes returned by GET /kalshi/calendar-live and GET /kalshi/calendar-live-sports (subset for UI). */

export type CalendarLiveMarketRow = {
  ticker?: string
  status?: string
  yes_bid_dollars?: unknown
  yes_ask_dollars?: unknown
  last_price_dollars?: unknown
  volume_fp?: unknown
}

export type CalendarLiveEventRow = {
  event_ticker?: string
  title?: unknown
  series_ticker?: string
  kalshi_url?: string
  source?: string
  in_milestone_set?: boolean
  event?: Record<string, unknown>
  markets?: CalendarLiveMarketRow[]
  is_live?: boolean
  game_status?: unknown
  widget_status?: unknown
  live_title?: unknown
}

export type CalendarLiveParity = {
  calendar_live_top_tickers?: string[]
  sports_tickers?: string[]
  sports_in_calendar_live_top?: string[]
  sports_not_in_calendar_live_top?: string[]
}

export type CalendarLivePayload = {
  max_events?: number
  returned?: number
  milestone_event_tickers_count?: number
  milestone_live_event_tickers_count?: number | null
  kalshi_calendar?: Record<string, unknown>
  events?: CalendarLiveEventRow[]
}

export type SportsCalendarLivePayload = CalendarLivePayload & {
  filter?: string
  source?: string
  sports_live_tz?: string
  sports_require_today_et?: boolean
  parity?: CalendarLiveParity
}
