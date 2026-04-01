import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	// Repo-root `.env`: `PUBLIC_API_BASE_URL` = this repo’s API origin (not Kalshi; Kalshi is `KALSHI_PUBLIC_URL` for the backend runner)
	envDir: '..'
});
