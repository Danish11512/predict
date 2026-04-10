import { memo } from 'react'

import { Badge } from '@components/ui/badge'
import { Separator } from '@components/ui/separator'
import { Skeleton } from '@components/ui/skeleton'
import { DataUpdatedAgo } from '@components/explorer/DataUpdatedAgo'
import { HttpRequestSpecSection } from '@components/explorer/http/HttpRequestSpecSection'
import { useCalendarLiveExplorerPoll } from '@hooks/useCalendarLiveExplorerPoll'
import { toProxiedUrl } from '@shared/lib/apiProxy'
import { useCalendarLiveExplorerStore } from '@stores/calendarLiveExplorerStore'
import { CalendarLiveExplorerEntryStatus } from '@typings/calendarLiveExplorerTypes'
import type { CalendarLivePayload } from '@typings/calendarLiveTypes'
import type { ApiExplorerEndpoint } from '@typings/apiExplorerTypes'

import { CalendarEventArticle } from './CalendarEventArticle'
import './calendarLiveExplorer.css'

function CalendarLiveExplorerPanelInner({ endpoint }: { endpoint: ApiExplorerEndpoint }) {
  const url = toProxiedUrl(endpoint.proxyPath)
  const entry = useCalendarLiveExplorerStore((s) => s.entries[endpoint.id])

  useCalendarLiveExplorerPoll<CalendarLivePayload>(endpoint)

  return (
    <section className="endpoint-panel" aria-labelledby={`calendar-live-heading-${endpoint.id}`}>
      <div className="endpoint-panel__toolbar">
        <h2 id={`calendar-live-heading-${endpoint.id}`} className="endpoint-panel__heading">
          Calendar LIVE
        </h2>
        <div className="endpoint-panel__badges">
          <DataUpdatedAgo
            updatedAt={
              entry?.status === CalendarLiveExplorerEntryStatus.Ok ? entry.updatedAt : undefined
            }
          />
          <Badge variant="secondary">JSON</Badge>
          <Badge variant="outline" className="endpoint-panel__url-badge">
            {url}
          </Badge>
        </div>
      </div>
      <Separator className="my-3" />
      <HttpRequestSpecSection
        method="GET"
        apiPath={endpoint.proxyPath}
        fetchUrl={url}
        queryParams={undefined}
        requestHeaders={{ Accept: 'application/json' }}
      />
      <Separator className="my-4" />
      {entry === undefined || entry.status === CalendarLiveExplorerEntryStatus.Loading ? (
        <div className="endpoint-panel__skeletons" aria-busy="true">
          <Skeleton className="h-8 w-full max-w-md" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : null}
      {entry?.status === CalendarLiveExplorerEntryStatus.Error ? (
        <pre className="endpoint-panel__raw endpoint-panel__raw--error" role="alert">
          {entry.message}
        </pre>
      ) : null}
      {entry?.status === CalendarLiveExplorerEntryStatus.Ok ? (
        <div>
          <h3 className="calendar-live-explorer__col-title">Formatted</h3>
          <p className="calendar-live-explorer__summary">
            returned={entry.payload.returned ?? '—'} · milestone_event_tickers_count=
            {entry.payload.milestone_event_tickers_count ?? '—'} ·
            milestone_live_event_tickers_count=
            {entry.payload.milestone_live_event_tickers_count != null
              ? entry.payload.milestone_live_event_tickers_count
              : '—'}
          </p>
          {(entry.payload.events ?? []).map((row, i) => (
            <CalendarEventArticle
              key={row.event_ticker != null ? String(row.event_ticker) : `ev-${i}`}
              row={row}
              isSportsCalendar={false}
            />
          ))}
        </div>
      ) : null}
    </section>
  )
}

export const CalendarLiveExplorerPanel = memo(CalendarLiveExplorerPanelInner)
