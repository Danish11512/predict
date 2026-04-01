<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { env } from '$env/dynamic/public';
	import { hadLiveGames, liveGamesData } from '$lib/liveGamesStore';
	import { TopNavTab, topNavTab } from '$lib/topNavTab';
	import AnalyticsPage from '$lib/pages/AnalyticsPage.svelte';
	import ErrorPage from '$lib/pages/ErrorPage.svelte';
	import HistoryPage from '$lib/pages/HistoryPage.svelte';
	import IntroPage from '$lib/pages/IntroPage.svelte';
	import LoaderPage from '$lib/pages/LoaderPage.svelte';
	import MainPage from '$lib/pages/MainPage.svelte';
	import { openStream } from '$lib/sseConnection';
	import { submitStreamResponse } from '$lib/streamResponse';
	import type { StreamRequestEvent } from '$lib/streamTypes';

	type Screen = 'intro' | 'loader' | 'liveGames' | 'error';

	function apiBase(): string {
		const b = env.PUBLIC_API_BASE_URL;
		return (typeof b === 'string' && b.length > 0 ? b : 'http://localhost:8000').replace(/\/$/, '');
	}

	let screen = $state<Screen>('intro');
	let currentRequest = $state<StreamRequestEvent | null>(null);
	let hasOpenOtp = $state(false);
	let progressPercent = $state<number | null>(null);
	let errorMessage = $state('');
	let otpSubmitting = $state(false);

	let stopStream: (() => void) | null = null;

	function connectStream() {
		stopStream?.();
		stopStream = null;
		const base = apiBase();
		const { close } = openStream(base, {
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
				liveGamesData.set(payload);
				hadLiveGames.set(true);
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
		if ($hadLiveGames) {
			screen = 'liveGames';
		} else if (hasOpenOtp && currentRequest) {
			screen = 'intro';
		} else {
			screen = 'intro';
		}
		connectStream();
	}

	onMount(() => {
		connectStream();
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
	{#if $topNavTab === TopNavTab.Dashboard}
		<div
			role="tabpanel"
			id="app-main-panel-dashboard"
			aria-labelledby="app-header-tab-dashboard"
			tabindex="0"
		>
			<MainPage />
		</div>
	{:else if $topNavTab === TopNavTab.Analytics}
		<div
			role="tabpanel"
			id="app-main-panel-analytics"
			aria-labelledby="app-header-tab-analytics"
			tabindex="0"
		>
			<AnalyticsPage />
		</div>
	{:else}
		<div
			role="tabpanel"
			id="app-main-panel-history"
			aria-labelledby="app-header-tab-history"
			tabindex="0"
		>
			<HistoryPage />
		</div>
	{/if}
{:else if screen === 'error'}
	<ErrorPage message={errorMessage} onRetry={handleRetryFromError} />
{/if}
