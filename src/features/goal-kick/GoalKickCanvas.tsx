import { useEffect, useRef } from 'react'
import type { GoalKickBoard } from './contracts'
import type { GoalKickFrame } from './useGoalKickPresentation'

function person(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, debug: boolean) {
  ctx.fillStyle = '#f0c7a5'; ctx.beginPath(); ctx.arc(x + 23, y + 10, 10, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = color; ctx.fillRect(x + 7, y + 20, 32, 34)
  ctx.fillStyle = '#d2deeb'; ctx.fillRect(x + 8, y + 54, 11, 22); ctx.fillRect(x + 27, y + 54, 11, 22)
  if (debug) { ctx.strokeStyle = '#fbbf24'; ctx.strokeRect(x + 7, y + 20, 32, 34); ctx.strokeRect(x + 8, y + 54, 11, 22); ctx.strokeRect(x + 27, y + 54, 11, 22); ctx.beginPath(); ctx.arc(x + 23, y + 10, 10, 0, 2 * Math.PI); ctx.stroke() }
}
export function GoalKickCanvas({ board, playerName, sample, activate, debug }: { board: GoalKickBoard; playerName: string; sample: (now: number) => GoalKickFrame; activate: () => void; debug: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const latest = useRef({ board, sample, activate, debug })
  useEffect(() => { latest.current = { board, sample, activate, debug } }, [board, sample, activate, debug])
  useEffect(() => {
    const element = canvas.current
    if (!element) return
    const ctx = element.getContext('2d')
    if (!ctx) return
    let frameId = 0, width = 1, height = 1
    const resize = () => { const size = element.getBoundingClientRect(); width = Math.max(1, size.width); height = Math.max(1, size.height); const dpr = Math.min(devicePixelRatio || 1, 2); element.width = width * dpr; element.height = height * dpr }
    const observer = new ResizeObserver(resize); observer.observe(element); resize()
    const draw = (time: number) => {
      const { board: b, sample: read, debug: dbg } = latest.current
      const f = read(time), dpr = Math.min(devicePixelRatio || 1, 2), scale = Math.min(width / 1000, height / 700)
      if (import.meta.env.DEV && dbg) { element.dataset.aimX = String(f.targetX); element.dataset.curve = String(f.curve); element.dataset.stage = f.stage }
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, element.width, element.height)
      ctx.setTransform(dpr * scale, 0, 0, dpr * scale, (width - 1000 * scale) / 2 * dpr, (height - 700 * scale) / 2 * dpr)
      ctx.fillStyle = '#123d35'; ctx.fillRect(0, 0, 1000, 700)
      ctx.fillStyle = '#ffffff04'; for (let y = 0; y < 700; y += 100) ctx.fillRect(0, y, 1000, 50)
      ctx.strokeStyle = '#b8dcc150'; ctx.lineWidth = 2; ctx.strokeRect(50, 30, 900, 640); ctx.strokeRect(200, 210, 600, 320)
      ctx.fillStyle = '#101d30'; ctx.fillRect(242, 60, 516, 150)
      ctx.strokeStyle = '#abc1db35'; ctx.lineWidth = 1
      for (let x = 254; x < 746; x += 25) { ctx.beginPath(); ctx.moveTo(x, 72); ctx.lineTo(x, 210); ctx.stroke() }
      for (let y = 80; y < 210; y += 25) { ctx.beginPath(); ctx.moveTo(254, y); ctx.lineTo(746, y); ctx.stroke() }
      ctx.fillStyle = '#dce7f7'; ctx.fillRect(242, 60, 12, 150); ctx.fillRect(746, 60, 12, 150); ctx.fillRect(242, 60, 516, 12)
      for (const d of b.defenders) person(ctx, d.x, d.y, '#92556f', dbg)
      person(ctx, b.keeper.x, b.keeper.y, '#b78d49', dbg)
      person(ctx, 477, 630, '#4d7abe', false)
      if (f.stage === 'DIRECTION' || f.stage === 'CURVE') {
        const [p0, p1, p2, p3] = f.path
        ctx.setLineDash([10, 9]); ctx.lineWidth = 4; ctx.strokeStyle = '#e9f2fa'; ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.bezierCurveTo(p1.x, p1.y, p2.x, p2.y, p3.x, p3.y); ctx.stroke(); ctx.setLineDash([])
        if (dbg) for (const p of f.path) { ctx.fillStyle = '#eab66a'; ctx.fillRect(p.x - 5, p.y - 5, 10, 10) }
      }
      ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#18273c'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(f.ball.x, f.ball.y, 8, 0, 2 * Math.PI); ctx.fill(); ctx.stroke()
      frameId = requestAnimationFrame(draw)
    }
    frameId = requestAnimationFrame(draw)
    return () => { cancelAnimationFrame(frameId); observer.disconnect() }
  }, [])
  return <div className="goal-kick-scene"><canvas ref={canvas} onClick={activate} role="img" aria-label="Campo de tiro. Usa el botón para fijar dirección y después curva." /><span className="goal-kick-keeper-name">{board.keeper.displayName}</span><span className="goal-kick-player-name">{playerName}</span></div>
}
