import { memo, useMemo } from 'react'

import { devLog } from '@shared/lib/devLog'
import type { CalendarLiveEventRow } from '@typings/calendarLiveTypes'
import { formatSeriesHumanLine, formatSportsCalendarEventHeading } from '@utils/calendarLiveDisplay'

import { CalendarMarketsTable } from './CalendarMarketsTable'

export type CalendarEventArticleProps = {
  row: CalendarLiveEventRow
  isSportsCalendar: boolean
}

function CalendarEventArticleInner({ row, isSportsCalendar }: CalendarEventArticleProps) {
  const title = isSportsCalendar
    ? formatSportsCalendarEventHeading(row)
    : String(row.title ?? row.event_ticker ?? '')

  const eventTickerDescription = useMemo(() => {
    if (row.title == null) {
      return null
    }
    const s = String(row.title).trim()
    return s.length > 0 ? s : null
  }, [row.title])

  const seriesHumanLabel = useMemo(() => formatSeriesHumanLine(row), [row])

  const rawJson = useMemo(() => {
    try {
      return JSON.stringify(row.event ?? {}, null, 2)
    } catch (e) {
      devLog.warn('event JSON stringify failed', { eventTicker: row.event_ticker, cause: e })
      return '{}'
    }
  }, [row.event, row.event_ticker])

  const liveTitle =
    isSportsCalendar && row.live_title != null && String(row.live_title).length > 0
      ? String(row.live_title)
      : null

  return (
    <article className="calendar-live-explorer__article">
      <h2 className="calendar-live-explorer__article-title">{title}</h2>
      {liveTitle ? <div className="calendar-live-explorer__live-title">{liveTitle}</div> : null}
      <div className="calendar-live-explorer__meta">
        <div className="calendar-live-explorer__meta-row">
          <span className="calendar-live-explorer__meta-k">Event</span>
          <code className="calendar-live-explorer__meta-code">{row.event_ticker ?? ''}</code>
          {eventTickerDescription ? (
            <span className="calendar-live-explorer__meta-human"> · {eventTickerDescription}</span>
          ) : null}
        </div>
        <div className="calendar-live-explorer__meta-row">
          <span className="calendar-live-explorer__meta-k">Series</span>
          <code className="calendar-live-explorer__meta-code">{row.series_ticker ?? ''}</code>
          {seriesHumanLabel ? (
            <span className="calendar-live-explorer__meta-human"> · {seriesHumanLabel}</span>
          ) : null}
        </div>
        <div className="calendar-live-explorer__meta-row calendar-live-explorer__meta-row--minor">
          <span>source {row.source ?? ''}</span>
          {!isSportsCalendar && row.in_milestone_set ? <span> · milestone</span> : null}
        </div>
      </div>
      {row.kalshi_url ? (
        <a
          className="calendar-live-explorer__link text-primary underline-offset-2 hover:underline"
          href={row.kalshi_url}
          rel="noopener noreferrer"
          target="_blank"
        >
          {row.kalshi_url}
        </a>
      ) : null}
      <CalendarMarketsTable markets={row.markets ?? []} />
      <p className="calendar-live-explorer__raw-label">Event JSON (raw)</p>
      <div className="calendar-live-explorer__raw-scroll">
        <pre className="calendar-live-explorer__raw-pre">{rawJson}</pre>
      </div>
    </article>
  )
}

export const CalendarEventArticle = memo(CalendarEventArticleInner)
