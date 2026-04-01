<script lang="ts">
	import { onDestroy, onMount } from 'svelte'
	import { hadLiveGames } from '$lib/stores/liveGamesStore'
	import { HINDI_GLYPHS, LATIN_GLYPHS, URDU_GLYPHS } from '$lib/constants/glyphs'

	const GLYPH_SETS = [LATIN_GLYPHS, HINDI_GLYPHS, URDU_GLYPHS] as const

	function randomGlyph(): string {
		const set = GLYPH_SETS[Math.floor(Math.random() * GLYPH_SETS.length)] ?? LATIN_GLYPHS
		return set[Math.floor(Math.random() * set.length)] ?? '•'
	}

	let glyph = $state<string>(randomGlyph())
	let intervalId: ReturnType<typeof setInterval> | null = null

	function stopRotation() {
		if (intervalId) {
			clearInterval(intervalId)
			intervalId = null
		}
	}

	onMount(() => {
		if ($hadLiveGames) return
		intervalId = setInterval(() => {
			if ($hadLiveGames) {
				stopRotation()
				return
			}
			glyph = randomGlyph()
		}, 30_000)
	})

	onDestroy(() => {
		stopRotation()
	})
</script>

<div class="loader">
	<div class="loader__glyph" aria-hidden="true">{glyph}</div>
	<p class="loader__sr-only">Loading live games</p>
</div>

<style>
	.loader {
		min-height: calc(100dvh - 60px);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 24px;
	}

	.loader__glyph {
		font-size: clamp(64px, 12vw, 140px);
		line-height: 1;
		letter-spacing: 0.02em;
		user-select: none;
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
