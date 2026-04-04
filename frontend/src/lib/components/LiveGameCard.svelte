<script lang="ts">
	import type { GameRecord } from '$lib/interfaces/streamTypes'

	let { game }: { game: GameRecord } = $props()
</script>

<li class="game-card">
	<h2 class="game-title">{game.title ?? 'Market'}</h2>
	<p class="game-sub">
		{game.status ?? ''}
		{#if game.game_clock}
			· {game.game_clock}
		{/if}
	</p>
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
</style>
