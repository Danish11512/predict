<script lang="ts">
	type Props = {
		requestId: string;
		disabled?: boolean;
		onsubmit: (value: string) => void;
	};

	let { requestId, disabled = false, onsubmit }: Props = $props();

	const OTP_LENGTH = 4;

	let digits = $state<string[]>(Array.from({ length: OTP_LENGTH }, () => ''));
	let input0 = $state<HTMLInputElement | null>(null);
	let input1 = $state<HTMLInputElement | null>(null);
	let input2 = $state<HTMLInputElement | null>(null);
	let input3 = $state<HTMLInputElement | null>(null);

	function inputAt(i: number): HTMLInputElement | null {
		if (i === 0) return input0;
		if (i === 1) return input1;
		if (i === 2) return input2;
		return input3;
	}

	function otpValue(): string {
		return digits.join('');
	}

	function digitsOnly(v: string): string {
		return v.replace(/\D/g, '').slice(0, OTP_LENGTH);
	}

	function focusIndex(i: number) {
		inputAt(i)?.focus();
		inputAt(i)?.select();
	}

	function setFromString(v: string, startIndex = 0) {
		const next = digitsOnly(v);
		for (let j = 0; j < next.length; j += 1) {
			const i = startIndex + j;
			if (i >= OTP_LENGTH) break;
			digits[i] = next[j] ?? '';
		}
		const firstEmpty = digits.findIndex((d) => d.length === 0);
		if (firstEmpty === -1) {
			if (!disabled) onsubmit(otpValue());
			return;
		}
		focusIndex(firstEmpty);
	}

	function handleBoxInput(e: Event, index: number) {
		const t = e.currentTarget as HTMLInputElement;
		const next = digitsOnly(t.value);
		if (next.length > 1) {
			setFromString(next, index);
			return;
		}
		digits[index] = next;
		t.value = next;
		if (next && index < OTP_LENGTH - 1) focusIndex(index + 1);
		if (otpValue().length === OTP_LENGTH && !digits.includes('') && !disabled) {
			onsubmit(otpValue());
		}
	}

	function handleBoxKeydown(e: KeyboardEvent, index: number) {
		if (disabled) return;
		const key = e.key;
		if (key === 'Backspace') {
			if (digits[index]) {
				digits[index] = '';
				return;
			}
			if (index > 0) {
				digits[index - 1] = '';
				focusIndex(index - 1);
			}
			return;
		}
		if (key === 'ArrowLeft' && index > 0) {
			e.preventDefault();
			focusIndex(index - 1);
			return;
		}
		if (key === 'ArrowRight' && index < OTP_LENGTH - 1) {
			e.preventDefault();
			focusIndex(index + 1);
			return;
		}
	}

	function handlePaste(e: ClipboardEvent, index: number) {
		if (disabled) return;
		const text = e.clipboardData?.getData('text') ?? '';
		const next = digitsOnly(text);
		if (!next) return;
		e.preventDefault();
		setFromString(next, index);
	}
</script>

<form
	class="otp-form"
	onsubmit={(e) => {
		e.preventDefault();
		const value = otpValue();
		if (!disabled && value.length === OTP_LENGTH && !digits.includes('')) onsubmit(value);
	}}
>
	<div class="otp-boxes" role="group" aria-label="OTP code">
		<input
			id={`otp-input-${requestId}-0`}
			class="otp-box"
			type="text"
			inputmode="numeric"
			autocomplete="one-time-code"
			maxlength={1}
			aria-label="OTP digit 1"
			{disabled}
			value={digits[0]}
			bind:this={input0}
			oninput={(e) => handleBoxInput(e, 0)}
			onkeydown={(e) => handleBoxKeydown(e, 0)}
			onpaste={(e) => handlePaste(e, 0)}
		/>
		<input
			id={`otp-input-${requestId}-1`}
			class="otp-box"
			type="text"
			inputmode="numeric"
			autocomplete="off"
			maxlength={1}
			aria-label="OTP digit 2"
			{disabled}
			value={digits[1]}
			bind:this={input1}
			oninput={(e) => handleBoxInput(e, 1)}
			onkeydown={(e) => handleBoxKeydown(e, 1)}
			onpaste={(e) => handlePaste(e, 1)}
		/>
		<input
			id={`otp-input-${requestId}-2`}
			class="otp-box"
			type="text"
			inputmode="numeric"
			autocomplete="off"
			maxlength={1}
			aria-label="OTP digit 3"
			{disabled}
			value={digits[2]}
			bind:this={input2}
			oninput={(e) => handleBoxInput(e, 2)}
			onkeydown={(e) => handleBoxKeydown(e, 2)}
			onpaste={(e) => handlePaste(e, 2)}
		/>
		<input
			id={`otp-input-${requestId}-3`}
			class="otp-box"
			type="text"
			inputmode="numeric"
			autocomplete="off"
			maxlength={1}
			aria-label="OTP digit 4"
			{disabled}
			value={digits[3]}
			bind:this={input3}
			oninput={(e) => handleBoxInput(e, 3)}
			onkeydown={(e) => handleBoxKeydown(e, 3)}
			onpaste={(e) => handlePaste(e, 3)}
		/>
	</div>
</form>

<style>
	.otp-form {
		display: flex;
		justify-content: center;
	}

	.otp-boxes {
		display: flex;
		gap: 10px;
	}

	.otp-box {
		display: grid;
		font-size: 1.5rem;
		padding: var(--space-md);
		box-sizing: border-box;
		border-radius: 7px;
		border: 2px solid #2a3a4f;
		background: var(--color-bg);
		color: var(--color-text);
		width: 3rem;
		height: 60px;
		text-align: center;
	}

	.otp-box:focus {
		outline: none;
		border-color: #3a6aa6;
		box-shadow: 0 0 0 3px rgba(58, 106, 166, 0.25);
	}

	.otp-box:disabled {
		opacity: 0.55;
	}
</style>
