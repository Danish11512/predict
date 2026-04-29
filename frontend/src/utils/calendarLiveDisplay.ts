import type { CalendarLiveEventRow, CalendarLiveMarketRow } from '@typings/calendarLiveTypes'

/** Non-empty trimmed string, or null. */
export function formatOptionalTrimmedLine(value: unknown): string | null {
  if (value == null) {
    return null
  }
  const s = String(value).trim()
  return s.length > 0 ? s : null
}

export type SportsCalendarHeadingOptions = {
  /** When title is missing, use a generic label instead of `event_ticker`. */
  omitTickerFallback?: boolean
}

/** Kalshi short yes-side label, else market title. */
export function formatCalendarMarketHumanTitle(m: CalendarLiveMarketRow): string | null {
  return formatOptionalTrimmedLine(m.yes_sub_title) ?? formatOptionalTrimmedLine(m.title)
}

export function formatSeriesHumanLine(row: CalendarLiveEventRow): string | null {
  const parts: string[] = []
  if (row.series_title != null) {
    const s = String(row.series_title).trim()
    if (s.length > 0) {
      parts.push(s)
    }
  }
  if (row.series_category != null) {
    const s = String(row.series_category).trim()
    if (s.length > 0) {
      parts.push(s)
    }
  }
  return parts.length > 0 ? parts.join(' · ') : null
}

export type SportsCalendarEventHeadingParts = {
  /** Plain event title (no bracketed status suffix). */
  title: string
  /** Status tokens in display order, e.g. `LIVE`, widget/game labels. */
  statusTokens: string[]
}

/**
 * Base title string plus status tokens used for LIVE / widget / game display.
 * Does not include bracket formatting — use {@link formatSportsCalendarEventHeading} for the legacy string.
 */
export function getSportsCalendarEventHeadingParts(
  row: CalendarLiveEventRow,
  options?: SportsCalendarHeadingOptions,
): SportsCalendarEventHeadingParts {
  const omitTicker = options?.omitTickerFallback === true
  const rawTitle = row.title != null ? String(row.title).trim() : ''
  const title =
    rawTitle.length > 0 ? rawTitle : omitTicker ? 'Live event' : String(row.event_ticker ?? '')

  const statusTokens: string[] = []
  if (row.is_live) {
    statusTokens.push('LIVE')
  }
  if (row.widget_status && row.widget_status !== 'live') {
    statusTokens.push(String(row.widget_status))
  }
  if (row.game_status) {
    statusTokens.push(String(row.game_status))
  }
  return { title, statusTokens }
}

/** Muted title suffix: Kalshi match status (e.g. `2nd - 75'`); never synthetic LIVE tokens. */
export function formatCalendarEventStatusText(row: CalendarLiveEventRow): string {
  return (
    formatOptionalTrimmedLine(row.status_text) ??
    formatOptionalTrimmedLine(row.game_progress?.status_text) ??
    '—'
  )
}

export function formatSportsCalendarEventHeading(
  row: CalendarLiveEventRow,
  options?: SportsCalendarHeadingOptions,
): string {
  const { title, statusTokens } = getSportsCalendarEventHeadingParts(row, options)
  if (statusTokens.length === 0) {
    return title
  }
  return `${title} [${statusTokens.join(' · ')}]`
}
