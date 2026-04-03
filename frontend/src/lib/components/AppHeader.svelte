<script lang="ts">
	import { onMount } from 'svelte'
	import { TopNavTab } from '$lib/interfaces/topNavTab'
	import { topNavTab } from '$lib/stores/topNavTabStore'
	import { APP_HEADER_DOM_ID, APP_HEADER_MEDIA_QUERY } from '$lib/constants/appHeader'
	import {
		APP_HEADER_THEME_TOGGLE_DARK_MODE_PATH,
		APP_HEADER_THEME_TOGGLE_LIGHT_MODE_PATH
	} from '$lib/constants/appHeaderIcons'
	import { APP_HEADER_TABS } from '$lib/constants/appHeaderTabs'
	import { isEventTargetInsideElementId } from '$lib/utils/dom'
	import { listenMediaQuery } from '$lib/utils/mediaQuery'
	import {
		applyThemeToDocument,
		isDarkTheme,
		persistTheme,
		resolveInitialTheme,
		themeFromIsDark
	} from '$lib/utils/theme'

	let isDarkMode = $state(false)
	let isTop = $state(true)
	let isMenuOpen = $state(false)

	const closeMenu = () => {
		isMenuOpen = false
	}

	const setTab = (tab: TopNavTab) => {
		topNavTab.set(tab)
		closeMenu()
	}

	const focusTab = (tab: TopNavTab) => {
		const id = APP_HEADER_TABS.find((t) => t.tab === tab)?.tabId
		if (id) document.getElementById(id)?.focus()
	}

	const activeTabIndex = (): number => {
		const idx = APP_HEADER_TABS.findIndex((t) => t.tab === $topNavTab)
		return idx >= 0 ? idx : 0
	}

	const handleTabKeydown = (e: KeyboardEvent) => {
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
		const lastIndex = APP_HEADER_TABS.length - 1

		let nextIndex = currentIndex
		if (key === 'Home') nextIndex = 0
		else if (key === 'End') nextIndex = lastIndex
		else if (key === 'ArrowLeft' || key === 'ArrowUp') nextIndex = currentIndex === 0 ? lastIndex : currentIndex - 1
		else if (key === 'ArrowRight' || key === 'ArrowDown') nextIndex = currentIndex === lastIndex ? 0 : currentIndex + 1

		const nextTab = APP_HEADER_TABS[nextIndex]?.tab ?? APP_HEADER_TABS[0].tab
		setTab(nextTab)
		focusTab(nextTab)
	}

	const applyPersistedTheme = (nextIsDark: boolean) => {
		isDarkMode = nextIsDark
		const next = themeFromIsDark(nextIsDark)
		applyThemeToDocument(next)
		persistTheme(next)
	}

	const toggleTheme = () => {
		applyPersistedTheme(!isDarkMode)
		closeMenu()
	}

	onMount(() => {
		applyPersistedTheme(isDarkTheme(resolveInitialTheme()))

		const onDocPointerDown = (evt: PointerEvent) => {
			if (!isMenuOpen) return
			if (isEventTargetInsideElementId(evt, APP_HEADER_DOM_ID.root)) return
			closeMenu()
		}

		const onDocKeyDown = (evt: KeyboardEvent) => {
			if (!isMenuOpen) return
			if (evt.key !== 'Escape') return
			evt.preventDefault()
			closeMenu()
		}

		const { unsubscribe } = listenMediaQuery(APP_HEADER_MEDIA_QUERY.compactWidth, (compact) => {
			isTop = !compact
			if (isTop) closeMenu()
		})

		document.addEventListener('pointerdown', onDocPointerDown)
		document.addEventListener('keydown', onDocKeyDown)
		return () => {
			document.removeEventListener('pointerdown', onDocPointerDown)
			document.removeEventListener('keydown', onDocKeyDown)
			unsubscribe()
		}
	})
</script>

