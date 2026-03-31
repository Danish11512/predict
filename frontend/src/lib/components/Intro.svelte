<script lang="ts">
	type Props = {
		prompt: string;
		field: string | null;
		requestId: string;
		disabled?: boolean;
		onsubmit: (value: string) => void;
	};

	let { prompt, field, requestId, disabled = false, onsubmit }: Props = $props();

	let raw = $state('');

	function digitsOnly(v: string): string {
		return v.replace(/\D/g, '').slice(0, 4);
	}

	function handleInput(e: Event) {
		const t = e.currentTarget as HTMLInputElement;
		const next = digitsOnly(t.value);
		raw = next;
		t.value = next;
		if (next.length === 4 && !disabled) {
			onsubmit(next);
		}
	}
</script>

<div class="intro-card">
	<h2 class="screen-title">Verification</h2>
	<p class="intro-prompt">{prompt}</p>
	<div class="otp-field">
		<label for={`otp-input-${requestId}`}>{field ?? 'Code'}</label>
		<input
			id={`otp-input-${requestId}`}
			class="otp-input"
			type="text"
			inputmode="numeric"
			autocomplete="one-time-code"
			maxlength={4}
			{disabled}
			value={raw}
			oninput={handleInput}
		/>
	</div>
</div>

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

	.intro-prompt {
		color: var(--color-muted);
		margin: 0 0 var(--space-md);
		font-size: 0.95rem;
	}

	.otp-field {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.otp-field label {
		font-size: 0.8rem;
		color: var(--color-muted);
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.otp-input {
		font-size: 1.5rem;
		letter-spacing: 0.35em;
		padding: var(--space-md);
		border-radius: var(--radius);
		border: 1px solid #2a3a4f;
		background: var(--color-bg);
		color: var(--color-text);
		width: 100%;
		max-width: 12rem;
	}

	.otp-input:disabled {
		opacity: 0.55;
	}
</style>
