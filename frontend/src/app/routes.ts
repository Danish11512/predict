import { type RouteConfig, index, layout, route } from '@react-router/dev/routes'

export default [
  layout('routes/explorerLayout.tsx', [
    index('routes/home.tsx'),
    route('health', 'routes/endpoint.tsx', { id: 'routes/endpoint/health' }),
    route('kalshi/portfolio/balance', 'routes/endpoint.tsx', {
      id: 'routes/endpoint/kalshi-portfolio-balance',
    }),
    route('kalshi/markets', 'routes/endpoint.tsx', { id: 'routes/endpoint/kalshi-markets' }),
    route('kalshi/calendar-live', 'routes/endpoint.tsx', {
      id: 'routes/endpoint/kalshi-calendar-live',
    }),
    route('kalshi/calendar-live-sports', 'routes/endpoint.tsx', {
      id: 'routes/endpoint/kalshi-calendar-live-sports',
    }),
    route('kalshi/ws/smoke', 'routes/endpoint.tsx', { id: 'routes/endpoint/kalshi-ws-smoke' }),
    route('*', 'routes/catchAllRedirect.tsx', { id: 'routes/catch-all' }),
  ]),
] satisfies RouteConfig
