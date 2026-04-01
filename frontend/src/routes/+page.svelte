<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { env } from '$env/dynamic/public';
	import { fetchLiveGamesSnapshot } from '$lib/liveGamesApi';
	import ErrorPage from '$lib/pages/ErrorPage.svelte';
	import IntroPage from '$lib/pages/IntroPage.svelte';
	import LiveGamesPage from '$lib/pages/LiveGamesPage.svelte';
	import LoaderPage from '$lib/pages/LoaderPage.svelte';
	import { openStream } from '$lib/sseConnection';
	import { submitStreamResponse } from '$lib/streamResponse';
	import type { LiveGamesPayload, StreamRequestEvent } from '$lib/streamTypes';

	type Screen = 'intro' | 'loader' | 'liveGames' | 'error';

	function apiBase(): string {
		const b = env.PUBLIC_API_BASE_URL;
		return (typeof b === 'string' && b.length > 0 ? b : 'http://localhost:8000').replace(/\/$/, '');
	}

	let screen = $state<Screen>('intro');
	let currentRequest = $state<StreamRequestEvent | null>(null);
	let hasOpenOtp = $state(false);
	let progressPercent = $state<number | null>(null);
	let gamesData = $state<LiveGamesPayload | null>(null);
	let hadLiveGames = $state(false);
	let errorMessage = $state('');
	let otpSubmitting = $state(false);

	let stopStream: (() => void) | null = null;

	function connectStream() {
		stopStream?.();
		stopStream = null;
		const base = apiBase();
		const { close } = openStream(base, {
			onOpen: () => {
				void (async () => {
					if (!hadLiveGames) return;
					try {
						const snap = await fetchLiveGamesSnapshot(base);
						if (screen === 'liveGames') {
							gamesData = snap;
						}
					} catch {
						/* recovery is best-effort */
					}
				})();
			},
			onRequest: (ev) => {
				currentRequest = ev;
				hasOpenOtp = true;
				screen = 'intro';
			},
			onProgress: (ev) => {
				progressPercent = ev.percent;
				if (screen === 'intro' && !hasOpenOtp) {
					screen = 'loader';
				}
			},
			onData: (payload) => {
				if (screen === 'intro' && hasOpenOtp) {
					return;
				}
				gamesData = payload;
				hadLiveGames = true;
				if (screen === 'loader' || screen === 'liveGames' || screen === 'intro') {
					screen = 'liveGames';
				}
			},
			onError: (ev) => {
				errorMessage = ev.message || ev.code;
				screen = 'error';
				stopStream?.();
				stopStream = null;
			}
		});
		stopStream = close;
	}

	async function handleOtpSubmit(value: string) {
		if (!currentRequest || otpSubmitting) return;
		otpSubmitting = true;
		const res = await submitStreamResponse(apiBase(), {
			request_id: currentRequest.request_id,
			value
		});
		otpSubmitting = false;
		if (res.ok) {
			hasOpenOtp = false;
			currentRequest = null;
			progressPercent = null;
			screen = 'loader';
			return;
		}
		if (res.kind === 'stale_404') {
			currentRequest = null;
			hasOpenOtp = false;
			return;
		}
		errorMessage = res.message;
		screen = 'error';
	}

	function handleRetryFromError() {
		errorMessage = '';
		if (hadLiveGames) {
			screen = 'liveGames';
		} else if (hasOpenOtp && currentRequest) {
			screen = 'intro';
		} else {
			screen = 'intro';
		}
		connectStream();
		void fetchLiveGamesSnapshot(apiBase())
			.then((snap) => {
				if (screen === 'liveGames') {
					gamesData = snap;
				}
			})
			.catch(() => {});
	}

	onMount(() => {
		connectStream();
		void fetchLiveGamesSnapshot(apiBase()).catch(() => {});
	});

	onDestroy(() => {
		stopStream?.();
		stopStream = null;
	});
</script>

{#if screen === 'intro'}
	<IntroPage
		{currentRequest}
		{otpSubmitting}
		onOtpSubmit={handleOtpSubmit}
	/>
{:else if screen === 'loader'}
	<LoaderPage {progressPercent} />
{:else if screen === 'liveGames'}
	<LiveGamesPage {gamesData} />
{:else if screen === 'error'}
	<ErrorPage message={errorMessage} onRetry={handleRetryFromError} />
{/if}
