/** Rendering-only mirror of the versioned backend geometry. Never decides a goal. */
export const PHYSICS = { version: 1, width: 1000, height: 700, radius: 8, goalY: 104, flightMs: 900, pauseMs: 350, durationMs: 40000, goalPoints: 10 } as const
export interface Point { x: number; y: number }
export type Curve = [Point, Point, Point, Point]
export function trajectory(aimX: number, k: number): Curve {
  return [{ x: 500, y: 620 }, { x: 500 + (aimX - 500) / 3 + k, y: 448 }, { x: 500 + 2 * (aimX - 500) / 3 + k, y: 276 }, { x: aimX, y: 104 }]
}
export function bezier(c: Curve, u: number): Point {
  const v = 1 - u
  return { x: v ** 3 * c[0].x + 3 * v * v * u * c[1].x + 3 * v * u * u * c[2].x + u ** 3 * c[3].x, y: v ** 3 * c[0].y + 3 * v * v * u * c[1].y + 3 * v * u * u * c[2].y + u ** 3 * c[3].y }
}
export function directionAt(elapsed: number) { const p = (elapsed % 2400) / 2400; return 200 + 600 * (1 - Math.abs(2 * p - 1)) }
export function curvatureAt(elapsed: number) { return 260 * Math.sin(2 * Math.PI * elapsed / 2200) }

// Visual stop prediction only. No goal, score or outcome is trusted until the server event.
type Shape = { kind: 'circle'; x: number; y: number; radius: number } | { kind: 'rect'; x: number; y: number; width: number; height: number }
const mid = (a: Point, b: Point): Point => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 })
function flatten(c: Curve, lo = 0, hi = 1, depth = 0): { a: Point; b: Point; lo: number; hi: number }[] {
  const [a, b, d, e] = c, len = Math.hypot(e.x - a.x, e.y - a.y)
  const distance = (p: Point) => Math.abs((e.x - a.x) * (a.y - p.y) - (a.x - p.x) * (e.y - a.y)) / (len || 1)
  if (Math.max(distance(b), distance(d)) <= .2 || depth >= 16) return [{ a, b: e, lo, hi }]
  const ab = mid(a, b), bd = mid(b, d), de = mid(d, e), left = mid(ab, bd), right = mid(bd, de), center = mid(left, right), half = (lo + hi) / 2
  return [...flatten([a, ab, left, center], lo, half, depth + 1), ...flatten([center, right, de, e], half, hi, depth + 1)]
}
function circleEntry(a: Point, b: Point, x: number, y: number, radius: number) {
  const dx = b.x - a.x, dy = b.y - a.y, px = a.x - x, py = a.y - y, aa = dx * dx + dy * dy, bb = 2 * (px * dx + py * dy), cc = px * px + py * py - radius * radius
  if (cc <= 0) return 0
  const disc = bb * bb - 4 * aa * cc
  if (!aa || disc < 0) return undefined
  const t = (-bb - Math.sqrt(disc)) / (2 * aa)
  return t >= 0 && t <= 1 ? t : undefined
}
function rectEntry(a: Point, b: Point, r: Extract<Shape, { kind: 'rect' }>) {
  let lo = 0, hi = 1
  for (const [p, delta, min, max] of [[a.x, b.x - a.x, r.x, r.x + r.width], [a.y, b.y - a.y, r.y, r.y + r.height]]) {
    if (Math.abs(delta) < 1e-10) { if (p < min || p > max) return undefined }
    else { const t1 = (min - p) / delta, t2 = (max - p) / delta; lo = Math.max(lo, Math.min(t1, t2)); hi = Math.min(hi, Math.max(t1, t2)); if (lo > hi) return undefined }
  }
  return lo
}
function sweep(a: Point, b: Point, s: Shape) {
  const radius = 8.2
  if (s.kind === 'circle') return circleEntry(a, b, s.x, s.y, radius + s.radius)
  const hits = [rectEntry(a, b, { ...s, x: s.x - radius, width: s.width + radius * 2 }), rectEntry(a, b, { ...s, y: s.y - radius, height: s.height + radius * 2 }), ...[s.x, s.x + s.width].flatMap(x => [s.y, s.y + s.height].map(y => circleEntry(a, b, x, y, radius)))].filter((t): t is number => t !== undefined)
  return hits.length ? Math.min(...hits) : undefined
}
function body(p: Point): Shape[] { return [{ kind: 'circle', x: p.x + 23, y: p.y + 10, radius: 10 }, { kind: 'rect', x: p.x + 7, y: p.y + 20, width: 32, height: 34 }, { kind: 'rect', x: p.x + 8, y: p.y + 54, width: 11, height: 22 }, { kind: 'rect', x: p.x + 27, y: p.y + 54, width: 11, height: 22 }] }
export function previewContact(c: Curve, defenders: Point[]): number {
  const shapes: Shape[] = [...defenders.flatMap(body), ...body({ x: 477, y: 132 }), { kind: 'rect', x: 242, y: 60, width: 12, height: 150 }, { kind: 'rect', x: 746, y: 60, width: 12, height: 150 }, { kind: 'rect', x: 242, y: 60, width: 516, height: 12 }]
  for (const segment of flatten(c)) {
    let best = Infinity
    for (const s of shapes) { const hit = sweep(segment.a, segment.b, s); if (hit !== undefined) best = Math.min(best, hit) }
    for (const [start, end, low, high] of [[segment.a.x, segment.b.x, 8, 992], [segment.a.y, segment.b.y, 8, 692]]) if (end < low || end > high) best = Math.min(best, Math.max(0, ((end < low ? low : high) - start) / (end - start)))
    if (best !== Infinity) return segment.lo + best * (segment.hi - segment.lo)
  }
  return 1
}
