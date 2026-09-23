import { describe, expect, it } from 'vitest'
import { FLOOR_BAND, PHASE_ROOMS, createWalker, depthScale, isSleepHour, phaseAt, phaseForHour, pickTarget, spotFor, stepWalker, type Walker } from './room'

describe('room phases', () => {
  it.each([
    [6, 'morning'], [10, 'morning'], [11, 'day'], [13, 'day'], [14, 'evening'], [16, 'evening'],
    [17, 'night'], [20, 'night'], [21, 'bedroom'], [23, 'bedroom'], [0, 'bedroom'], [5, 'bedroom'],
  ] as const)('hour %s is %s', (hour, phase) => {
    expect(phaseForHour(hour)).toBe(phase)
  })
  it('reads the phase in Japan time, not UTC', () => {
    expect(phaseAt(new Date('2026-09-05T01:24:36Z'))).toBe('morning') // 10:24 JST
    expect(phaseAt(new Date('2026-09-05T12:00:00Z'))).toBe('bedroom') // 21:00 JST
    expect(phaseAt(new Date('2026-09-04T21:00:00Z'))).toBe('morning') // 06:00 JST next day
  })
  it('sleeps exactly while the bedroom is shown', () => {
    expect(isSleepHour(20)).toBe(false)
    expect(isSleepHour(21)).toBe(true)
    expect(isSleepHour(5)).toBe(true)
    expect(isSleepHour(6)).toBe(false)
  })
  it('pins stationary phases to distinct spots inside the stage and wraps for extra residents', () => {
    for (const phase of ['morning', 'bedroom'] as const) {
      const spots = PHASE_ROOMS[phase].spots!
      expect(spots.length).toBeGreaterThanOrEqual(2)
      for (const spot of spots) {
        expect(spot.x).toBeGreaterThanOrEqual(0); expect(spot.x).toBeLessThanOrEqual(100)
        expect(spot.y).toBeGreaterThanOrEqual(0); expect(spot.y).toBeLessThanOrEqual(100)
      }
      expect(spotFor(PHASE_ROOMS[phase], 0)).not.toEqual(spotFor(PHASE_ROOMS[phase], 1))
      expect(spotFor(PHASE_ROOMS[phase], spots.length)).toEqual(spots[0])
    }
    expect(spotFor(PHASE_ROOMS.day, 0)).toBeUndefined()
    expect(PHASE_ROOMS.night.favorite).toBeDefined()
  })
})

const sequence = (values: number[]) => { let i = 0; return () => values[i++ % values.length]! }

describe('walker', () => {
  it('picks targets inside the band and prefers the favorite half the time', () => {
    const band = FLOOR_BAND
    // Without a favorite no coin is flipped, so the first two draws are x and y.
    const inside = pickTarget(band, sequence([0, 1]))
    expect(inside.x).toBe(band.x[0]); expect(inside.y).toBe(band.y[1])
    expect(pickTarget(band, sequence([0.2]), { x: 80, y: 66 })).toEqual({ x: 80, y: 66 })
    expect(pickTarget(band, sequence([0.6, 0.5, 0.5]), { x: 80, y: 66 })).toEqual({ x: 50, y: 72 })
  })
  it('moves toward the target at a steady speed, faces the direction of travel, then rests', () => {
    let walker: Walker = { x: 20, y: 60, target: { x: 40, y: 60 }, facing: 'left', restUntil: 0 }
    walker = stepWalker(walker, 1000, 1000, FLOOR_BAND, sequence([0.5]))
    expect(walker.x).toBeCloseTo(27, 5); expect(walker.y).toBe(60); expect(walker.facing).toBe('right')
    walker = stepWalker(walker, 2000, 1000, FLOOR_BAND, sequence([0.5]))
    walker = stepWalker(walker, 3000, 1000, FLOOR_BAND, sequence([0.5, 0.5, 0.5, 0.5]))
    expect(walker.x).toBe(40)
    expect(walker.restUntil).toBeGreaterThan(3000)
    const resting = stepWalker(walker, 3500, 500, FLOOR_BAND, sequence([0.5]))
    expect(resting).toBe(walker)
  })
  it('keeps the facing when moving straight up or down', () => {
    const walker: Walker = { x: 30, y: 60, target: { x: 30, y: 80 }, facing: 'left', restUntil: 0 }
    expect(stepWalker(walker, 0, 500, FLOOR_BAND, sequence([0.5])).facing).toBe('left')
  })
  it('never leaves the band over a long random walk', () => {
    let seed = 7
    const rng = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280 }
    let walker = createWalker(FLOOR_BAND, rng, { x: 80, y: 66 })
    for (let t = 0; t < 600; t++) {
      walker = stepWalker(walker, t * 100, 100, FLOOR_BAND, rng, { x: 80, y: 66 })
      expect(walker.x).toBeGreaterThanOrEqual(FLOOR_BAND.x[0] - 1e-6); expect(walker.x).toBeLessThanOrEqual(FLOOR_BAND.x[1] + 1e-6)
      expect(walker.y).toBeGreaterThanOrEqual(FLOOR_BAND.y[0] - 1e-6); expect(walker.y).toBeLessThanOrEqual(FLOOR_BAND.y[1] + 1e-6)
    }
  })
  it('scales characters up as they come toward the viewer', () => {
    expect(depthScale(FLOOR_BAND.y[0], FLOOR_BAND)).toBeCloseTo(0.85)
    expect(depthScale(FLOOR_BAND.y[1], FLOOR_BAND)).toBeCloseTo(1.15)
    expect(depthScale(FLOOR_BAND.y[1] + 50, FLOOR_BAND)).toBeCloseTo(1.15)
  })
})
