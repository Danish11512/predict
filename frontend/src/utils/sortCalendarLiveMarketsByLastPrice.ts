import type { CalendarLiveMarketRow } from '@typings/calendarLiveTypes'

function lastPriceDollarsToSortableNumber(lastPriceDollars: unknown): number {
  if (lastPriceDollars == null) {
    return Number.NEGATIVE_INFINITY
  }
  if (typeof lastPriceDollars === 'number' && Number.isFinite(lastPriceDollars)) {
    return lastPriceDollars
  }
  if (typeof lastPriceDollars === 'string') {
    const n = Number(lastPriceDollars)
    if (Number.isFinite(n)) {
      return n
    }
  }
  return Number.NEGATIVE_INFINITY
}

/** Descending by `last_price_dollars`; missing or unparsable last sorts last. */
export function sortCalendarLiveMarketsByLastPrice(
  markets: readonly CalendarLiveMarketRow[],
): CalendarLiveMarketRow[] {
  return [...markets].sort((a, b) => {
    const la = lastPriceDollarsToSortableNumber(a.last_price_dollars)
    const lb = lastPriceDollarsToSortableNumber(b.last_price_dollars)
    return lb - la
  })
}
