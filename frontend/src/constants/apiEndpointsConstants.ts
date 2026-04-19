import {
  ApiExplorerEndpointId,
  ApiExplorerResponseKind,
  type ApiExplorerEndpoint,
} from '@typings/apiExplorerTypes'

/** Ordered nav + fetch registry. Proxy base is `/api` (Vite); paths match FastAPI. */

export const API_EXPLORER_ENDPOINT_HEALTH: ApiExplorerEndpoint = {
  id: ApiExplorerEndpointId.Health,
  label: 'GET /health',
  routerPath: 'health',
  proxyPath: '/health',
  responseKind: ApiExplorerResponseKind.Json,
}

export const API_EXPLORER_ENDPOINT_KALSHI_PORTFOLIO_BALANCE: ApiExplorerEndpoint = {
  id: ApiExplorerEndpointId.KalshiPortfolioBalance,
  label: 'GET /portfolio/balance',
  routerPath: 'portfolio/balance',
  proxyPath: '/portfolio/balance',
  responseKind: ApiExplorerResponseKind.Json,
}

export const API_EXPLORER_ENDPOINT_KALSHI_PORTFOLIO_SETTLEMENTS: ApiExplorerEndpoint = {
  id: ApiExplorerEndpointId.KalshiPortfolioSettlements,
  label: 'GET /portfolio/settlements',
  routerPath: 'portfolio/settlements',
  proxyPath: '/portfolio/settlements',
  responseKind: ApiExplorerResponseKind.Json,
}

export const API_EXPLORER_ENDPOINT_KALSHI_PORTFOLIO_FILLS: ApiExplorerEndpoint = {
  id: ApiExplorerEndpointId.KalshiPortfolioFills,
  label: 'GET /portfolio/fills',
  routerPath: 'portfolio/fills',
  proxyPath: '/portfolio/fills',
  responseKind: ApiExplorerResponseKind.Json,
}

export const API_EXPLORER_ENDPOINT_KALSHI_MARKETS: ApiExplorerEndpoint = {
  id: ApiExplorerEndpointId.KalshiMarkets,
  label: 'GET /markets',
  routerPath: 'markets',
  proxyPath: '/markets',
  responseKind: ApiExplorerResponseKind.Json,
}

export const API_EXPLORER_ENDPOINT_KALSHI_CALENDAR_LIVE: ApiExplorerEndpoint = {
  id: ApiExplorerEndpointId.KalshiCalendarLive,
  label: 'GET /calendar-live',
  routerPath: 'calendar-live',
  proxyPath: '/calendar-live',
  responseKind: ApiExplorerResponseKind.Json,
}

export const API_EXPLORER_ENDPOINT_KALSHI_WS_SMOKE: ApiExplorerEndpoint = {
  id: ApiExplorerEndpointId.KalshiWsSmoke,
  label: 'GET /ws/smoke',
  routerPath: 'ws/smoke',
  proxyPath: '/ws/smoke',
  responseKind: ApiExplorerResponseKind.Json,
}

export const API_EXPLORER_ENDPOINTS: readonly ApiExplorerEndpoint[] = [
  API_EXPLORER_ENDPOINT_HEALTH,
  API_EXPLORER_ENDPOINT_KALSHI_PORTFOLIO_BALANCE,
  API_EXPLORER_ENDPOINT_KALSHI_PORTFOLIO_SETTLEMENTS,
  API_EXPLORER_ENDPOINT_KALSHI_PORTFOLIO_FILLS,
  API_EXPLORER_ENDPOINT_KALSHI_MARKETS,
  API_EXPLORER_ENDPOINT_KALSHI_CALENDAR_LIVE,
  API_EXPLORER_ENDPOINT_KALSHI_WS_SMOKE,
]

/** GET /events/{event_ticker}; not listed in explorer nav but shares proxy base. */
export const KALSHI_EVENTS_PROXY_PATH = '/events'

/** Pathnames (leading slash) where calendar LIVE should poll besides its explorer tab. */
export const CALENDAR_LIVE_POLL_EXTRA_PATHS: readonly string[] = ['/']

/** Normalized pathname (e.g. `/health`) → explorer endpoint config. */
export const API_EXPLORER_ENDPOINT_BY_PATHNAME: ReadonlyMap<string, ApiExplorerEndpoint> = new Map(
  API_EXPLORER_ENDPOINTS.map((e) => [`/${e.routerPath}`, e]),
)
