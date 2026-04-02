export const APP_HEADER_DOM_ID = {
	root: 'app-header-root',
	dropup: 'app-header-dropup'
} as const

export const APP_HEADER_MEDIA_QUERY = {
	compactWidth: '(max-width: 1024px)'
} as const

export type AppHeaderDomElementId = (typeof APP_HEADER_DOM_ID)[keyof typeof APP_HEADER_DOM_ID]
