export type SubmitStreamResponseResult =
	| { ok: true }
	| { ok: false; kind: 'stale_404' }
	| { ok: false; kind: 'error'; message: string }

export type SubmitStreamResponseBody = {
	request_id: string
	value: string
}

