<script lang="ts">
	type Props = {
		message: string;
		onRetry: () => void;
	};

	let { message, onRetry }: Props = $props();
</script>

<div class="error-card">
	<h1 class="screen-title">Connection issue</h1>
	<p class="error-text">{message}</p>
	<button type="button" class="btn" onclick={onRetry}>Reconnect</button>
</div>

<style>
	.error-card {
		background: var(--color-surface);
		border-radius: var(--radius);
		padding: var(--space-lg);
	}

	.screen-title {
		font-size: 1.25rem;
		font-weight: 600;
		margin: 0 0 var(--space-md);
	}

	.error-text {
		color: var(--color-danger);
		margin: 0 0 var(--space-md);
	}

	.btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-height: 44px;
		padding: 0 var(--space-lg);
		border-radius: var(--radius);
		border: none;
		font: inherit;
		font-weight: 600;
		cursor: pointer;
		background: var(--color-accent);
		color: #0a0e14;
	}

	.btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>
