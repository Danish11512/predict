<script lang="ts">
	import Otp from '$lib/components/OTP.svelte';
	import type { StreamRequestEvent } from '$lib/interfaces/streamTypes';

	type Props = {
		currentRequest: StreamRequestEvent | null;
		otpSubmitting: boolean;
		onOtpSubmit: (value: string) => void;
	};

	let { currentRequest, otpSubmitting, onOtpSubmit }: Props = $props();
</script>

{#if currentRequest}
	{#key currentRequest.request_id}
		<div class="otp-page">
			<div class="mx-auto w-full max-w-md">
				<Otp
					requestId={currentRequest.request_id}
					disabled={otpSubmitting}
					onsubmit={onOtpSubmit}
				/>
			</div>
		</div>
	{/key}
{/if}

<style>
	.otp-page {
		min-height: calc(100dvh - 60px);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 24px;
	}
</style>
