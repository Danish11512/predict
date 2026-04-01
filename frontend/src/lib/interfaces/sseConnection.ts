import type {
	LiveGamesPayload,
	StreamErrorEvent,
	StreamProgressEvent,
	StreamRequestEvent
} from '$lib/interfaces/streamTypes'

export type StreamHandlers = {
	onRequest?: (ev: StreamRequestEvent) => void
	onProgress?: (ev: StreamProgressEvent) => void
	onData?: (payload: LiveGamesPayload) => void
	onError?: (ev: StreamErrorEvent) => void
	onOpen?: () => void
}

