/**
 * Builds a query string from key/values; omits undefined.
 */
export function buildQueryString(params: Record<string, string | number | undefined>): string {
  const u = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined) {
      continue
    }
    u.set(k, String(v))
  }
  const q = u.toString()
  return q ? `?${q}` : ''
}
