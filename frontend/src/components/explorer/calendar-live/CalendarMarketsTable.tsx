import { memo, useMemo } from 'react'

import {
  CALENDAR_LIVE_MARKET_TABLE_COLUMNS,
  CalendarLiveMarketColumnKey,
} from '@typings/calendarLiveExplorerTypes'
import type { CalendarLiveMarketRow } from '@typings/calendarLiveTypes'
import { sortCalendarLiveMarketsByLastPrice } from '@utils/sortCalendarLiveMarketsByLastPrice'

export type CalendarMarketsTableProps = {
  markets: CalendarLiveMarketRow[]
}

function cell(m: CalendarLiveMarketRow, key: CalendarLiveMarketColumnKey): string {
  if (key === CalendarLiveMarketColumnKey.Ticker) {
    return m.ticker != null ? String(m.ticker) : ''
  }
  const v = m[key]
  return v != null ? String(v) : ''
}

function marketHumanLabel(m: CalendarLiveMarketRow): string | null {
  const prefer = (v: unknown): string | null => {
    if (v == null) {
      return null
    }
    const s = String(v).trim()
    return s.length > 0 ? s : null
  }
  return prefer(m.yes_sub_title) ?? prefer(m.title)
}

function CalendarMarketsTableInner({ markets }: CalendarMarketsTableProps) {
  const sortedMarkets = useMemo(() => sortCalendarLiveMarketsByLastPrice(markets), [markets])

  if (sortedMarkets.length === 0) {
    return null
  }

  const collapseMarkets = sortedMarkets.length > 3

  return (
    <div
      className={
        collapseMarkets
          ? 'calendar-live-explorer__markets calendar-live-explorer__markets--max-three-rows'
          : 'calendar-live-explorer__markets'
      }
    >
      <table className="calendar-live-explorer__markets-table">
        <thead>
          <tr>
            {CALENDAR_LIVE_MARKET_TABLE_COLUMNS.map((c) => (
              <th key={c.key} scope="col">
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedMarkets.map((m, i) => {
            const titleLine = marketHumanLabel(m)
            const tickerText = cell(m, CalendarLiveMarketColumnKey.Ticker)
            return (
              <tr key={m.ticker != null ? String(m.ticker) : `m-${i}`}>
                {CALENDAR_LIVE_MARKET_TABLE_COLUMNS.map((c) => (
                  <td key={c.key}>
                    {c.key === CalendarLiveMarketColumnKey.Ticker ? (
                      <div className="calendar-live-explorer__ticker-cell">
                        {titleLine ? (
                          <>
                            <div className="calendar-live-explorer__market-title">{titleLine}</div>
                            {tickerText ? (
                              <code className="calendar-live-explorer__market-ticker">
                                {tickerText}
                              </code>
                            ) : null}
                          </>
                        ) : (
                          <code className="calendar-live-explorer__market-ticker calendar-live-explorer__market-ticker--solo">
                            {tickerText}
                          </code>
                        )}
                      </div>
                    ) : (
                      cell(m, c.key)
                    )}
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export const CalendarMarketsTable = memo(CalendarMarketsTableInner)
