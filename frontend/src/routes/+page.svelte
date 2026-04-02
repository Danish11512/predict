<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { hadLiveGames, liveGamesData } from '$lib/stores/liveGamesStore';
	import { TopNavTab } from '$lib/interfaces/topNavTab';
	import { topNavTab } from '$lib/stores/topNavTabStore';
	import AnalyticsPage from '$lib/pages/AnalyticsPage.svelte';
	import ErrorPage from '$lib/pages/ErrorPage.svelte';
	import HistoryPage from '$lib/pages/HistoryPage.svelte';
	import IntroPage from '$lib/pages/IntroPage.svelte';
	import LoaderPage from '$lib/pages/LoaderPage.svelte';
	import MainPage from '$lib/pages/MainPage.svelte';
	import { openStream } from '$lib/api/sseConnection';
	import { submitStreamResponse } from '$lib/api/streamResponse';
	import type { StreamRequestEvent } from '$lib/interfaces/streamTypes';
	import { AppFlowScreen } from '$lib/interfaces/appFlowScreen';
	import { LoaderTone } from '$lib/interfaces/loaderTone';
	import { publicApiBaseUrl } from '$lib/utils/apiBase';

	let screen = $state<AppFlowScreen>(AppFlowScreen.Intro);
	let currentRequest = $state<StreamRequestEvent | null>(null);
	let hasOpenOtp = $state(false);
	let errorMessage = $state('');
	let loaderTone = $state<LoaderTone>(LoaderTone.Neutral);
	let liveGamesSuccessTick = $state(0);
	let otpSubmitting = $state(false);

	let stopStream: (() => void) | null = null;

	const connectStream = () => {
		stopStream?.();
		stopStream = null;
		liveGamesSuccessTick = 0;
		const base = publicApiBaseUrl();
		const { close } = openStream(base, {
			onRequest: (ev) => {
				currentRequest = ev;
				hasOpenOtp = true;
				screen = AppFlowScreen.Intro;
			},
			onProgress: (ev) => {
				void ev;
			},
			onData: (payload) => {
				if (screen === AppFlowScreen.Intro && hasOpenOtp) {
					return;
				}
				liveGamesData.set(payload);
				hadLiveGames.set(true);
				if (screen === AppFlowScreen.Loader && loaderTone === LoaderTone.Success) {
					liveGamesSuccessTick += 1;
					return;
				}
				if (screen === AppFlowScreen.Loader || screen === AppFlowScreen.LiveGames || screen === AppFlowScreen.Intro) screen = AppFlowScreen.LiveGames;
			},
			onError: (ev) => {
				errorMessage = ev.message || ev.code;
				loaderTone = LoaderTone.Error;
				screen = AppFlowScreen.Error;
				stopStream?.();
				stopStream = null;
			}
		});
		stopStream = close;
	}

	const handleOtpSubmit = async (value: string) => {
		if (!currentRequest || otpSubmitting) return;
		otpSubmitting = true;
		const res = await submitStreamResponse(publicApiBaseUrl(), {
			request_id: currentRequest.request_id,
			value
		});
		otpSubmitting = false;
		if (res.ok) {
			hasOpenOtp = false;
			currentRequest = null;
			errorMessage = '';
			loaderTone = LoaderTone.Success;
			liveGamesSuccessTick = 0;
			screen = AppFlowScreen.Loader;
			return;
		}
		if (res.kind === 'stale_404') {
			currentRequest = null;
			hasOpenOtp = false;
			return;
		}
		errorMessage = res.message;
		loaderTone = LoaderTone.Error;
		screen = AppFlowScreen.Error;
	}

	const handleLoaderReady = () => {
		if (screen !== AppFlowScreen.Loader) return;
		loaderTone = LoaderTone.Neutral;
		screen = AppFlowScreen.LiveGames;
	}

	const handleRetryFromError = () => {
		errorMessage = '';
		loaderTone = LoaderTone.Neutral;
		liveGamesSuccessTick = 0;
		if ($hadLiveGames) {
			screen = AppFlowScreen.LiveGames;
		} else if (hasOpenOtp && currentRequest) {
			screen = AppFlowScreen.Intro;
		} else {
			screen = AppFlowScreen.Intro;
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

{#if screen === AppFlowScreen.Intro}
	<IntroPage
		{currentRequest}
		{otpSubmitting}
		onOtpSubmit={handleOtpSubmit}
	/>
{:else if screen === AppFlowScreen.Loader}
	<LoaderPage
		tone={loaderTone}
		errorMessage={errorMessage || null}
		successDataTick={liveGamesSuccessTick}
		onReady={handleLoaderReady}
	/>
{:else if screen === AppFlowScreen.LiveGames}
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
{:else if screen === AppFlowScreen.Error}
	<div class="error-screen">
		<LoaderPage tone={loaderTone} errorMessage={errorMessage || null} />
		<ErrorPage message={errorMessage} onRetry={handleRetryFromError} />
	</div>
{/if}

<style>
	.error-screen {
		display: grid;
		min-height: calc(100dvh - 60px);
		padding: 24px;
		gap: var(--space-lg);
		place-items: center;
	}

	.error-screen :global(.loader) {
		min-height: auto;
		padding: 0;
	}

	.error-screen :global(.error-card) {
		width: 100%;
		max-width: 44rem;
	}
</style>
