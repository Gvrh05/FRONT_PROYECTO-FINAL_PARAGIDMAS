import './CosmicScene.css'
import { useEffect, useRef } from 'react'

/** Decorative galaxy projected from three-dimensional coordinates. */
export function CosmicScene({ compact = false }: { compact?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || typeof CanvasRenderingContext2D === 'undefined') return
    const context = canvas.getContext('2d')
    if (!context) return
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    let frame = 0
    let width = 1
    let height = 1
    let rotation = 0
    let lastTime = 0
    let seed = 42
    const random = () => {
      seed = (seed * 16807) % 2147483647
      return seed / 2147483647
    }
    const stars = Array.from({ length: compact ? 450 : 950 }, (_, index) => {
      const radius = Math.sqrt(random()) * 1.2
      const angle = radius * 5 + (index % 4) * Math.PI / 2 + random() * .65
      return {
        x: Math.cos(angle) * radius,
        y: (random() - .5) * .15 * (1.3 - radius),
        z: Math.sin(angle) * radius,
        size: .3 + random(),
        hue: 185 + radius * 80,
      }
    })

    const draw = () => {
      context.clearRect(0, 0, width, height)
      const scale = Math.min(width, height) * .55
      const glow = context.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, scale)
      glow.addColorStop(0, '#dcc8ff32')
      glow.addColorStop(.2, '#a668fa20')
      glow.addColorStop(.65, '#4166d50a')
      glow.addColorStop(1, '#06091b00')
      context.fillStyle = glow
      context.fillRect(0, 0, width, height)
      for (const star of stars) {
        const x = star.x * Math.cos(rotation) - star.z * Math.sin(rotation)
        const z = star.x * Math.sin(rotation) + star.z * Math.cos(rotation)
        const y = star.y * .8 - z * .5
        const depth = 2.8 / (2.8 + z * .8)
        context.beginPath()
        context.arc(width / 2 + x * scale * depth, height / 2 + y * scale * depth, star.size * depth, 0, Math.PI * 2)
        context.fillStyle = `hsla(${star.hue}, 85%, 82%, ${.35 + depth * .3})`
        context.fill()
      }
    }
    const animate = (time: number) => {
      if (lastTime) rotation += Math.min(time - lastTime, 50) * .000025
      lastTime = time
      draw()
      frame = requestAnimationFrame(animate)
    }
    const syncAnimation = () => {
      cancelAnimationFrame(frame)
      lastTime = 0
      draw()
      if (!motion.matches && !document.hidden) frame = requestAnimationFrame(animate)
    }
    const observer = new ResizeObserver(([entry]) => {
      width = entry.contentRect.width
      height = entry.contentRect.height
      const ratio = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = width * ratio
      canvas.height = height * ratio
      context.setTransform(ratio, 0, 0, ratio, 0, 0)
      draw()
    })
    observer.observe(canvas)
    motion.addEventListener('change', syncAnimation)
    document.addEventListener('visibilitychange', syncAnimation)
    syncAnimation()
    return () => {
      observer.disconnect()
      cancelAnimationFrame(frame)
      motion.removeEventListener('change', syncAnimation)
      document.removeEventListener('visibilitychange', syncAnimation)
    }
  }, [compact])

  return <div className={`cosmos ${compact ? 'cosmos-compact' : ''}`} aria-hidden="true">
    <canvas ref={canvasRef} />
    <div className="planet-system">
      <div className="planet-ring planet-ring-back" />
      <div className="planet"><div className="planet-clouds" /></div>
      <div className="planet-ring planet-ring-front" />
      <div className="planet-moon" />
    </div>
    <div className="orbital-path orbital-path-one" />
    <div className="orbital-path orbital-path-two" />
  </div>
}
