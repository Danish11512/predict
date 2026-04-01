import type { SubmitStreamResponseBody, SubmitStreamResponseResult } from '$lib/interfaces/streamResponse'

export const submitStreamResponse = async (
	apiBase: string,
	body: SubmitStreamResponseBody
): Promise<SubmitStreamResponseResult> => {
	const url = `${apiBase.replace(/\/$/, '')}/stream/response`
	const res = await fetch(url, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body)
	})
	if (res.status === 404) {
		return { ok: false, kind: 'stale_404' }
	}
	if (!res.ok) {
		const text = await res.text().catch(() => '')
		return { ok: false, kind: 'error', message: text || `HTTP ${res.status}` }
	}
	return { ok: true }
}

