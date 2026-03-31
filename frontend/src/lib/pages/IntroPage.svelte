<script lang="ts">
	import Into from '$lib/components/Intro.svelte';
	import type { StreamRequestEvent } from '$lib/streamTypes';

	type Props = {
		currentRequest: StreamRequestEvent | null;
		otpSubmitting: boolean;
		onOtpSubmit: (value: string) => void;
	};

	let { currentRequest, otpSubmitting, onOtpSubmit }: Props = $props();
</script>

{#if currentRequest}
	{#key currentRequest.request_id}
		<Into
			prompt={currentRequest.prompt}
			field={currentRequest.field}
			requestId={currentRequest.request_id}
			disabled={otpSubmitting}
			onsubmit={onOtpSubmit}
		/>
	{/key}
{:else}
	<div class="intro-card">
		<h1 class="screen-title">Welcome</h1>
		<p class="intro-wait">Waiting for sign-in or verification from the server…</p>
	</div>
{/if}

<style>
	.intro-card {
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
</style>
