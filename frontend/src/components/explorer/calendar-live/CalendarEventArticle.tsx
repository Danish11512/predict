import { memo, useMemo } from 'react'

import type { CalendarLiveEventRow } from '@typings/calendarLiveTypes'

import { CalendarMarketsTable } from './CalendarMarketsTable'

export type CalendarEventArticleProps = {
  row: CalendarLiveEventRow
  /** When true, use sports LIVE title and badge styling. */
  isSportsCalendar: boolean
}

function buildSportsTitle(row: CalendarLiveEventRow): string {
  const heading = String(row.title ?? row.event_ticker ?? '')
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

function CalendarEventArticleInner({ row, isSportsCalendar }: CalendarEventArticleProps) {
  const title = isSportsCalendar
    ? buildSportsTitle(row)
    : String(row.title ?? row.event_ticker ?? '')

  const rawJson = useMemo(() => {
    try {
      return JSON.stringify(row.event ?? {}, null, 2)
    } catch {
      return '{}'
    }
  }, [row.event])

  const liveTitle =
    isSportsCalendar && row.live_title != null && String(row.live_title).length > 0
      ? String(row.live_title)
      : null

  return (
    <article className="calendar-live-explorer__article">
      <h2 className="calendar-live-explorer__article-title">{title}</h2>
      {liveTitle ? <div className="calendar-live-explorer__live-title">{liveTitle}</div> : null}
      <div className="calendar-live-explorer__meta">
        <code>{row.event_ticker ?? ''}</code>
        <span> · series </span>
        <code>{row.series_ticker ?? ''}</code>
        <span> · source {row.source ?? ''}</span>
        {!isSportsCalendar && row.in_milestone_set ? <span> · milestone</span> : null}
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
