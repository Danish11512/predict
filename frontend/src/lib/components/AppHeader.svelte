<script lang="ts">
	import { onMount } from 'svelte'
	import { TopNavTab, topNavTab } from '$lib/interfaces/topNavTab'

	type Theme = 'light' | 'dark'
	let theme = $state<Theme>('light')

	function setTab(tab: TopNavTab) {
		topNavTab.set(tab)
	}

	const TABS = [
		{
			tab: TopNavTab.Dashboard,
			tabId: 'app-header-tab-dashboard',
			panelId: 'app-main-panel-dashboard',
			label: 'Dashboard'
		},
		{
			tab: TopNavTab.Analytics,
			tabId: 'app-header-tab-analytics',
			panelId: 'app-main-panel-analytics',
			label: 'Analytics'
		},
		{
			tab: TopNavTab.History,
			tabId: 'app-header-tab-history',
			panelId: 'app-main-panel-history',
			label: 'History'
		}
	] as const

	function focusTab(tab: TopNavTab) {
		if (tab === TopNavTab.Dashboard) dashboardButton?.focus()
		else if (tab === TopNavTab.Analytics) analyticsButton?.focus()
		else historyButton?.focus()
	}

	function activeTabIndex(): number {
		const idx = TABS.findIndex((t) => t.tab === $topNavTab)
		return idx >= 0 ? idx : 0
	}

	function handleTabKeydown(e: KeyboardEvent) {
		const key = e.key
		if (
			key !== 'ArrowLeft' &&
			key !== 'ArrowRight' &&
			key !== 'ArrowUp' &&
			key !== 'ArrowDown' &&
			key !== 'Home' &&
			key !== 'End'
		) {
			return
		}

		e.preventDefault()

		const currentIndex = activeTabIndex()
		const lastIndex = TABS.length - 1

		let nextIndex = currentIndex
		if (key === 'Home') nextIndex = 0
		else if (key === 'End') nextIndex = lastIndex
		else if (key === 'ArrowLeft' || key === 'ArrowUp') nextIndex = currentIndex === 0 ? lastIndex : currentIndex - 1
		else if (key === 'ArrowRight' || key === 'ArrowDown') nextIndex = currentIndex === lastIndex ? 0 : currentIndex + 1

		const nextTab = TABS[nextIndex]?.tab ?? TABS[0].tab
		setTab(nextTab)
		focusTab(nextTab)
	}

	let dashboardButton: HTMLButtonElement | null = $state(null)
	let analyticsButton: HTMLButtonElement | null = $state(null)
	let historyButton: HTMLButtonElement | null = $state(null)

	function applyTheme(next: Theme) {
		theme = next
		if (typeof document !== 'undefined') {
			document.documentElement.dataset.theme = next
		}
		if (typeof localStorage !== 'undefined') {
			localStorage.setItem('theme', next)
		}
	}

	function toggleTheme() {
		applyTheme(theme === 'dark' ? 'light' : 'dark')
	}

	onMount(() => {
		const stored = typeof localStorage !== 'undefined' ? localStorage.getItem('theme') : null
		if (stored === 'light' || stored === 'dark') {
			applyTheme(stored)
			return
		}

		const prefersDark = typeof window !== 'undefined'
			? window.matchMedia?.('(prefers-color-scheme: dark)')?.matches
			: false

		applyTheme(prefersDark ? 'dark' : 'light')
	})
</script>

