import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import { defineConfig } from 'vitest/config'
import { loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiTarget = env.DEV_API_PROXY_TARGET || 'http://127.0.0.1:3000'
  const authTarget = env.DEV_AUTH_PROXY_TARGET || 'http://127.0.0.1:3001'
  return {
  server: {
    host: '0.0.0.0',
    proxy: {
      '/auth': { target: authTarget, changeOrigin: true },
      '/kahoot-api': { target: apiTarget, changeOrigin: true },
      '/uploads': { target: apiTarget, changeOrigin: true },
      '/socket.io': { target: apiTarget, ws: true, changeOrigin: true },
    },
  },
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] })
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    maxWorkers: 2,
    testTimeout: 15000,
    env: {
      VITE_API_URL: 'http://localhost:3000/kahoot-api',
      VITE_AUTH_API_URL: 'http://localhost:3001/auth',
    },
  },
  }
})
