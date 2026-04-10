/** String-union enums (erasable; compatible with `verbatimModuleSyntax` / `erasableSyntaxOnly`). */
export const ApiExplorerResponseKind = {
  Json: 'json',
  Html: 'html',
} as const

export type ApiExplorerResponseKind =
  (typeof ApiExplorerResponseKind)[keyof typeof ApiExplorerResponseKind]

export const ApiExplorerEndpointId = {
  Health: 'health',
  KalshiPortfolioBalance: 'kalshi-portfolio-balance',
  KalshiMarkets: 'kalshi-markets',
  KalshiCalendarLive: 'kalshi-calendar-live',
  KalshiCalendarLiveSports: 'kalshi-calendar-live-sports',
  KalshiWsSmoke: 'kalshi-ws-smoke',
  DevApiRequests: 'dev-api-requests',
  DevRequestsHtml: 'dev-requests-html',
  DevKalshiCalendarLiveHtml: 'dev-kalshi-calendar-live-html',
  DevKalshiCalendarLiveSportsHtml: 'dev-kalshi-calendar-live-sports-html',
  DevHubHtml: 'dev-hub-html',
} as const

export type ApiExplorerEndpointId =
  (typeof ApiExplorerEndpointId)[keyof typeof ApiExplorerEndpointId]

export interface ApiExplorerEndpoint {
  id: ApiExplorerEndpointId
  label: string
  /** Path segment(s) under layout — joined as `/a/b` */
  routerPath: string
  /** Backend path after proxy strip (e.g. `/kalshi/markets`) */
  proxyPath: string
  responseKind: ApiExplorerResponseKind
}

export type EndpointFetchState =
  | { status: 'loading' }
  | { status: 'ok'; bodyText: string; contentType: string }
  | { status: 'error'; message: string }

export interface EndpointResponsePanelProps {
  endpoint: ApiExplorerEndpoint
}

export interface JsonTablePreviewProps {
  text: string
}
