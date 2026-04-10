import { memo } from 'react'

import type { CalendarLiveMarketRow } from '@typings/calendarLiveTypes'

export type CalendarMarketsTableProps = {
  markets: CalendarLiveMarketRow[]
}

const COLS = [
  { key: 'ticker', label: 'Market' },
  { key: 'status', label: 'Status' },
  { key: 'yes_bid_dollars', label: 'Yes bid' },
  { key: 'yes_ask_dollars', label: 'Yes ask' },
  { key: 'last_price_dollars', label: 'Last' },
  { key: 'volume_fp', label: 'Vol' },
] as const

function cell(m: CalendarLiveMarketRow, key: (typeof COLS)[number]['key']): string {
  if (key === 'ticker') {
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
            {COLS.map((c) => (
              <th key={c.key} scope="col">
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {markets.map((m, i) => (
            <tr key={m.ticker != null ? String(m.ticker) : `m-${i}`}>
              {COLS.map((c) => (
                <td key={c.key}>
                  {c.key === 'ticker' ? <code>{cell(m, c.key)}</code> : cell(m, c.key)}
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
