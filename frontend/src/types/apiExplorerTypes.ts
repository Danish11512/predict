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
  KalshiPortfolioSettlements: 'kalshi-portfolio-settlements',
  KalshiPortfolioFills: 'kalshi-portfolio-fills',
  KalshiMarkets: 'kalshi-markets',
  KalshiCalendarLive: 'kalshi-calendar-live',
  KalshiWsSmoke: 'kalshi-ws-smoke',
} as const

export type ApiExplorerEndpointId =
  (typeof ApiExplorerEndpointId)[keyof typeof ApiExplorerEndpointId]

export interface ApiExplorerEndpoint {
  id: ApiExplorerEndpointId
  label: string
  /** Path segment(s) under layout — joined as `/a/b` */
  routerPath: string
  /** Backend path after proxy strip (e.g. `/markets`) */
  proxyPath: string
  responseKind: ApiExplorerResponseKind
}

export const EndpointFetchStatus = {
  Loading: 'loading',
  Ok: 'ok',
  Error: 'error',
} as const

export type EndpointFetchStatus = (typeof EndpointFetchStatus)[keyof typeof EndpointFetchStatus]

export type EndpointFetchState =
  | { status: typeof EndpointFetchStatus.Loading }
  | { status: typeof EndpointFetchStatus.Ok; bodyText: string; contentType: string }
  | { status: typeof EndpointFetchStatus.Error; message: string }

export interface EndpointResponsePanelProps {
  endpoint: ApiExplorerEndpoint
}

export interface JsonTablePreviewProps {
  text: string
}

/** True when the explorer endpoint expects JSON in the UI (vs HTML preview). */
export const isExplorerResponseJson = (kind: ApiExplorerResponseKind): boolean =>
  kind === ApiExplorerResponseKind.Json
