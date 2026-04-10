import {
  ApiExplorerEndpointId,
  ApiExplorerResponseKind,
  type ApiExplorerEndpoint,
} from '@typings/apiExplorerTypes'

/** React Router path (no leading slash) — default tab: sports calendar LIVE */
export const DEFAULT_EXPLORER_PATH = '/kalshi/calendar-live-sports'

/** Ordered nav + fetch registry. Proxy base is `/api` (Vite); paths match FastAPI. */
export const API_EXPLORER_ENDPOINTS: readonly ApiExplorerEndpoint[] = [
  {
    id: ApiExplorerEndpointId.Health,
    label: 'GET /health',
    routerPath: 'health',
    proxyPath: '/health',
    responseKind: ApiExplorerResponseKind.Json,
  },
  {
    id: ApiExplorerEndpointId.KalshiPortfolioBalance,
    label: 'GET /kalshi/portfolio/balance',
    routerPath: 'kalshi/portfolio/balance',
    proxyPath: '/kalshi/portfolio/balance',
    responseKind: ApiExplorerResponseKind.Json,
  },
  {
    id: ApiExplorerEndpointId.KalshiMarkets,
    label: 'GET /kalshi/markets',
    routerPath: 'kalshi/markets',
    proxyPath: '/kalshi/markets',
    responseKind: ApiExplorerResponseKind.Json,
  },
  {
    id: ApiExplorerEndpointId.KalshiCalendarLive,
    label: 'GET /kalshi/calendar-live',
    routerPath: 'kalshi/calendar-live',
    proxyPath: '/kalshi/calendar-live',
    responseKind: ApiExplorerResponseKind.Json,
  },
  {
    id: ApiExplorerEndpointId.KalshiCalendarLiveSports,
    label: 'GET /kalshi/calendar-live-sports',
    routerPath: 'kalshi/calendar-live-sports',
    proxyPath: '/kalshi/calendar-live-sports',
    responseKind: ApiExplorerResponseKind.Json,
  },
  {
    id: ApiExplorerEndpointId.KalshiWsSmoke,
    label: 'GET /kalshi/ws/smoke',
    routerPath: 'kalshi/ws/smoke',
    proxyPath: '/kalshi/ws/smoke',
    responseKind: ApiExplorerResponseKind.Json,
  },
]

const byRouterPath = new Map<string, ApiExplorerEndpoint>()
for (const e of API_EXPLORER_ENDPOINTS) {
  byRouterPath.set(`/${e.routerPath}`, e)
}

export function getEndpointByPathname(pathname: string): ApiExplorerEndpoint | undefined {
  const normalized = pathname.replace(/\/+$/, '') || '/'
  return byRouterPath.get(normalized === '' ? '/' : normalized)
}
