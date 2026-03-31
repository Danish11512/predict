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
		<label for="otp-input">{field ?? 'Code'}</label>
		<input
			id="otp-input"
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
