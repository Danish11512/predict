import { writable } from 'svelte/store'
import { TopNavTab } from '$lib/interfaces/topNavTab'

export const topNavTab = writable<TopNavTab>(TopNavTab.Dashboard)

