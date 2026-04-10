import { memo, useCallback, useState } from 'react'

import { Badge } from '@components/ui/badge'
import { Separator } from '@components/ui/separator'
import { Skeleton } from '@components/ui/skeleton'
import { HttpRequestSpecSection } from '@components/explorer/http/HttpRequestSpecSection'
import { useVisibleInterval } from '@hooks/useVisibleInterval'
import { fetchJsonObject } from '@shared/lib/fetchJsonObject'
import { toProxiedUrl } from '@shared/lib/apiProxy'
import { useExplorerUiStore } from '@stores/explorerUiStore'
import type { SportsCalendarLivePayload } from '@typings/calendarLiveTypes'
import type { ApiExplorerEndpoint } from '@typings/apiExplorerTypes'

import { CalendarEventArticle } from './CalendarEventArticle'
import './calendarLiveExplorer.css'

const POLL_MS = 2000

function SportsCalendarLiveExplorerPanelInner({ endpoint }: { endpoint: ApiExplorerEndpoint }) {
  const url = toProxiedUrl(endpoint.proxyPath)
  const touch = useExplorerUiStore((s) => s.touchEndpointFreshness)
  const [state, setState] = useState<
    | { status: 'loading' }
    | { status: 'error'; message: string }
    | { status: 'ok'; payload: SportsCalendarLivePayload }
  >({ status: 'loading' })

  const load = useCallback(async () => {
    const res = await fetchJsonObject<SportsCalendarLivePayload>(url)
    if (!res.ok) {
      setState({ status: 'error', message: res.message })
      return
    }
    touch(endpoint.id)
    setState({ status: 'ok', payload: res.data })
  }, [endpoint.id, touch, url])

  useVisibleInterval(load, POLL_MS)

  return (
    <section className="endpoint-panel" aria-labelledby={`sports-calendar-heading-${endpoint.id}`}>
      <div className="endpoint-panel__toolbar">
        <h2 id={`sports-calendar-heading-${endpoint.id}`} className="endpoint-panel__heading">
          Sports calendar LIVE
        </h2>
        <div className="endpoint-panel__badges">
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
      {state.status === 'loading' ? (
        <div className="endpoint-panel__skeletons" aria-busy="true">
          <Skeleton className="h-8 w-full max-w-md" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : null}
      {state.status === 'error' ? (
        <pre className="endpoint-panel__raw endpoint-panel__raw--error" role="alert">
          {state.message}
        </pre>
      ) : null}
      {state.status === 'ok' ? (
        <div>
          <h3 className="calendar-live-explorer__col-title">Formatted</h3>
          <p className="calendar-live-explorer__summary">
            {[
              `returned=${state.payload.returned ?? '—'}`,
              `filter=${state.payload.filter ?? '—'}`,
              `source=${state.payload.source ?? 'aggregation'}`,
              state.payload.sports_live_tz ? `tz=${state.payload.sports_live_tz}` : null,
              state.payload.milestone_live_event_tickers_count != null
                ? `milestone_live=${state.payload.milestone_live_event_tickers_count}`
                : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
          {state.payload.parity ? (
            <>
              <h4 className="calendar-live-explorer__parity-title">
                Parity vs calendar-live top N
              </h4>
              <pre className="calendar-live-explorer__parity-pre">
                {JSON.stringify(state.payload.parity, null, 2)}
              </pre>
            </>
          ) : null}
          {(state.payload.events ?? []).map((row, i) => (
            <CalendarEventArticle
              key={row.event_ticker != null ? String(row.event_ticker) : `ev-${i}`}
              row={row}
              variant="sports"
            />
          ))}
        </div>
      ) : null}
    </section>
  )
}

export const SportsCalendarLiveExplorerPanel = memo(SportsCalendarLiveExplorerPanelInner)
