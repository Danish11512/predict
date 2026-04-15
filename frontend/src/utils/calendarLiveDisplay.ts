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
  const prefer = (v: unknown): string | null => {
    if (v == null) {
      return null
    }
    const s = String(v).trim()
    return s.length > 0 ? s : null
  }
  return prefer(m.yes_sub_title) ?? prefer(m.title)
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

export function formatSportsCalendarEventHeading(
  row: CalendarLiveEventRow,
  options?: SportsCalendarHeadingOptions,
): string {
  const omitTicker = options?.omitTickerFallback === true
  const rawTitle = row.title != null ? String(row.title).trim() : ''
  const heading =
    rawTitle.length > 0 ? rawTitle : omitTicker ? 'Live event' : String(row.event_ticker ?? '')

  const badges: string[] = []
  if (row.is_live) {
    badges.push('LIVE')
  }
  if (row.widget_status && row.widget_status !== 'live') {
    badges.push(String(row.widget_status))
  }
  if (row.game_status) {
    badges.push(String(row.game_status))
  }
  if (badges.length === 0) {
    return heading
  }
  return `${heading} [${badges.join(' · ')}]`
}