{#snippet themeToggleIcon()}
	{#if isDarkMode}
		<svg class="app-header__icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
			<path fill="currentColor" d={APP_HEADER_THEME_TOGGLE_DARK_MODE_PATH} />
		</svg>
	{:else}
		<svg class="app-header__icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
			<path fill="currentColor" d={APP_HEADER_THEME_TOGGLE_LIGHT_MODE_PATH} />
		</svg>
	{/if}
{/snippet}

<header
	id={APP_HEADER_DOM_ID.root}
	class="app-header"
	class:app-header--bottom={!isTop}
>
	<div class="app-header__left" aria-hidden="true"></div>

	{#if !isTop}
		<div class="app-header__balance" aria-hidden="true"></div>
	{/if}

	<a class="app-header__title" href="/">Predict</a>

	<div class="app-header__actions">
		{#if isTop}
			<div class="app-header__tabs" role="tablist" aria-label="Primary">
				{#each APP_HEADER_TABS as t (t.tab)}
					<button
						type="button"
						role="tab"
						id={t.tabId}
						class="app-header__tab"
						class:app-header__tab--active={$topNavTab === t.tab}
						aria-selected={$topNavTab === t.tab}
						aria-controls={t.panelId}
						tabindex={$topNavTab === t.tab ? 0 : -1}
						onkeydown={handleTabKeydown}
						onclick={() => setTab(t.tab)}
					>
						{t.label}
					</button>
				{/each}
			</div>

			<button
				type="button"
				class="app-header__theme-toggle"
				aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
				onclick={toggleTheme}
			>
				{@render themeToggleIcon()}
			</button>

			<button type="button" class="app-header__account" aria-label="Account">
				<span class="app-header__account-dot" aria-hidden="true"></span>
			</button>
		{:else}
			<div class="app-header__menu">
				<button
					type="button"
					class="app-header__menu-button"
					aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
					aria-expanded={isMenuOpen}
					aria-controls={APP_HEADER_DOM_ID.dropup}
					onclick={() => (isMenuOpen = !isMenuOpen)}
				>
					<img class="app-header__menu-icon" src={isDarkMode ? '/icons/menu-dark.png' : '/icons/menu.png'} alt="" aria-hidden="true" />
				</button>

				{#if isMenuOpen}
					<div id={APP_HEADER_DOM_ID.dropup} class="app-header__dropup">
						<div class="app-header__tabs app-header__tabs--stacked" role="tablist" aria-label="Primary">
							{#each APP_HEADER_TABS as t (t.tab)}
								<button
									type="button"
									role="tab"
									id={t.tabId}
									class="app-header__tab"
									class:app-header__tab--active={$topNavTab === t.tab}
									aria-selected={$topNavTab === t.tab}
									aria-controls={t.panelId}
									tabindex={$topNavTab === t.tab ? 0 : -1}
									onkeydown={handleTabKeydown}
									onclick={() => setTab(t.tab)}
								>
									{t.label}
								</button>
							{/each}
						</div>

						<button
							type="button"
							class="app-header__theme-toggle app-header__theme-toggle--row"
							aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
							onclick={toggleTheme}
						>
							{@render themeToggleIcon()}
						</button>

						<button type="button" class="app-header__account app-header__account--row" aria-label="Account" onclick={closeMenu}>
							<span class="app-header__account-dot" aria-hidden="true"></span>
						</button>
					</div>
				{/if}
			</div>
		{/if}
	</div>
</header>

<style>
	header.app-header {
		position: sticky;
		top: 0;
		bottom: auto;
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

	@media (min-width: 1025px) {
		header.app-header {
			display: grid;
			grid-template-columns: 1fr 2fr 1fr;
			column-gap: 0;
		}

		.app-header__left {
			max-width: none;
		}

		.app-header__title {
			flex: initial;
			max-width: none;
			width: auto;
			justify-self: center;
			text-align: center;
		}

		.app-header__actions {
			flex: initial;
			max-width: none;
			justify-self: end;
		}
	}

	header.app-header.app-header--bottom {
		position: fixed;
		left: 0;
		right: 0;
		top: auto;
		bottom: 0;
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
		column-gap: 0;
		align-items: center;
	}

	header.app-header.app-header--bottom .app-header__left {
		display: none;
	}

	header.app-header.app-header--bottom .app-header__balance {
		min-width: 0;
	}

	header.app-header.app-header--bottom .app-header__title {
		flex: initial;
		max-width: none;
		width: auto;
		justify-self: center;
		text-align: center;
	}

	header.app-header.app-header--bottom .app-header__actions {
		flex: initial;
		max-width: none;
		justify-self: end;
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
		position: relative;
	}

	@media (max-width: 1024px) {
		header.app-header {
			padding-left: 16px;
			padding-right: 16px;
		}

		.app-header__left {
			flex: 0 0 0;
			max-width: 0;
		}

		.app-header__title {
			flex: 1 1 auto;
			max-width: none;
			font-size: 28px;
			text-align: left;
		}

		.app-header__actions {
			flex: 0 0 auto;
			max-width: none;
		}
	}

	.app-header__tabs {
		display: flex;
		align-items: center;
		gap: 4px;
	}

	.app-header__tabs--stacked {
		flex-direction: column;
		align-items: stretch;
		gap: 2px;
		width: 100%;
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

	.app-header__tabs:not(.app-header__tabs--stacked) .app-header__tab--active {
		border-bottom-color: currentColor;
	}

	.app-header__tabs--stacked .app-header__tab {
		border-bottom: none;
		border-radius: 10px;
		padding: 10px 10px;
		text-align: left;
		white-space: normal;
		width: 100%;
	}

	:global(html[data-theme='light']) .app-header__tabs--stacked .app-header__tab--active {
		background: color-mix(in srgb, black 10%, transparent);
	}

	:global(html[data-theme='dark']) .app-header__tabs--stacked .app-header__tab--active {
		background: color-mix(in srgb, white 14%, transparent);
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

	.app-header__theme-toggle--row {
		align-self: flex-start;
	}

	.app-header__account {
		appearance: none;
		border: 0;
		background: transparent;
		padding: 8px;
		border-radius: 999px;
		cursor: pointer;
	}

	.app-header__account--row {
		align-self: flex-start;
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

	.app-header__menu {
		position: relative;
		display: flex;
		align-items: center;
	}

	.app-header__menu-button {
		appearance: none;
		border: 0;
		background: transparent;
		color: inherit;
		padding: 8px;
		border-radius: 10px;
		cursor: pointer;
		line-height: 0;
	}

	.app-header__menu-icon {
		display: block;
		width: 28px;
		height: 28px;
		opacity: 0.95;
		object-fit: contain;
	}

	.app-header__dropup {
		position: absolute;
		right: 0;
		bottom: 60px;
		min-width: 220px;
		padding: 10px 10px 12px;
		display: flex;
		flex-direction: column;
		gap: 6px;
		align-items: stretch;
		background: var(--app-header-bg);
		color: var(--app-header-fg);
		-webkit-backdrop-filter: blur(12px);
		backdrop-filter: blur(12px);
		border: 0;
		border-radius: 14px;
	}

	.app-header__theme-toggle:focus-visible,
	.app-header__tab:focus-visible,
	.app-header__account:focus-visible,
	.app-header__title:focus-visible,
	.app-header__menu-button:focus-visible {
		outline: 2px solid color-mix(in srgb, currentColor 40%, transparent);
		outline-offset: 2px;
	}
</style>
