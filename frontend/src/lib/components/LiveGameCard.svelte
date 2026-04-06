<script lang="ts">
	import type { GameRecord } from '$lib/interfaces/streamTypes'

	let { game }: { game: GameRecord } = $props()

	const displayTitle = $derived(
		game.event?.title ?? game.scraped.title ?? 'Market'
	)
	const firstMarket = $derived(game.markets[0])
	const priceHint = $derived(
		firstMarket?.last_price_dollars != null
			? `Last ${String(firstMarket.last_price_dollars)}`
			: null
	)
	const volHint = $derived(
		firstMarket?.volume_fp != null ? `Vol ${String(firstMarket.volume_fp)}` : null
	)
</script>

<li class="game-card">
	<h2 class="game-title">{displayTitle}</h2>
	<p class="game-sub">
		{game.scraped.status ?? ''}
		{#if game.scraped.game_clock}
			· {game.scraped.game_clock}
		{/if}
	</p>
	{#if priceHint || volHint}
		<p class="game-trade">
			{[priceHint, volHint].filter(Boolean).join(' · ')}
		</p>
	{/if}
</li>

<style>
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

	.game-trade {
		font-size: 0.8rem;
		color: var(--color-muted);
		margin: var(--space-sm) 0 0;
	}
</style>
