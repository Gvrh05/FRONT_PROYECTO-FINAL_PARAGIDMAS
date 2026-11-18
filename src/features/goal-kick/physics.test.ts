import { describe, expect, it } from 'vitest'
import { bezier, curvatureAt, directionAt, trajectory } from './physics'
describe('renderer physics v1 fixtures', () => {
  it('matches backend golden points and endpoints', () => {
    expect(bezier(trajectory(500, 260), .5)).toEqual({ x: 695, y: 362 })
    expect(bezier(trajectory(500, -260), .5)).toEqual({ x: 305, y: 362 })
    expect(bezier(trajectory(272, 65), .5)).toEqual({ x: 434.75, y: 362 })
    expect(bezier(trajectory(728, -65), 1)).toEqual({ x: 728, y: 104 })
  })
  it('moves the straight guide linearly, then curves through zero and opposite sides', () => {
    expect(directionAt(0)).toBe(200); expect(directionAt(600)).toBe(500); expect(directionAt(1200)).toBe(800); expect(directionAt(2400)).toBe(200)
    expect(curvatureAt(0)).toBe(0); expect(curvatureAt(550)).toBe(260); expect(curvatureAt(1100)).toBeCloseTo(0); expect(curvatureAt(1650)).toBe(-260)
  })
})
