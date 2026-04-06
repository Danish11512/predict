<script lang="ts">
	import { onMount } from 'svelte'
	import { fetchLiveGamesSnapshot } from '$lib/api/liveGamesApi'
	import LiveGameCard from '$lib/components/LiveGameCard.svelte'
	import { hadLiveGames, liveGamesData } from '$lib/stores/liveGamesStore'
	import { publicApiBaseUrl } from '$lib/utils/apiBase'

	onMount(() => {
		if ($liveGamesData) return
		void fetchLiveGamesSnapshot(publicApiBaseUrl())
			.then((snap) => {
				if (!$liveGamesData) {
					liveGamesData.set(snap)
					hadLiveGames.set(true)
				}
			})
			.catch(() => {})
	})
</script>

<h1 class="screen-title">Live games</h1>
{#if $liveGamesData}
	<p class="games-meta">
		Updated: {$liveGamesData.updated_utc ?? '—'} · {$liveGamesData.games.length} game(s)
	</p>
	<div class="games-cards">
		<ul class="games-list">
			{#each $liveGamesData.games as g, i (g.scraped.market_href ?? g.event?.event_ticker ?? g.scraped.title ?? i)}
				<LiveGameCard game={g} />
			{/each}
		</ul>
	</div>
{:else}
	<p class="intro-wait">No data yet.</p>
{/if}

<style>
	.screen-title {
		font-size: 1.25rem;
		font-weight: 600;
		padding-top: 40px;
		margin: 0 0 20px;
	}

	.games-meta {
		font-size: 0.85rem;
		color: var(--color-muted);
		margin: 0 0 var(--space-md);
		padding-bottom: 20px;
	}

	.games-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
	}

	.intro-wait {
		color: var(--color-muted);
		margin: 0;
	}
</style>

