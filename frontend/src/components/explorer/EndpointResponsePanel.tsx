import { memo, useEffect, useMemo, useState } from 'react'

import { Badge } from '@components/ui/badge'
import { ScrollArea } from '@components/ui/scrollArea'
import { Separator } from '@components/ui/separator'
import { Skeleton } from '@components/ui/skeleton'
import { toProxiedUrl } from '@shared/lib/apiProxy'
import {
  ApiExplorerResponseKind,
  type EndpointFetchState,
  type EndpointResponsePanelProps,
  type JsonTablePreviewProps,
} from '@typings/apiExplorerTypes'
import '@styles/endpointResponsePanel.css'

function formatJsonIfPossible(text: string): string | null {
  try {
    const parsed: unknown = JSON.parse(text)
    return JSON.stringify(parsed, null, 2)
  } catch {
    return null
  }
}

function JsonTablePreview({ text }: JsonTablePreviewProps) {
  const parsed: unknown = useMemo(() => {
    try {
      return JSON.parse(text) as unknown
    } catch {
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
    } catch {
      return String(value)
    }
  }
  return String(value)
}

function EndpointResponsePanelInner({ endpoint }: EndpointResponsePanelProps) {
  const [state, setState] = useState<EndpointFetchState>({ status: 'loading' })

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
          setState({
            status: 'error',
            message: `HTTP ${res.status} ${res.statusText}\n\n${bodyText.slice(0, 4000)}`,
          })
          return
        }
        setState({ status: 'ok', bodyText, contentType })
      })
      .catch((e: unknown) => {
        if (e instanceof DOMException && e.name === 'AbortError') {
          return
        }
        const message = e instanceof Error ? e.message : 'Request failed'
        setState({ status: 'error', message })
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
          <Badge variant="secondary">{endpoint.responseKind.toUpperCase()}</Badge>
          <Badge variant="outline" className="endpoint-panel__url-badge">
            {url}
          </Badge>
        </div>
      </div>
      <Separator className="my-3" />
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
        <div className="endpoint-panel__columns">
          <div className="endpoint-panel__column">
            <h3 className="endpoint-panel__subheading">Formatted</h3>
            {endpoint.responseKind === ApiExplorerResponseKind.Json ? (
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
                {endpoint.responseKind === ApiExplorerResponseKind.Json
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

export const EndpointResponsePanel = memo(EndpointResponsePanelInner)
