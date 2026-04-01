<script lang="ts">
	type Props = {
		requestId: string;
		disabled?: boolean;
		onsubmit: (value: string) => void;
	};

	let { requestId, disabled = false, onsubmit }: Props = $props();

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

<form
	class="otp-form"
	onsubmit={(e) => {
		e.preventDefault();
		if (!disabled && raw.length === 4) onsubmit(raw);
	}}
>
	<input
		id={`otp-input-${requestId}`}
		class="otp-input"
		type="text"
		inputmode="numeric"
		autocomplete="one-time-code"
		maxlength={4}
		aria-label="Verification code"
		{disabled}
		value={raw}
		oninput={handleInput}
	/>
</form>

<style>
	.otp-form {
		display: flex;
		justify-content: center;
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
