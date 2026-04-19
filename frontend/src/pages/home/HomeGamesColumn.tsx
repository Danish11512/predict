import { memo, useMemo } from 'react'

import { Skeleton } from '@components/ui/skeleton'
import { API_EXPLORER_ENDPOINT_KALSHI_CALENDAR_LIVE } from '@constants/apiEndpointsConstants'
import { useCalendarLiveExplorerStore } from '@stores/calendarLiveExplorerStore'
import {
  CALENDAR_LIVE_HOME_MARKETS_PER_EVENT,
  CALENDAR_LIVE_MARKET_DATA_COLUMNS,
  CalendarLiveExplorerEntryStatus,
} from '@typings/calendarLiveExplorerTypes'
import type { CalendarLiveEventRow, CalendarLiveMarketRow } from '@typings/calendarLiveTypes'
import {
  formatCalendarMarketHumanTitle,
  formatOptionalTrimmedLine,
  formatSeriesHumanLine,
  getSportsCalendarEventHeadingParts,
} from '@utils/calendarLiveDisplay'
import { formatCalendarLiveMarketTableCell } from '@utils/calendarLiveMarketCells'
import { sortCalendarLiveMarketsByLastPrice } from '@utils/sortCalendarLiveMarketsByLastPrice'
import { GameProgressSection } from '@components/explorer/calendar-live/GameProgressSection'

const HomeMarketRows = memo(function HomeMarketRows({
  markets,
}: {
  markets: readonly CalendarLiveMarketRow[]
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
          </tr>
        </thead>
        <tbody>
          {top.map((m, i) => {
            const label = formatCalendarMarketHumanTitle(m) ?? 'Market'
            return (
              <tr key={m.ticker != null ? String(m.ticker) : `m-${i}`}>
                <td>
                  <div className="home-games__market-title">{label}</div>
                </td>
                {CALENDAR_LIVE_MARKET_DATA_COLUMNS.map((c) => (
                  <td key={c.key}>{formatCalendarLiveMarketTableCell(m, c.key)}</td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
})

const HomeEventBlock = memo(function HomeEventBlock({ row }: { row: CalendarLiveEventRow }) {
  const { title: eventTitle, statusTokens } = getSportsCalendarEventHeadingParts(row, {
    omitTickerFallback: true,
  })
  const extraStatusTokens = statusTokens.filter((t) => t !== 'LIVE')
  const showStatusLine = statusTokens.length > 0
  const seriesLine = formatSeriesHumanLine(row)
  const liveTitle = formatOptionalTrimmedLine(row.live_title)

  return (
    <article className="home-games__article">
      <h2 className="home-games__title">{eventTitle}</h2>
      {showStatusLine ? (
        <p className="home-games__status-line">
          {row.is_live ? (
            <span className="home-games__live-indicator">
              <span className="home-games__live-dot" aria-hidden />
              <span className="home-games__live-label">LIVE</span>
            </span>
          ) : null}
          {extraStatusTokens.length > 0 ? (
            <span className="home-games__status-extra">
              {row.is_live ? <span aria-hidden> · </span> : null}
              {extraStatusTokens.join(' · ')}
            </span>
          ) : null}
        </p>
      ) : null}
      {liveTitle ? <p className="home-games__live-title">{liveTitle}</p> : null}
      {row.game_progress ? (
        <GameProgressSection gameProgress={row.game_progress} classPrefix="home-games" />
      ) : null}
      {seriesLine ? <p className="home-games__meta">{seriesLine}</p> : null}
      <HomeMarketRows markets={row.markets ?? []} />
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
