export type FetchJsonObjectResult<T> = { ok: true; data: T } | { ok: false; message: string }

/**
 * GET/POST helper: reads JSON object responses and surfaces FastAPI-style `{ detail }` on errors.
 */
export async function fetchJsonObject<T>(
  url: string,
  init?: RequestInit,
): Promise<FetchJsonObjectResult<T>> {
  const r = await fetch(url, {
    ...init,
    cache: 'no-store',
    headers: { Accept: 'application/json' },
  })
  const text = await r.text()
  let parsed: unknown = null
  try {
    parsed = text ? JSON.parse(text) : null
  } catch {
    parsed = null
  }
  if (!r.ok) {
    let detail = ''
    if (parsed && typeof parsed === 'object' && parsed !== null && 'detail' in parsed) {
      const d = (parsed as { detail?: unknown }).detail
      detail = typeof d === 'string' ? d : JSON.stringify(d)
    } else if (text) {
      detail = text.slice(0, 1200)
    }
    return {
      ok: false,
      message: `HTTP ${r.status} ${r.statusText}${detail ? `: ${detail}` : ''}`,
    }
  }
  if (parsed === null || typeof parsed !== 'object') {
    return { ok: false, message: 'Expected JSON object from server' }
  }
  return { ok: true, data: parsed as T }
}
