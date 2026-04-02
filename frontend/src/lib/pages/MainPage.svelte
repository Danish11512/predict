<script lang="ts">
	import { onMount } from 'svelte'
	import { fetchLiveGamesSnapshot } from '$lib/api/liveGamesApi'
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
	<ul class="games-list">
		{#each $liveGamesData.games as g, i (g.market_href ?? g.title ?? i)}
			<li class="game-card">
				<h2 class="game-title">{g.title ?? 'Market'}</h2>
				<p class="game-sub">
					{g.status ?? ''}
					{#if g.game_clock}
						· {g.game_clock}
					{/if}
				</p>
			</li>
		{/each}
	</ul>
{:else}
	<p class="intro-wait">No data yet.</p>
{/if}

<style>
	.screen-title {
		font-size: 1.25rem;
		font-weight: 600;
		margin: 0 0 var(--space-md);
	}

	.games-meta {
		font-size: 0.85rem;
		color: var(--color-muted);
		margin: 0 0 var(--space-md);
	}

	.games-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
	}

	.game-card {
		background: var(--color-surface);
		border-radius: var(--radius);
		padding: var(--space-md);
		border: 1px solid #2a3a4f;
	}

	.game-title {
		font-weight: 600;
		margin: 0 0 var(--space-sm);
	}

	.game-sub {
		font-size: 0.85rem;
		color: var(--color-muted);
		margin: 0;
	}

	.intro-wait {
		color: var(--color-muted);
		margin: 0;
	}
</style>

