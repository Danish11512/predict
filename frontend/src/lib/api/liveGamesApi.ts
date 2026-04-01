import type { LiveGamesPayload } from '$lib/streamTypes'

export async function fetchLiveGamesSnapshot(apiBase: string): Promise<LiveGamesPayload> {
	const url = `${apiBase.replace(/\/$/, '')}/live-games`
	const res = await fetch(url)
	if (!res.ok) {
		throw new Error(`GET /live-games failed: ${res.status}`)
	}
	const data = (await res.json()) as LiveGamesPayload
	return {
		updated_utc: data.updated_utc ?? null,
		games: Array.isArray(data.games) ? data.games : []
	}
}

