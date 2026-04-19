import { API_EXPLORER_ENDPOINT_BY_PATHNAME } from '@constants/apiEndpointsConstants'

/** Collapse trailing slashes; empty becomes `/`. */
export function normalizeAppPathname(pathname: string): string {
  const n = pathname.replace(/\/+$/, '')
  return n === '' ? '/' : n
}

/** Active path matches `href` (e.g. `/health` or `/markets`), including trailing-slash variants. */
export function isExplorerSheetRouteActive(activePath: string, href: string): boolean {
  const a = normalizeAppPathname(activePath)
  const b = normalizeAppPathname(href)
  return a === b || a === `${b}/`
}

/** Header subtitle for the explorer shell from the normalized active path. */
export function getExplorerSheetSubtitle(activePath: string): string {
  const n = normalizeAppPathname(activePath)
  if (n === '/') {
    return 'Home'
  }
  const ep = API_EXPLORER_ENDPOINT_BY_PATHNAME.get(n)
  return ep?.label ?? activePath
}
