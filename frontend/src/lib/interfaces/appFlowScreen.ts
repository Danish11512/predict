export const AppFlowScreen = {
	Intro: 'intro',
	Loader: 'loader',
	LiveGames: 'liveGames',
	Error: 'error'
} as const

export type AppFlowScreen = (typeof AppFlowScreen)[keyof typeof AppFlowScreen]