<header class="app-header">
	<div class="app-header__left" aria-hidden="true"></div>

	<a class="app-header__title" href="/">Predict</a>

	<div class="app-header__actions">
		<div class="app-header__tabs" role="tablist" aria-label="Primary">
			<button
				bind:this={dashboardButton}
				type="button"
				role="tab"
				id="app-header-tab-dashboard"
				class="app-header__tab"
				class:app-header__tab--active={$topNavTab === TopNavTab.Dashboard}
				aria-selected={$topNavTab === TopNavTab.Dashboard}
				aria-controls="app-main-panel-dashboard"
				tabindex={$topNavTab === TopNavTab.Dashboard ? 0 : -1}
				onkeydown={handleTabKeydown}
				onclick={() => setTab(TopNavTab.Dashboard)}
			>
				Dashboard
			</button>
			<button
				bind:this={analyticsButton}
				type="button"
				role="tab"
				id="app-header-tab-analytics"
				class="app-header__tab"
				class:app-header__tab--active={$topNavTab === TopNavTab.Analytics}
				aria-selected={$topNavTab === TopNavTab.Analytics}
				aria-controls="app-main-panel-analytics"
				tabindex={$topNavTab === TopNavTab.Analytics ? 0 : -1}
				onkeydown={handleTabKeydown}
				onclick={() => setTab(TopNavTab.Analytics)}
			>
				Analytics
			</button>
			<button
				bind:this={historyButton}
				type="button"
				role="tab"
				id="app-header-tab-history"
				class="app-header__tab"
				class:app-header__tab--active={$topNavTab === TopNavTab.History}
				aria-selected={$topNavTab === TopNavTab.History}
				aria-controls="app-main-panel-history"
				tabindex={$topNavTab === TopNavTab.History ? 0 : -1}
				onkeydown={handleTabKeydown}
				onclick={() => setTab(TopNavTab.History)}
			>
				History
			</button>
		</div>

		<button
			type="button"
			class="app-header__theme-toggle"
			aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
			onclick={toggleTheme}
		>
			{#if theme === 'dark'}
				<svg
					class="app-header__icon"
					viewBox="0 0 24 24"
					aria-hidden="true"
					focusable="false"
				>
					<path
						fill="currentColor"
						d="M21 13.6A8.4 8.4 0 0 1 10.4 3a.6.6 0 0 0-.8-.7A9.6 9.6 0 1 0 21.7 14.4a.6.6 0 0 0-.7-.8Z"
					/>
				</svg>
			{:else}
				<svg
					class="app-header__icon"
					viewBox="0 0 24 24"
					aria-hidden="true"
					focusable="false"
				>
					<path
						fill="currentColor"
						d="M12 18.2a6.2 6.2 0 1 1 0-12.4a6.2 6.2 0 0 1 0 12.4ZM12 1.4a.8.8 0 0 1 .8.8v2a.8.8 0 0 1-1.6 0v-2a.8.8 0 0 1 .8-.8Zm0 18.4a.8.8 0 0 1 .8.8v2a.8.8 0 0 1-1.6 0v-2a.8.8 0 0 1 .8-.8ZM4.2 3.9a.8.8 0 0 1 1.1 0l1.4 1.4a.8.8 0 1 1-1.1 1.1L4.2 5a.8.8 0 0 1 0-1.1Zm13.2 13.2a.8.8 0 0 1 1.1 0l1.4 1.4a.8.8 0 1 1-1.1 1.1l-1.4-1.4a.8.8 0 0 1 0-1.1ZM1.4 12a.8.8 0 0 1 .8-.8h2a.8.8 0 0 1 0 1.6h-2a.8.8 0 0 1-.8-.8Zm18.4 0a.8.8 0 0 1 .8-.8h2a.8.8 0 0 1 0 1.6h-2a.8.8 0 0 1-.8-.8ZM3.9 19.8a.8.8 0 0 1 0-1.1l1.4-1.4a.8.8 0 1 1 1.1 1.1l-1.4 1.4a.8.8 0 0 1-1.1 0Zm13.2-13.2a.8.8 0 0 1 0-1.1l1.4-1.4a.8.8 0 1 1 1.1 1.1l-1.4 1.4a.8.8 0 0 1-1.1 0Z"
					/>
				</svg>
			{/if}
		</button>

		<button type="button" class="app-header__account" aria-label="Account">
			<span class="app-header__account-dot" aria-hidden="true"></span>
		</button>
	</div>
</header>

<style>
	header.app-header {
		position: sticky;
		top: 0;
		z-index: 1000;
		width: 100%;
		max-height: 60px;
		height: 60px;
		padding-left: 50px;
		padding-right: 50px;
		display: flex;
		align-items: center;
		background: var(--app-header-bg);
		color: var(--app-header-fg);
	}

	.app-header__title {
		flex: 0 0 50%;
		max-width: 50%;
		display: inline-block;
		width: 100%;
		text-decoration: none;
		color: inherit;
		font-weight: 600;
		letter-spacing: 0.2px;
		font-size: 38px;
		text-align: center;
		-webkit-backdrop-filter: blur(12px);
		backdrop-filter: blur(12px);
		background-color: var(--app-header-bg);
		vertical-align: middle;
	}

	.app-header__left {
		flex: 0 0 25%;
		max-width: 25%;
		min-width: 0;
	}

	.app-header__actions {
		flex: 0 0 25%;
		max-width: 25%;
		min-width: 0;
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 8px;
	}

	.app-header__tabs {
		display: flex;
		align-items: center;
		gap: 4px;
	}

	.app-header__tab {
		appearance: none;
		border: 0;
		background: none;
		color: inherit;
		padding: 10px 6px 8px;
		border-radius: 0;
		cursor: pointer;
		font-size: 16px;
		line-height: 1;
		vertical-align: middle;
		white-space: nowrap;
		text-decoration: none;
		border-bottom: 2px solid transparent;
	}

	.app-header__tab--active {
		border-bottom-color: currentColor;
	}

	.app-header__theme-toggle {
		appearance: none;
		border: 0;
		background: transparent;
		color: inherit;
		padding: 8px;
		border-radius: 10px;
		cursor: pointer;
		line-height: 0;
	}

	.app-header__account {
		appearance: none;
		border: 0;
		background: transparent;
		padding: 8px;
		border-radius: 999px;
		cursor: pointer;
	}

	.app-header__account-dot {
		display: block;
		width: 28px;
		height: 28px;
		border-radius: 999px;
		background: color-mix(in srgb, currentColor 18%, transparent);
	}

	.app-header__icon {
		display: block;
		width: 28px;
		height: 28px;
	}

	.app-header__theme-toggle:focus-visible,
	.app-header__tab:focus-visible,
	.app-header__account:focus-visible,
	.app-header__title:focus-visible {
		outline: 2px solid color-mix(in srgb, currentColor 40%, transparent);
		outline-offset: 2px;
	}
</style>
