export const LoaderTone = {
	Neutral: null,
	Error: 'error',
	Success: 'success'
} as const

export type LoaderTone = (typeof LoaderTone)[keyof typeof LoaderTone]
