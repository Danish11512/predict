<script lang="ts">
	import { appName } from '$lib';

	const highlights = [
		'SvelteKit + Vite',
		'Bun-ready scripts',
		'TypeScript-first setup'
	];
</script>

<svelte:head>
	<title>{appName}</title>
	<meta
		name="description"
		content="A clean starter for building with SvelteKit, Bun, TypeScript, and Vite."
	/>
</svelte:head>

<main class="page">
	<section class="hero">
		<p class="eyebrow">Starter app</p>
		<h1>{appName}</h1>
		<p class="lede">
			A minimal SvelteKit app scaffolded for Bun, TypeScript, and Vite.
		</p>

		<div class="chips" aria-label="Project highlights">
			{#each highlights as highlight}
				<span>{highlight}</span>
			{/each}
		</div>
	</section>

	<section class="card">
		<h2>Next steps</h2>
		<ul>
			<li>Run <code>bun install</code> to install dependencies.</li>
			<li>Start the dev server with <code>bun run dev</code>.</li>
			<li>Build production assets with <code>bun run build</code>.</li>
		</ul>
	</section>
</main>
