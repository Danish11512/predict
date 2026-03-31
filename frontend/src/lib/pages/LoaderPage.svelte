<script lang="ts">
	type Props = {
		progressPercent: number | null;
	};

	let { progressPercent }: Props = $props();
</script>

<div class="loader-card">
	<h1 class="screen-title">Loading live games</h1>
	<p class="intro-wait">This can take a moment after verification.</p>
	{#if progressPercent !== null}
		<div
			class="loader-bar"
			role="progressbar"
			aria-valuenow={progressPercent}
			aria-valuemin={0}
			aria-valuemax={100}
		>
			<div class="loader-bar-fill" style="width: {progressPercent}%"></div>
		</div>
	{/if}
</div>

<style>
	.loader-card {
		background: var(--color-surface);
		border-radius: var(--radius);
		padding: var(--space-lg);
	}

	.screen-title {
		font-size: 1.25rem;
		font-weight: 600;
		margin: 0 0 var(--space-md);
	}

	.intro-wait {
		color: var(--color-muted);
		margin: 0;
	}

	.loader-bar {
		height: 6px;
		background: #2a3a4f;
		border-radius: 3px;
		overflow: hidden;
		margin-top: var(--space-md);
	}

	.loader-bar-fill {
		height: 100%;
		background: var(--color-accent);
		transition: width 0.25s ease;
	}
</style>
