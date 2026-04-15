import { CalendarLiveMarketColumnKey } from '@typings/calendarLiveExplorerTypes'
import type { CalendarLiveMarketRow } from '@typings/calendarLiveTypes'

/** String cell for calendar LIVE market tables (explorer + home). */
export function formatCalendarLiveMarketTableCell(
  m: CalendarLiveMarketRow,
  key: CalendarLiveMarketColumnKey,
): string {
  if (key === CalendarLiveMarketColumnKey.Ticker) {
    return m.ticker != null ? String(m.ticker) : ''
  }
  const v = m[key]
  return v != null ? String(v) : ''
}
