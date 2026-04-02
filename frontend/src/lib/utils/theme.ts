import { Theme } from '$lib/interfaces/theme'
import { PREFERS_COLOR_SCHEME_DARK_MQL, THEME_STORAGE_KEY } from '$lib/constants/theme'

export { Theme } from '$lib/interfaces/theme'

export const isDarkTheme = (theme: Theme): boolean => theme === Theme.Dark

export const themeFromIsDark = (isDark: boolean): Theme => (isDark ? Theme.Dark : Theme.Light)

export const resolveInitialTheme = (): Theme => {
	const stored = typeof localStorage !== 'undefined' ? localStorage.getItem(THEME_STORAGE_KEY) : null
	if (stored === Theme.Light || stored === Theme.Dark) return stored

	const prefersDark = typeof window !== 'undefined'
		? window.matchMedia?.(PREFERS_COLOR_SCHEME_DARK_MQL)?.matches
		: false

	return prefersDark ? Theme.Dark : Theme.Light
}

export const applyThemeToDocument = (theme: Theme) => {
	if (typeof document === 'undefined') return
	document.documentElement.dataset.theme = theme
}

export const persistTheme = (theme: Theme) => {
	if (typeof localStorage === 'undefined') return
	localStorage.setItem(THEME_STORAGE_KEY, theme)
}
