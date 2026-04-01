import { writable } from 'svelte/store'

export enum TopNavTab {
	Dashboard = 'dashboard',
	Analytics = 'analytics',
	History = 'history'
}

export const topNavTab = writable<TopNavTab>(TopNavTab.Dashboard)

