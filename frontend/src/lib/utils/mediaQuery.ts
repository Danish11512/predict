export type MediaQueryUnsubscribe = () => void

export const listenMediaQuery = (
	query: string,
	onChange: (matches: boolean) => void
): { matches: boolean; unsubscribe: MediaQueryUnsubscribe } => {
	const mql = typeof window !== 'undefined' ? window.matchMedia?.(query) : undefined
	const matches = mql?.matches ?? false
	onChange(matches)

	if (!mql) {
		return { matches, unsubscribe: () => {} }
	}

	const handler = (evt: MediaQueryListEvent) => onChange(evt.matches)
	mql.addEventListener('change', handler)
	return {
		matches,
		unsubscribe: () => mql.removeEventListener('change', handler)
	}
}

