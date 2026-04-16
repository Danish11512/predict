import { type RouteConfig, index, layout, route } from '@react-router/dev/routes'

export default [
  layout('routes/explorerLayout.tsx', [
    index('routes/home.tsx'),
    route('health', 'routes/endpoint.tsx', { id: 'routes/endpoint/health' }),
    route('portfolio/balance', 'routes/endpoint.tsx', {
      id: 'routes/endpoint/kalshi-portfolio-balance',
    }),
    route('markets', 'routes/endpoint.tsx', { id: 'routes/endpoint/kalshi-markets' }),
    route('calendar-live', 'routes/endpoint.tsx', {
      id: 'routes/endpoint/kalshi-calendar-live',
    }),
    route('ws/smoke', 'routes/endpoint.tsx', { id: 'routes/endpoint/kalshi-ws-smoke' }),
    route('*', 'routes/catchAllRedirect.tsx', { id: 'routes/catch-all' }),
  ]),
] satisfies RouteConfig
