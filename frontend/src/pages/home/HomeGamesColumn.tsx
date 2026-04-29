import { memo, useMemo } from 'react'

import { Skeleton } from '@components/ui/skeleton'
import { API_EXPLORER_ENDPOINT_KALSHI_CALENDAR_LIVE } from '@constants/apiEndpointsConstants'
import { useCalendarLiveExplorerStore } from '@stores/calendarLiveExplorerStore'
import { useHomeThresholdStore } from '@stores/homeThresholdStore'
import {
  CALENDAR_LIVE_HOME_MARKETS_PER_EVENT,
  CALENDAR_LIVE_MARKET_DATA_COLUMNS,
  CalendarLiveExplorerEntryStatus,
} from '@typings/calendarLiveExplorerTypes'
import type { CalendarLiveEventRow, CalendarLiveMarketRow } from '@typings/calendarLiveTypes'
import {
  formatCalendarMarketHumanTitle,
  formatSeriesHumanLine,
  getSportsCalendarEventHeadingParts,
} from '@utils/calendarLiveDisplay'
import { formatCalendarLiveMarketTableCell } from '@utils/calendarLiveMarketCells'
import { sortCalendarLiveMarketsByLastPrice } from '@utils/sortCalendarLiveMarketsByLastPrice'

import {
  GameProgressSection,
  GameProgressSectionFallback,
} from '@components/explorer/calendar-live/GameProgressSection'

/** 1 ÷ last_price_dollars as number. Returns null if not usable. */
function payoutValue(m: CalendarLiveMarketRow): number | null {
  const raw = m.last_price_dollars
  const price = raw != null ? Number(raw) : NaN
  return Number.isFinite(price) && price > 0 ? 1 / price : null
}

const HomeMarketRows = memo(function HomeMarketRows({
  markets,
  showPayout,
}: {
  markets: readonly CalendarLiveMarketRow[]
  showPayout: boolean
}) {
  const top = useMemo(
    () =>
      sortCalendarLiveMarketsByLastPrice(markets).slice(0, CALENDAR_LIVE_HOME_MARKETS_PER_EVENT),
    [markets],
  )
  if (top.length === 0) {
    return null
  }
  return (
    <div className="home-games__markets">
      <table className="home-games__markets-table">
        <thead>
          <tr>
            <th scope="col">Market</th>
            {CALENDAR_LIVE_MARKET_DATA_COLUMNS.map((c) => (
              <th key={c.key} scope="col">
                {c.label}
              </th>
            ))}
            {showPayout ? (
              <th scope="col" className="home-games__payout-th">
                Payout
              </th>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {top.map((m, i) => {
            const label = formatCalendarMarketHumanTitle(m) ?? 'Market'
            const pv = showPayout ? payoutValue(m) : null
            const payoutDisplay = pv != null ? `x${pv.toFixed(2)}` : null
            const payoutClass =
              pv != null && pv >= 1.1 ? 'home-games__payout--green' : 'home-games__payout--grey'
            return (
              <tr key={m.ticker != null ? String(m.ticker) : `m-${i}`}>
                <td>
                  <div className="home-games__market-title">{label}</div>
                </td>
                {CALENDAR_LIVE_MARKET_DATA_COLUMNS.map((c) => (
                  <td key={c.key}>{formatCalendarLiveMarketTableCell(m, c.key)}</td>
                ))}
                {payoutDisplay != null ? <td className={payoutClass}>{payoutDisplay}</td> : null}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
})

const HomeEventBlock = memo(function HomeEventBlock({ row }: { row: CalendarLiveEventRow }) {
  const threshold = useHomeThresholdStore((s) => s.threshold)
  const { title: eventTitle } = getSportsCalendarEventHeadingParts(row, {
    omitTickerFallback: true,
  })
  const seriesLine = formatSeriesHumanLine(row)

  const progressPct =
    row.game_progress?.finished_ratio != null && Number.isFinite(row.game_progress.finished_ratio)
      ? Math.round(row.game_progress.finished_ratio * 100)
      : 0

  const isGreen = progressPct >= threshold

  return (
    <article className={`home-games__article${isGreen ? ' home-games__article--green' : ''}`}>
      <h2 className="home-games__title">
        <span className="home-games__title-text">{eventTitle}</span>
      </h2>
      {row.game_progress ? (
        <GameProgressSection gameProgress={row.game_progress} />
      ) : (
        <GameProgressSectionFallback />
      )}

      {seriesLine ? <p className="home-games__meta">{seriesLine}</p> : null}
      <HomeMarketRows markets={row.markets ?? []} showPayout={isGreen} />
    </article>
  )
})

function HomeGamesColumnInner() {
  const endpointId = API_EXPLORER_ENDPOINT_KALSHI_CALENDAR_LIVE.id
  const entry = useCalendarLiveExplorerStore((s) => s.entries[endpointId])

  if (entry === undefined || entry.status === CalendarLiveExplorerEntryStatus.Loading) {
    return (
      <div className="home-games" aria-busy="true">
        <Skeleton className="h-8 w-full max-w-md" />
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

  if (entry.status === CalendarLiveExplorerEntryStatus.Error) {
    return (
      <p className="home-games__empty" role="alert">
        {entry.message}
      </p>
    )
  }

  const events = entry.payload.events ?? []
  if (events.length === 0) {
    return (
      <p className="home-games__empty" role="status">
        no live games
      </p>
    )
  }

  return (
    <div className="home-games">
      {events.map((row, i) => (
        <HomeEventBlock
          key={row.event_ticker != null ? String(row.event_ticker) : `ev-${i}`}
          row={row}
        />
      ))}
    </div>
  )
}

export const HomeGamesColumn = memo(HomeGamesColumnInner)
