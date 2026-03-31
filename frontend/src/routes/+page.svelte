<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { env } from '$env/dynamic/public';
	import { fetchLiveGamesSnapshot } from '$lib/liveGamesApi';
	import { openStream } from '$lib/sseConnection';
	import { submitStreamResponse } from '$lib/streamResponse';
	import type { LiveGamesPayload, StreamRequestEvent } from '$lib/streamTypes';
	import Into from './into.svelte';

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
		// Bootstrap / recovery priming; screen transitions still follow SSE (see plan §5).
		void fetchLiveGamesSnapshot(apiBase()).catch(() => {});
	});

	onDestroy(() => {
		stopStream?.();
		stopStream = null;
	});
</script>

<main class="app-main">
	{#if screen === 'intro'}
		{#if currentRequest}
			{#key currentRequest.request_id}
				<Into
					prompt={currentRequest.prompt}
					field={currentRequest.field}
					requestId={currentRequest.request_id}
					disabled={otpSubmitting}
					onsubmit={handleOtpSubmit}
				/>
			{/key}
		{:else}
			<div class="intro-card">
				<h1 class="screen-title">Welcome</h1>
				<p class="intro-wait">Waiting for sign-in or verification from the server…</p>
			</div>
		{/if}
	{:else if screen === 'loader'}
		<div class="loader-card">
			<h1 class="screen-title">Loading live games</h1>
			<p class="intro-wait">This can take a moment after verification.</p>
			{#if progressPercent !== null}
				<div class="loader-bar" role="progressbar" aria-valuenow={progressPercent} aria-valuemin={0} aria-valuemax={100}>
					<div class="loader-bar-fill" style="width: {progressPercent}%"></div>
				</div>
			{/if}
		</div>
	{:else if screen === 'liveGames'}
		<h1 class="screen-title">Live games</h1>
		{#if gamesData}
			<p class="games-meta">
				Updated: {gamesData.updated_utc ?? '—'} · {gamesData.games.length} game(s)
			</p>
			<ul class="games-list">
				{#each gamesData.games as g, i (g.market_href ?? g.title ?? i)}
					<li class="game-card">
						<h2 class="game-title">{g.title ?? 'Market'}</h2>
						<p class="game-sub">
							{g.status ?? ''}
							{#if g.game_clock}
								· {g.game_clock}
							{/if}
						</p>
					</li>
				{/each}
			</ul>
		{:else}
			<p class="intro-wait">No data yet.</p>
		{/if}
	{:else if screen === 'error'}
		<div class="error-card">
			<h1 class="screen-title">Connection issue</h1>
			<p class="error-text">{errorMessage}</p>
			<button type="button" class="btn" onclick={handleRetryFromError}>Reconnect</button>
		</div>
	{/if}
</main>
