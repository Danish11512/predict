import { writable } from 'svelte/store'
import type { LiveGamesPayload } from '$lib/streamTypes'

export const liveGamesData = writable<LiveGamesPayload | null>(null)
export const hadLiveGames = writable(false)

