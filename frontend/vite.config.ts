import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { reactRouter } from '@react-router/dev/vite'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const src = path.resolve(__dirname, './src')

const frontendPort = Number(process.env.FRONTEND_PORT) || 5173
const backendPort = process.env.BACKEND_PORT || '8000'

// https://vite.dev/config/
export default defineConfig({
  plugins: [tailwindcss(), reactRouter()],
  resolve: {
    alias: {
      '@app': path.join(src, 'app'),
      '@assets': path.join(src, 'assets'),
      '@components': path.join(src, 'components'),
      '@constants': path.join(src, 'constants'),
      '@hooks': path.join(src, 'hooks'),
      '@pages': path.join(src, 'pages'),
      '@shared': path.join(src, 'shared'),
      '@stores': path.join(src, 'stores'),
      '@styles': path.join(src, 'styles'),
      /** `src/types` — not `@types` (reserved for DefinitelyTyped / npm scope) */
      '@typings': path.join(src, 'types'),
    },
  },
  server: {
    port: frontendPort,
    strictPort: true,
    proxy: {
      '/api': {
        target: `http://127.0.0.1:${backendPort}`,
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api/, ''),
      },
    },
  },
})
