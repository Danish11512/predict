import type { TopNavTab } from '$lib/interfaces/topNavTab'

export type AppHeaderTab = Readonly<{
	tab: TopNavTab
	tabId: string
	panelId: string
	label: string
}>

