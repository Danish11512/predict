import { memo, useEffect, useMemo, useState } from 'react'

import { Badge } from '@components/ui/badge'
import { DataUpdatedAgo } from '@components/explorer/DataUpdatedAgo'
import { SportsCalendarLiveExplorerPanel } from '@components/explorer/calendar-live/SportsCalendarLiveExplorerPanel'
import { ScrollArea } from '@components/ui/scrollArea'
import { Separator } from '@components/ui/separator'
import { Skeleton } from '@components/ui/skeleton'
import { toProxiedUrl } from '@shared/lib/apiProxy'
import { devLog } from '@shared/lib/devLog'
import {
  ApiExplorerEndpointId,
  ApiExplorerResponseKind,
  EndpointFetchStatus,
  isExplorerResponseJson,
  type EndpointFetchState,
  type EndpointResponsePanelProps,
  type JsonTablePreviewProps,
} from '@typings/apiExplorerTypes'
import '@styles/endpointResponsePanel.css'

function formatJsonIfPossible(text: string): string | null {
  try {
    const parsed: unknown = JSON.parse(text)
    return JSON.stringify(parsed, null, 2)
  } catch (e) {
    devLog.debug('raw column: not JSON', { length: text.length, cause: e })
    return null
  }
}

function JsonTablePreview({ text }: JsonTablePreviewProps) {
  const parsed: unknown = useMemo(() => {
    try {
      return JSON.parse(text) as unknown
    } catch (e) {
      devLog.debug('table preview: JSON parse skipped', { length: text.length, cause: e })
      return null
    }
  }, [text])

  if (parsed === null || typeof parsed !== 'object' || parsed === null) {
    return (
      <p className="endpoint-panel__muted text-sm">Could not build a table from this response.</p>
    )
  }

  if (Array.isArray(parsed)) {
    if (parsed.length === 0) {
      return <p className="endpoint-panel__muted text-sm">Empty array.</p>
    }
    const first = parsed[0]
    if (first !== null && typeof first === 'object' && !Array.isArray(first)) {
      const keys = Object.keys(first as Record<string, unknown>)
      return (
        <div className="endpoint-panel__table-wrap">
          <table className="endpoint-panel__table">
            <thead>
              <tr>
                {keys.map((k) => (
                  <th key={k}>{k}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {parsed.slice(0, 50).map((row, i) => (
                <tr key={i}>
                  {keys.map((k) => (
                    <td key={k}>{formatCell((row as Record<string, unknown>)[k])}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {parsed.length > 50 ? (
            <p className="endpoint-panel__muted text-xs">Showing first 50 rows.</p>
          ) : null}
        </div>
      )
    }
    return (
      <p className="endpoint-panel__muted text-sm">
        Array of {parsed.length} item(s) — see raw JSON for full data.
      </p>
    )
  }

  const record = parsed as Record<string, unknown>
  const keys = Object.keys(record)
  return (
    <div className="endpoint-panel__table-wrap">
      <table className="endpoint-panel__table">
        <tbody>
          {keys.map((k) => (
            <tr key={k}>
              <th scope="row">{k}</th>
              <td>{formatCell(record[k])}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function formatCell(value: unknown): string {
  if (value === null || value === undefined) {
    return '—'
  }
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value)
    } catch (e) {
      devLog.warn('table cell stringify failed', { cause: e })
      return String(value)
    }
  }
  return String(value)
}

function GenericEndpointResponsePanel({ endpoint }: EndpointResponsePanelProps) {
  const [state, setState] = useState<EndpointFetchState>({
    status: EndpointFetchStatus.Loading,
  })
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | undefined>(undefined)

  const url = useMemo(() => toProxiedUrl(endpoint.proxyPath), [endpoint.proxyPath])

  useEffect(() => {
    const ac = new AbortController()
    const headers: HeadersInit = {}
    if (endpoint.responseKind === ApiExplorerResponseKind.Html) {
      headers.Accept = 'text/html'
    } else {
      headers.Accept = 'application/json'
    }
    void fetch(url, { headers, signal: ac.signal })
      .then(async (res) => {
        const bodyText = await res.text()
        const contentType = res.headers.get('content-type') ?? ''
        if (!res.ok) {
          devLog.warn('endpoint fetch HTTP error', {
            url,
            status: res.status,
            preview: bodyText.slice(0, 400),
          })
          setLastUpdatedAt(undefined)
          setState({
            status: EndpointFetchStatus.Error,
            message: `HTTP ${res.status} ${res.statusText}\n\n${bodyText.slice(0, 4000)}`,
          })
          return
        }
        setLastUpdatedAt(Date.now())
        setState({ status: EndpointFetchStatus.Ok, bodyText, contentType })
      })
      .catch((e: unknown) => {
        if (e instanceof DOMException && e.name === 'AbortError') {
          return
        }
        const message = e instanceof Error ? e.message : 'Request failed'
        devLog.warn('endpoint fetch failed', { url, message, cause: e })
        setLastUpdatedAt(undefined)
        setState({ status: EndpointFetchStatus.Error, message })
      })
    return () => ac.abort()
  }, [endpoint.responseKind, url])

  return (
    <section className="endpoint-panel" aria-labelledby={`endpoint-heading-${endpoint.id}`}>
      <div className="endpoint-panel__toolbar">
        <h2 id={`endpoint-heading-${endpoint.id}`} className="endpoint-panel__heading">
          Response
        </h2>
        <div className="endpoint-panel__badges">
          <DataUpdatedAgo
            updatedAt={state.status === EndpointFetchStatus.Ok ? lastUpdatedAt : undefined}
          />
          <Badge variant="secondary">{endpoint.responseKind.toUpperCase()}</Badge>
          <Badge variant="outline" className="endpoint-panel__url-badge">
            {url}
          </Badge>
        </div>
      </div>
      <Separator className="my-3" />
      {state.status === EndpointFetchStatus.Loading ? (
        <div className="endpoint-panel__skeletons" aria-busy="true">
          <Skeleton className="h-8 w-full max-w-md" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : null}
      {state.status === EndpointFetchStatus.Error ? (
        <pre className="endpoint-panel__raw endpoint-panel__raw--error" role="alert">
          {state.message}
        </pre>
      ) : null}
      {state.status === EndpointFetchStatus.Ok ? (
        <div className="endpoint-panel__columns">
          <div className="endpoint-panel__column">
            <h3 className="endpoint-panel__subheading">Formatted</h3>
            {isExplorerResponseJson(endpoint.responseKind) ? (
              <JsonTablePreview text={state.bodyText} />
            ) : (
              <ScrollArea className="endpoint-panel__html-preview">
                <pre className="endpoint-panel__raw">{state.bodyText.slice(0, 120_000)}</pre>
              </ScrollArea>
            )}
          </div>
          <div className="endpoint-panel__column">
            <h3 className="endpoint-panel__subheading">Raw</h3>
            <ScrollArea className="endpoint-panel__raw-scroll">
              <pre className="endpoint-panel__raw">
                {isExplorerResponseJson(endpoint.responseKind)
                  ? (formatJsonIfPossible(state.bodyText) ?? state.bodyText)
                  : state.bodyText}
              </pre>
            </ScrollArea>
          </div>
        </div>
      ) : null}
    </section>
  )
}

function EndpointResponsePanelSwitch({ endpoint }: EndpointResponsePanelProps) {
  if (endpoint.id === ApiExplorerEndpointId.KalshiCalendarLive) {
    return <SportsCalendarLiveExplorerPanel endpoint={endpoint} />
  }
  return <GenericEndpointResponsePanel endpoint={endpoint} />
}

export const EndpointResponsePanel = memo(EndpointResponsePanelSwitch)
