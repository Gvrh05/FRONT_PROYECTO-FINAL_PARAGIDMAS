import { afterEach, expect, it, vi } from 'vitest'
import confetti from 'canvas-confetti'
import { celebrateAnswer } from './answerConfetti'
vi.mock('canvas-confetti', () => ({ default: vi.fn() }))
afterEach(() => { vi.clearAllMocks(); vi.unstubAllGlobals() })

it('respeta la preferencia de movimiento reducido', () => {
  vi.stubGlobal('matchMedia', () => ({ matches: true }))
  celebrateAnswer(true)
  expect(confetti).not.toHaveBeenCalled()
})

it('un fallo de canvas no interrumpe el juego', () => {
  vi.stubGlobal('matchMedia', () => ({ matches: false }))
  vi.mocked(confetti).mockImplementationOnce(() => { throw new Error('Canvas unavailable') })
  expect(() => celebrateAnswer()).not.toThrow()
})
