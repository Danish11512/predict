export type Theme = 'light' | 'dark'

export const resolveInitialTheme = (): Theme => {
	const stored = typeof localStorage !== 'undefined' ? localStorage.getItem('theme') : null
	if (stored === 'light' || stored === 'dark') return stored

	const prefersDark = typeof window !== 'undefined'
		? window.matchMedia?.('(prefers-color-scheme: dark)')?.matches
		: false

	return prefersDark ? 'dark' : 'light'
}

export const applyThemeToDocument = (theme: Theme) => {
	if (typeof document === 'undefined') return
	document.documentElement.dataset.theme = theme
}

export const persistTheme = (theme: Theme) => {
	if (typeof localStorage === 'undefined') return
	localStorage.setItem('theme', theme)
}

