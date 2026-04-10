import { memo, useCallback, useState } from 'react'

import { Badge } from '@components/ui/badge'
import { Separator } from '@components/ui/separator'
import { Skeleton } from '@components/ui/skeleton'
import { HttpRequestSpecSection } from '@components/explorer/http/HttpRequestSpecSection'
import { useVisibleInterval } from '@hooks/useVisibleInterval'
import { fetchJsonObject } from '@shared/lib/fetchJsonObject'
import { toProxiedUrl } from '@shared/lib/apiProxy'
import { useExplorerUiStore } from '@stores/explorerUiStore'
import type { CalendarLivePayload } from '@typings/calendarLiveTypes'
import type { ApiExplorerEndpoint } from '@typings/apiExplorerTypes'

import { CalendarEventArticle } from './CalendarEventArticle'
import './calendarLiveExplorer.css'

const POLL_MS = 2000

function CalendarLiveExplorerPanelInner({ endpoint }: { endpoint: ApiExplorerEndpoint }) {
  const url = toProxiedUrl(endpoint.proxyPath)
  const touch = useExplorerUiStore((s) => s.touchEndpointFreshness)
  const [state, setState] = useState<
    | { status: 'loading' }
    | { status: 'error'; message: string }
    | { status: 'ok'; payload: CalendarLivePayload }
  >({ status: 'loading' })

  const load = useCallback(async () => {
    const res = await fetchJsonObject<CalendarLivePayload>(url)
    if (!res.ok) {
      setState({ status: 'error', message: res.message })
      return
    }
    touch(endpoint.id)
    setState({ status: 'ok', payload: res.data })
  }, [endpoint.id, touch, url])

  useVisibleInterval(load, POLL_MS)

  return (
    <section className="endpoint-panel" aria-labelledby={`calendar-live-heading-${endpoint.id}`}>
      <div className="endpoint-panel__toolbar">
        <h2 id={`calendar-live-heading-${endpoint.id}`} className="endpoint-panel__heading">
          Calendar LIVE
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
            returned={state.payload.returned ?? '—'} · milestone_event_tickers_count=
            {state.payload.milestone_event_tickers_count ?? '—'} ·
            milestone_live_event_tickers_count=
            {state.payload.milestone_live_event_tickers_count != null
              ? state.payload.milestone_live_event_tickers_count
              : '—'}
          </p>
          {(state.payload.events ?? []).map((row, i) => (
            <CalendarEventArticle
              key={row.event_ticker != null ? String(row.event_ticker) : `ev-${i}`}
              row={row}
              variant="general"
            />
          ))}
        </div>
      ) : null}
    </section>
  )
}

export const CalendarLiveExplorerPanel = memo(CalendarLiveExplorerPanelInner)
