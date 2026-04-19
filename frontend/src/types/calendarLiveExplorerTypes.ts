import type { CalendarLivePayload, SportsCalendarLivePayload } from '@typings/calendarLiveTypes'

/** Discriminant for cached calendar-live explorer rows (store + UI). */
export const CalendarLiveExplorerEntryStatus = {
  Loading: 'loading',
  Error: 'error',
  Ok: 'ok',
} as const

export type CalendarLiveExplorerEntryStatus =
  (typeof CalendarLiveExplorerEntryStatus)[keyof typeof CalendarLiveExplorerEntryStatus]

/** Cached GET /calendar-live response for explorer UI (session-only). */
export type CalendarLiveExplorerEntry =
  | { status: typeof CalendarLiveExplorerEntryStatus.Loading }
  | { status: typeof CalendarLiveExplorerEntryStatus.Error; message: string }
  | {
      status: typeof CalendarLiveExplorerEntryStatus.Ok
      payload: CalendarLivePayload | SportsCalendarLivePayload
      updatedAt: number
    }

/** Column keys for the calendar LIVE markets table (explorer). */
export const CalendarLiveMarketColumnKey = {
  Ticker: 'ticker',
  Status: 'status',
  YesBidDollars: 'yes_bid_dollars',
  YesAskDollars: 'yes_ask_dollars',
  LastPriceDollars: 'last_price_dollars',
  VolumeFp: 'volume_fp',
} as const

export type CalendarLiveMarketColumnKey =
  (typeof CalendarLiveMarketColumnKey)[keyof typeof CalendarLiveMarketColumnKey]

export interface CalendarLiveMarketColumnDef {
  key: CalendarLiveMarketColumnKey
  label: string
}

export const CALENDAR_LIVE_MARKET_TABLE_COLUMNS: readonly CalendarLiveMarketColumnDef[] = [
  { key: CalendarLiveMarketColumnKey.Ticker, label: 'Market' },
  { key: CalendarLiveMarketColumnKey.Status, label: 'Status' },
  { key: CalendarLiveMarketColumnKey.YesBidDollars, label: 'Yes bid' },
  { key: CalendarLiveMarketColumnKey.YesAskDollars, label: 'Yes ask' },
  { key: CalendarLiveMarketColumnKey.LastPriceDollars, label: 'Last' },
  { key: CalendarLiveMarketColumnKey.VolumeFp, label: 'Vol' },
]

/** Data columns only (no ticker); for home and other human-first tables. */
export const CALENDAR_LIVE_MARKET_DATA_COLUMNS: readonly CalendarLiveMarketColumnDef[] =
  CALENDAR_LIVE_MARKET_TABLE_COLUMNS.filter((c) => c.key !== CalendarLiveMarketColumnKey.Ticker)

/** Max markets shown per event on the home LIVE column. */
export const CALENDAR_LIVE_HOME_MARKETS_PER_EVENT = 3

export interface CalendarLiveExplorerPollOptions {
  pollMs?: number
  /** When false, polling is suspended (e.g. route not active). */
  enabled?: boolean
  /** Extra pathnames (leading slash, no trailing slash) where this endpoint should poll. */
  extraPathnames?: readonly string[]
}

/** Default: polling is on whenever the hook is mounted with a matching route. */
export const DEFAULT_CALENDAR_LIVE_POLL_ENABLED = true

/** Default interval for `useCalendarLiveExplorerPoll` when `pollMs` omitted (ms). */
export const CALENDAR_LIVE_POLL_MS = 1000
