<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import AppHeader from '$lib/components/AppHeader.svelte';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<AppHeader />

<main class="app-main">
	{@render children()}
</main>

<style>
	.app-main {
		min-height: 100%;
		background: var(--app-bg);
		color: var(--app-fg);
	}
</style>
