import { devLog } from '@shared/lib/devLog'

export type FetchJsonObjectResult<T> = { ok: true; data: T } | { ok: false; message: string }

export async function fetchJsonObject<T>(
  url: string,
  init?: RequestInit,
): Promise<FetchJsonObjectResult<T>> {
  let r: Response
  try {
    r = await fetch(url, {
      ...init,
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Network request failed'
    devLog.warn('fetch failed', { url, message })
    return { ok: false, message }
  }

  const text = await r.text()
  let parsed: unknown = null
  try {
    parsed = text ? JSON.parse(text) : null
  } catch (e) {
    if (r.ok) {
      devLog.warn('JSON parse failed', { url, snippet: text.slice(0, 200), cause: e })
    } else {
      devLog.debug('HTTP error body not JSON', { url, status: r.status })
    }
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
    const message = `HTTP ${r.status} ${r.statusText}${detail ? `: ${detail}` : ''}`
    devLog.warn('HTTP error response', { url, message })
    return { ok: false, message }
  }

  if (parsed === null || typeof parsed !== 'object') {
    devLog.warn('Expected JSON object', { url, got: parsed === null ? 'null' : typeof parsed })
    return { ok: false, message: 'Expected JSON object from server' }
  }

  return { ok: true, data: parsed as T }
}
