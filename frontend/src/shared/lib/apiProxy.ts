/** Prefix for Vite proxy to FastAPI (see `vite.config.ts`). */
export const API_PROXY_PREFIX = '/api'

export function toProxiedUrl(proxyPath: string): string {
  if (proxyPath === '/') {
    return `${API_PROXY_PREFIX}/`
  }
  return `${API_PROXY_PREFIX}${proxyPath.startsWith('/') ? '' : '/'}${proxyPath.replace(/^\//, '')}`
}
