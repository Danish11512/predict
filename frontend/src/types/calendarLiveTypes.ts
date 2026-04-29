/** Shapes returned by GET /calendar-live (subset for UI). */

/** Derived from Kalshi ``live_data`` + ``details`` when ``status`` and ``widget_status`` are live. */
export type GameProgressTimersV1 = {
  period_index?: number | null
  segment_seconds_remaining?: number | null
  regulation_total_seconds?: number | null
  regulation_elapsed_seconds?: number | null
  regulation_remaining_seconds?: number | null
  clock_display?: string | null
}

export type GameProgressNormalizedScores = {
  home: number | null
  away: number | null
}

export type GameProgressV1 = {
  sport: string
  kalshi_live_data_type?: string | null
  /** Raw Kalshi ``details.status`` (e.g. ``inprogress``). */
  details_status?: string | null
  /** Kalshi ``details.widget_status`` — primary signal that the widget considers the event live. */
  widget_status?: string | null
  scores?: GameProgressNormalizedScores | null
  /** Sanitized copy of Kalshi ``details.product_details``. */
  product_details?: Record<string, unknown> | null
  /** Halftime, overtime, or uncertain regulation estimate (shown prominently in UI). */
  progress_warning?: string | null
  /** Kalshi match status line when provided (e.g. `2nd - 75'`). */
  status_text?: string | null
  finished_ratio?: number | null
  timers: GameProgressTimersV1
  statistics: Record<string, string | number>
}

export type CalendarLiveMarketRow = {
  ticker?: string
  /** Kalshi short yes-side label; preferred for display when present. */
  yes_sub_title?: unknown
  /** Kalshi market title (human-readable contract question). */
  title?: unknown
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
  /** From GET /series/{ticker} — e.g. "PGA Tour". */
  series_title?: unknown
  /** From GET /series/{ticker} — e.g. "Sports". */
  series_category?: unknown
  kalshi_url?: string
  source?: string
  in_milestone_set?: boolean
  event?: Record<string, unknown>
  markets?: CalendarLiveMarketRow[]
  is_live?: boolean
  /** Kalshi ``product_details.status_text`` when ``game_progress`` present (e.g. ``2nd - 75'``). */
  status_text?: unknown
  game_status?: unknown
  widget_status?: unknown
  live_title?: unknown
  /** Server-derived progress when Kalshi reports in-play live_data; null otherwise. */
  game_progress?: GameProgressV1 | null
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
