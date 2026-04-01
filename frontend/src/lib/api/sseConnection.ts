import type { StreamHandlers } from '$lib/interfaces/sseConnection'
import type {
	LiveGamesPayload,
	StreamErrorEvent,
	StreamProgressEvent,
	StreamRequestEvent
} from '$lib/interfaces/streamTypes'

const parseJson = <T>(raw: string, label: string): T | null => {
	void label
	try {
		return JSON.parse(raw) as T
	} catch {
		return null
	}
}

/**
 * Single SSE subscription using EventSource. Call close() before opening another connection.
 */
export const openStream = (
	apiBase: string,
	handlers: StreamHandlers
): { close: () => void } => {
	const base = apiBase.replace(/\/$/, '')
	const url = `${base}/stream`
	const es = new EventSource(url)

	es.addEventListener('open', () => {
		handlers.onOpen?.()
	})

	es.addEventListener('request', (e: MessageEvent) => {
		const parsed = parseJson<StreamRequestEvent>(e.data, 'request')
		if (parsed?.request_id) handlers.onRequest?.(parsed)
	})

	es.addEventListener('progress', (e: MessageEvent) => {
		const parsed = parseJson<StreamProgressEvent>(e.data, 'progress')
		if (parsed && typeof parsed.percent === 'number') handlers.onProgress?.(parsed)
	})

	es.addEventListener('data', (e: MessageEvent) => {
		const parsed = parseJson<LiveGamesPayload>(e.data, 'data')
		if (parsed && Array.isArray(parsed.games)) {
			handlers.onData?.({
				updated_utc: parsed.updated_utc ?? null,
				games: parsed.games
			})
		}
	})

	es.addEventListener('error', (e: Event) => {
		if (e instanceof MessageEvent && typeof e.data === 'string' && e.data) {
			const parsed = parseJson<StreamErrorEvent>(e.data, 'error')
			if (parsed?.code) handlers.onError?.(parsed)
		}
	})

	return {
		close: () => {
			es.close()
		}
	}
}

