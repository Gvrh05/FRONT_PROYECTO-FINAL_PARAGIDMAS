import confetti from 'canvas-confetti'

/** Decorative only: never delay or change an answer submission. */
export function celebrateAnswer(correct = false) {
  if (typeof window === 'undefined' || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
  try {
    const result = confetti({
      particleCount: correct ? 100 : 30,
      spread: correct ? 85 : 50,
      startVelocity: correct ? 35 : 23,
      origin: { x: .5, y: .72 },
      colors: correct ? ['#fbbf24', '#60a5fa', '#4ade80', '#ffffff'] : ['#60a5fa', '#93c5fd', '#a78bfa'],
      ticks: 130,
      disableForReducedMotion: true,
      zIndex: 100,
    })
    void result?.catch(() => {})
  } catch {
    // Canvas support is optional; game controls still work without it.
  }
}
