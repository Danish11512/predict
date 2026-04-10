import { memo } from 'react'

import {
  CALENDAR_LIVE_MARKET_TABLE_COLUMNS,
  CalendarLiveMarketColumnKey,
} from '@typings/calendarLiveExplorerTypes'
import type { CalendarLiveMarketRow } from '@typings/calendarLiveTypes'

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

function CalendarMarketsTableInner({ markets }: CalendarMarketsTableProps) {
  if (markets.length === 0) {
    return null
  }
  return (
    <div className="calendar-live-explorer__markets">
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
          {markets.map((m, i) => (
            <tr key={m.ticker != null ? String(m.ticker) : `m-${i}`}>
              {CALENDAR_LIVE_MARKET_TABLE_COLUMNS.map((c) => (
                <td key={c.key}>
                  {c.key === CalendarLiveMarketColumnKey.Ticker ? (
                    <code>{cell(m, c.key)}</code>
                  ) : (
                    cell(m, c.key)
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export const CalendarMarketsTable = memo(CalendarMarketsTableInner)
