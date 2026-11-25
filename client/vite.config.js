import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// Point the dev/preview proxy at the API. Defaults to the project's original
// port; override with VITE_API_PROXY_TARGET for isolated local stacks.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, fileURLToPath(new URL('.', import.meta.url)), 'VITE_')
  const apiTarget = env.VITE_API_PROXY_TARGET || 'http://localhost:5000'
  const proxy = {
    '/api': {
      target: apiTarget,
      changeOrigin: true,
    },
  }

  return {
    plugins: [react()],
    server: {
      port: 5173,
      strictPort: true,
      proxy,
    },
    preview: {
      proxy,
    },
  }
})
