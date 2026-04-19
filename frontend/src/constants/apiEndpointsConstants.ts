import {
  ApiExplorerEndpointId,
  ApiExplorerResponseKind,
  type ApiExplorerEndpoint,
} from '@typings/apiExplorerTypes'

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
    label: 'GET /portfolio/balance',
    routerPath: 'portfolio/balance',
    proxyPath: '/portfolio/balance',
    responseKind: ApiExplorerResponseKind.Json,
  },
  {
    id: ApiExplorerEndpointId.KalshiPortfolioSettlements,
    label: 'GET /portfolio/settlements',
    routerPath: 'portfolio/settlements',
    proxyPath: '/portfolio/settlements',
    responseKind: ApiExplorerResponseKind.Json,
  },
  {
    id: ApiExplorerEndpointId.KalshiPortfolioFills,
    label: 'GET /portfolio/fills',
    routerPath: 'portfolio/fills',
    proxyPath: '/portfolio/fills',
    responseKind: ApiExplorerResponseKind.Json,
  },
  {
    id: ApiExplorerEndpointId.KalshiMarkets,
    label: 'GET /markets',
    routerPath: 'markets',
    proxyPath: '/markets',
    responseKind: ApiExplorerResponseKind.Json,
  },
  {
    id: ApiExplorerEndpointId.KalshiCalendarLive,
    label: 'GET /calendar-live',
    routerPath: 'calendar-live',
    proxyPath: '/calendar-live',
    responseKind: ApiExplorerResponseKind.Json,
  },
  {
    id: ApiExplorerEndpointId.KalshiWsSmoke,
    label: 'GET /ws/smoke',
    routerPath: 'ws/smoke',
    proxyPath: '/ws/smoke',
    responseKind: ApiExplorerResponseKind.Json,
  },
]

export const KALSHI_CALENDAR_LIVE_ENDPOINT = API_EXPLORER_ENDPOINTS.find(
  (e) => e.id === ApiExplorerEndpointId.KalshiCalendarLive,
)!

/** Pathnames (leading slash) where calendar LIVE should poll besides its explorer tab. */
export const CALENDAR_LIVE_POLL_EXTRA_PATHS: readonly string[] = ['/']

const byRouterPath = new Map<string, ApiExplorerEndpoint>()
for (const e of API_EXPLORER_ENDPOINTS) {
  byRouterPath.set(`/${e.routerPath}`, e)
}

export function getEndpointByPathname(pathname: string): ApiExplorerEndpoint | undefined {
  const normalized = pathname.replace(/\/+$/, '') || '/'
  return byRouterPath.get(normalized === '' ? '/' : normalized)
}
