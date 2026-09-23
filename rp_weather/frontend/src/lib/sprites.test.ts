import { describe, expect, it } from 'vitest'
import { FEET, SHADOW, SPRITES, SPRITE_NAMES, SPRITE_SIZE, rectsToPath, type Rect } from './sprites'

const inside = ([x, y, w, h]: Rect) => x >= 0 && y >= 0 && w > 0 && h > 0 && x + w <= SPRITE_SIZE && y + h <= SPRITE_SIZE

describe('pixel sprites', () => {
  it('defines seven characters', () => {
    expect(SPRITE_NAMES).toEqual(['mametchi', 'memetchi', 'oyajitchi', 'gozarutchi', 'ringotchi', 'furawatchi', 'ichigotchi'])
  })
  it.each(SPRITE_NAMES)('%s stays inside the 40x40 grid, has both eye states and a body above the feet', name => {
    const s = SPRITES[name]
    const rects = [...s.body, ...s.eyesOpen, ...s.eyesClosed].flatMap(l => l.rects)
    expect(rects.length).toBeGreaterThan(5)
    for (const r of rects) expect(inside(r)).toBe(true)
    expect(s.eyesOpen.length).toBeGreaterThan(0)
    expect(s.eyesClosed.length).toBeGreaterThan(0)
    // The body must reach the feet row so there is no gap at the ankles.
    const bottom = Math.max(...s.body.flatMap(l => l.rects).map(([, y, , h]) => y + h))
    expect(bottom).toBeGreaterThanOrEqual(30)
    expect(s.label).toMatch(/っち$/)
  })
  it('shares one ground line for feet and shadow', () => {
    for (const r of [...FEET.left.outline, ...FEET.right.outline]) expect(r[1] + r[3]).toBe(36)
    expect(SHADOW[0]![1]).toBe(37)
  })
  it('turns rectangles into closed subpaths', () => {
    expect(rectsToPath([[1, 2, 3, 4], [0, 0, 1, 1]])).toBe('M1 2h3v4h-3zM0 0h1v1h-1z')
  })
})
