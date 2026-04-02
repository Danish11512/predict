import type { LoaderTone } from '$lib/interfaces/loaderTone'

export type LoaderPageProps = {
	errorMessage?: string | null
	tone?: LoaderTone
	successDataTick?: number
	onReady?: () => void
}
