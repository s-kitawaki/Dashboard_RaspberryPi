import { describe, expect, it } from 'vitest'
import { JUMP_HEIGHT, JUMP_MARGIN, JUMP_MS, WALK_SPEED, createRailWalker, stepRail, type RailGeometry } from './rail'

const geo: RailGeometry = { width: 972, gapStart: 508, gapEnd: 520, petWidth: 80 }

function run(steps: number, dt = 100, start = createRailWalker(), g = geo) {
  let w = start; let now = 0
  const trace = [w]
  for (let i = 0; i < steps; i++) { now += dt; w = stepRail(w, now, dt, g); trace.push(w) }
  return { walker: w, trace, now }
}

describe('rail walk', () => {
  it('walks right at a steady speed on the ground', () => {
    const { walker } = run(10)
    expect(walker.x).toBeCloseTo(WALK_SPEED)
    expect(walker.y).toBe(0)
    expect(walker.jump).toBeNull()
  })
  it('does nothing without geometry', () => {
    const w = createRailWalker(5)
    expect(stepRail(w, 100, 100, { ...geo, width: 0 })).toBe(w)
  })
  it('takes off just before the gap, clears it in one jump and lands beyond it', () => {
    const { trace } = run(400)
    const takeoff = trace.findIndex(w => w.jump !== null && !w.jump.wrap)
    expect(takeoff).toBeGreaterThan(0)
    const before = trace[takeoff - 1]!
    expect(before.x + geo.petWidth / 2).toBeLessThan(geo.gapStart)
    expect(before.x + geo.petWidth / 2).toBeGreaterThanOrEqual(geo.gapStart - JUMP_MARGIN - WALK_SPEED * 0.1)
    const airborne: typeof trace = []
    for (let i = takeoff; i < trace.length && trace[i]!.jump !== null; i++) airborne.push(trace[i]!)
    expect(Math.min(...airborne.map(w => w.y))).toBeLessThanOrEqual(-JUMP_HEIGHT * 0.9)
    expect(airborne.length * 100).toBeLessThanOrEqual(JUMP_MS)
    const landed = trace[takeoff + airborne.length]!
    expect(landed.jump).toBeNull(); expect(landed.y).toBe(0)
    // Take-off happens on a 100 ms tick, so the landing spot can overshoot by one tick of walking.
    expect(landed.x + geo.petWidth / 2).toBeGreaterThanOrEqual(geo.gapEnd + JUMP_MARGIN)
    expect(landed.x + geo.petWidth / 2).toBeLessThanOrEqual(geo.gapEnd + JUMP_MARGIN + WALK_SPEED * 0.1)
    // No second take-off right after landing.
    expect(trace[takeoff + airborne.length + 1]!.jump).toBeNull()
  })
  it('jumps off the right edge and lands on the left edge', () => {
    const { trace } = run(400)
    const wrapStart = trace.findIndex(w => w.jump?.wrap)
    expect(wrapStart).toBeGreaterThan(0)
    expect(trace[wrapStart]!.x + geo.petWidth).toBeLessThanOrEqual(geo.width)
    const mid = stepRail(trace[wrapStart]!, trace[wrapStart]!.jump!.start + JUMP_MS * 0.75, 100, geo)
    expect(mid.x).toBeLessThan(0); expect(mid.y).toBeLessThan(0)
    const landed = stepRail(trace[wrapStart]!, trace[wrapStart]!.jump!.start + JUMP_MS, 100, geo)
    expect(landed).toEqual({ x: 0, y: 0, jump: null })
  })
  it('skips the gap jump when the panels touch', () => {
    const { trace } = run(300, 100, createRailWalker(), { ...geo, gapStart: 508, gapEnd: 508 })
    expect(trace.some(w => w.jump !== null && !w.jump.wrap)).toBe(false)
  })
})
