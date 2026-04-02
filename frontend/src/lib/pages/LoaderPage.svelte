<script lang="ts">
	import { onDestroy, onMount } from 'svelte'
	import { LOADER_GLYPH_SETS, LOADER_LIVE_GAMES_SUCCESS_DELAY_MS, LOADER_ROTATE_INTERVAL_MS } from '$lib/constants/loader'
	import { LATIN_GLYPHS } from '$lib/constants/glyphs'
	import type { LoaderPageProps } from '$lib/interfaces/loaderPage'
	import { LoaderTone } from '$lib/interfaces/loaderTone'

	let {
		errorMessage = null,
		tone = LoaderTone.Neutral,
		successDataTick = 0,
		onReady
	}: LoaderPageProps = $props()

	const randomGlyph = (): string => {
		const set =
			LOADER_GLYPH_SETS[Math.floor(Math.random() * LOADER_GLYPH_SETS.length)] ?? LATIN_GLYPHS
		return set[Math.floor(Math.random() * set.length)] ?? '•'
	}

	let glyph = $state<string>(randomGlyph())
	let intervalId: ReturnType<typeof setInterval> | null = null
	let readyTimeoutId = $state<ReturnType<typeof setTimeout> | null>(null)
	let lastHandledTick = $state<number>(0)
	let successDelayActive = $derived(tone === LoaderTone.Success && !!readyTimeoutId)

	const stopRotation = () => {
		if (intervalId) {
			clearInterval(intervalId)
			intervalId = null
		}
	}

	const clearReadyTimeout = () => {
		if (readyTimeoutId) {
			clearTimeout(readyTimeoutId)
			readyTimeoutId = null
		}
	}

	$effect(() => {
		if (tone !== LoaderTone.Success) {
			clearReadyTimeout()
			lastHandledTick = successDataTick
			return
		}

		if (successDataTick <= lastHandledTick) return
		lastHandledTick = successDataTick

		if (readyTimeoutId) return
		readyTimeoutId = setTimeout(() => {
			readyTimeoutId = null
			onReady?.()
		}, LOADER_LIVE_GAMES_SUCCESS_DELAY_MS)
	})

	onMount(() => {
		intervalId = setInterval(() => {
			glyph = randomGlyph()
		}, LOADER_ROTATE_INTERVAL_MS)
	})

	onDestroy(() => {
		clearReadyTimeout()
		stopRotation()
	})
</script>

<div class="loader">
	<div
		class="loader__glyph"
		class:loader__glyph--error={tone === LoaderTone.Error || !!errorMessage}
		class:loader__glyph--success={successDelayActive && !errorMessage}
		aria-hidden="true"
	>
		{glyph}
	</div>
	{#if errorMessage}
		<p class="loader__error" role="status">{errorMessage}</p>
	{/if}
	<p class="loader__sr-only">Loading live games</p>
</div>

<style>
	.loader {
		min-height: calc(100dvh - 60px);
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 24px;
		gap: var(--space-md);
	}

	.loader__glyph {
		font-size: clamp(64px, 12vw, 140px);
		line-height: 1;
		letter-spacing: 0.02em;
		user-select: none;
		color: rgba(0, 0, 0, 1);
	}

	.loader__glyph--error {
		color: var(--color-danger, #dc2626);
	}

	.loader__glyph--success {
		color: var(--color-success, #16a34a);
	}

	.loader__error {
		margin: 0;
		max-width: 44rem;
		text-align: center;
		color: var(--color-danger, #dc2626);
		word-break: break-word;
	}

	.loader__sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}
</style>
