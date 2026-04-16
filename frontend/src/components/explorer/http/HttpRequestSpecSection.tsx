import { memo, useMemo } from 'react'

import { Separator } from '@components/ui/separator'
import '@styles/httpRequestSpecSection.css'

export type HttpRequestSpecSectionProps = {
  method: string
  /** Logical API path as documented, e.g. `/calendar-live` */
  apiPath: string
  /** Full URL used by fetch (includes `/api` proxy prefix). */
  fetchUrl: string
  queryParams?: Record<string, string | readonly string[]>
  requestHeaders: Record<string, string>
}

function formatQueryEntries(
  query: Record<string, string | readonly string[]> | undefined,
): [string, string][] {
  if (!query || Object.keys(query).length === 0) {
    return []
  }
  const out: [string, string][] = []
  for (const [k, v] of Object.entries(query)) {
    if (Array.isArray(v)) {
      for (const item of v) {
        out.push([k, item])
      }
    } else if (typeof v === 'string') {
      out.push([k, v])
    }
  }
  return out
}

function HttpRequestSpecSectionInner({
  method,
  apiPath,
  fetchUrl,
  queryParams,
  requestHeaders,
}: HttpRequestSpecSectionProps) {
  const queryEntries = useMemo(() => formatQueryEntries(queryParams), [queryParams])

  return (
    <section className="http-req" aria-labelledby="http-req-heading">
      <h2 id="http-req-heading" className="http-req__title">
        Request
      </h2>
      <dl className="http-req__dl">
        <div className="http-req__row">
          <dt>Method</dt>
          <dd>
            <code>{method}</code>
          </dd>
        </div>
        <div className="http-req__row">
          <dt>API path</dt>
          <dd>
            <code>{apiPath}</code>
          </dd>
        </div>
        <div className="http-req__row">
          <dt>Fetch URL</dt>
          <dd>
            <code className="http-req__url">{fetchUrl}</code>
          </dd>
        </div>
      </dl>
      <Separator className="my-3" />
      <h3 className="http-req__subtitle">Query parameters</h3>
      {queryEntries.length === 0 ? (
        <p className="http-req__empty text-muted-foreground text-sm">None</p>
      ) : (
        <div className="http-req__table-wrap">
          <table className="http-req__table">
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Value</th>
              </tr>
            </thead>
            <tbody>
              {queryEntries.map(([name, value], i) => (
                <tr key={`${name}:${i}`}>
                  <td>
                    <code>{name}</code>
                  </td>
                  <td>
                    <code>{value}</code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Separator className="my-3" />
      <h3 className="http-req__subtitle">Headers</h3>
      <div className="http-req__table-wrap">
        <table className="http-req__table">
          <thead>
            <tr>
              <th scope="col">Name</th>
              <th scope="col">Value</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(requestHeaders).map(([name, value]) => (
              <tr key={name}>
                <td>
                  <code>{name}</code>
                </td>
                <td>
                  <code>{value}</code>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export const HttpRequestSpecSection = memo(HttpRequestSpecSectionInner)
