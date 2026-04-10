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
import type { SportsCalendarLivePayload } from '@typings/calendarLiveTypes'
import type { ApiExplorerEndpoint } from '@typings/apiExplorerTypes'

import { CalendarEventArticle } from './CalendarEventArticle'
import './calendarLiveExplorer.css'

function SportsCalendarLiveExplorerPanelInner({ endpoint }: { endpoint: ApiExplorerEndpoint }) {
  const url = toProxiedUrl(endpoint.proxyPath)
  const entry = useCalendarLiveExplorerStore((s) => s.entries[endpoint.id])

  useCalendarLiveExplorerPoll<SportsCalendarLivePayload>(endpoint)

  return (
    <section className="endpoint-panel" aria-labelledby={`sports-calendar-heading-${endpoint.id}`}>
      <div className="endpoint-panel__toolbar">
        <h2 id={`sports-calendar-heading-${endpoint.id}`} className="endpoint-panel__heading">
          Sports calendar LIVE
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
        <SportsCalendarLiveOkBody payload={entry.payload as SportsCalendarLivePayload} />
      ) : null}
    </section>
  )
}

function SportsCalendarLiveOkBody({ payload }: { payload: SportsCalendarLivePayload }) {
  return (
    <div>
      <h3 className="calendar-live-explorer__col-title">Formatted</h3>
      <p className="calendar-live-explorer__summary">
        {[
          `returned=${payload.returned ?? '—'}`,
          `filter=${payload.filter ?? '—'}`,
          `source=${payload.source ?? 'aggregation'}`,
          payload.sports_live_tz ? `tz=${payload.sports_live_tz}` : null,
          payload.milestone_live_event_tickers_count != null
            ? `milestone_live=${payload.milestone_live_event_tickers_count}`
            : null,
        ]
          .filter(Boolean)
          .join(' · ')}
      </p>
      {payload.parity ? (
        <>
          <h4 className="calendar-live-explorer__parity-title">Parity vs calendar-live top N</h4>
          <pre className="calendar-live-explorer__parity-pre">
            {JSON.stringify(payload.parity, null, 2)}
          </pre>
        </>
      ) : null}
      {(payload.events ?? []).map((row, i) => (
        <CalendarEventArticle
          key={row.event_ticker != null ? String(row.event_ticker) : `ev-${i}`}
          row={row}
          isSportsCalendar
        />
      ))}
    </div>
  )
}

export const SportsCalendarLiveExplorerPanel = memo(SportsCalendarLiveExplorerPanelInner)
