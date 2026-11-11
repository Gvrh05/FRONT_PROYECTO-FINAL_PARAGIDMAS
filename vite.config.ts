import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  server: {
    host: '0.0.0.0',
    proxy: {
      '/auth': { target: 'http://127.0.0.1:3001', changeOrigin: true },
      '/kahoot-api': { target: 'http://127.0.0.1:3000', changeOrigin: true },
      '/uploads': { target: 'http://127.0.0.1:3000', changeOrigin: true },
      '/socket.io': { target: 'http://127.0.0.1:3000', ws: true, changeOrigin: true },
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
})
