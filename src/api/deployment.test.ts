import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.resetModules()
})

describe('API and Socket.IO deployment origins', () => {
  it('derives Socket.IO from the public backend when VITE_WS_URL is absent', async () => {
    vi.stubEnv('VITE_API_URL', 'https://game.example.com/kahoot-api')
    vi.stubEnv('VITE_WS_URL', '')
    const { WS_ORIGIN, API_ORIGIN } = await import('./config')
    expect(WS_ORIGIN).toBe('https://game.example.com')
    expect(API_ORIGIN).toBe(WS_ORIGIN)
  })
  it('retains the same-origin proxy when using relative API paths', async () => {
    vi.stubEnv('VITE_API_URL', '/kahoot-api')
    vi.stubEnv('VITE_WS_URL', '')
    const { WS_ORIGIN } = await import('./config')
    expect(WS_ORIGIN).toBe(window.location.origin)
  })
})
