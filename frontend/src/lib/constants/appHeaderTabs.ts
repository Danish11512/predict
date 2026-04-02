import { TopNavTab } from '$lib/interfaces/topNavTab'
import type { AppHeaderTab } from '$lib/interfaces/appHeaderTab'

export const APP_HEADER_TABS: readonly AppHeaderTab[] = [
	{
		tab: TopNavTab.Dashboard,
		tabId: 'app-header-tab-dashboard',
		panelId: 'app-main-panel-dashboard',
		label: 'Dashboard'
	},
	{
		tab: TopNavTab.Analytics,
		tabId: 'app-header-tab-analytics',
		panelId: 'app-main-panel-analytics',
		label: 'Analytics'
	},
	{
		tab: TopNavTab.History,
		tabId: 'app-header-tab-history',
		panelId: 'app-main-panel-history',
		label: 'History'
	}
] as const

