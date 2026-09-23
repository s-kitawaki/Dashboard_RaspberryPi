import { describe, expect, it } from 'vitest'
import { FEET, SHADOW, SPRITES, SPRITE_NAMES, SPRITE_SIZE, gridToLayers, rectsToPath, type Rect } from './sprites'

const inside = ([x, y, w, h]: Rect, width: number, height: number) => x >= 0 && y >= 0 && w > 0 && h > 0 && x + w <= width && y + h <= height

describe('pixel sprites', () => {
  it('defines seven characters', () => {
    expect(SPRITE_NAMES).toEqual(['mametchi', 'memetchi', 'oyajitchi', 'gozarutchi', 'ringotchi', 'furawatchi', 'ichigotchi'])
  })
  it.each(SPRITE_NAMES)('%s stays inside its grid, has both eye states and a body above the feet', name => {
    const s = SPRITES[name]
    const width = s.width ?? SPRITE_SIZE, height = s.height ?? SPRITE_SIZE
    const rects = [...s.body, ...s.eyesOpen, ...s.eyesClosed, ...(s.feetLeft ?? []), ...(s.feetRight ?? [])].flatMap(l => l.rects)
    expect(rects.length).toBeGreaterThan(5)
    for (const r of rects) expect(inside(r, width, height)).toBe(true)
    expect(s.eyesOpen.length).toBeGreaterThan(0)
    expect(s.eyesClosed.length).toBeGreaterThan(0)
    // The body must reach the feet row so there is no gap at the ankles.
    const feetTop = Math.min(...(s.feetLeft ?? [{ rects: FEET.left.outline }]).flatMap(l => l.rects).map(([, y]) => y))
    const bottom = Math.max(...s.body.flatMap(l => l.rects).map(([, y, , h]) => y + h))
    expect(bottom).toBeGreaterThanOrEqual(feetTop - 1)
    expect(s.label).toMatch(/っち$/)
  })
  it('shares one ground line for feet and shadow', () => {
    for (const r of [...FEET.left.outline, ...FEET.right.outline]) expect(r[1] + r[3]).toBe(36)
    expect(SHADOW[0]![1]).toBe(37)
  })
  it('reads a character grid into per-color horizontal runs', () => {
    const layers = gridToLayers(['.aab', 'bb..'], { a: '#a', b: '#b' })
    expect(layers).toEqual([{ fill: '#a', rects: [[1, 0, 2, 1]] }, { fill: '#b', rects: [[3, 0, 1, 1], [0, 1, 2, 1]] }])
  })
  it('draws mametchi on the reference chart grid with its own feet', () => {
    const m = SPRITES.mametchi
    expect(m.width).toBe(28)
    expect(m.feetLeft).toBeDefined(); expect(m.feetRight).toBeDefined()
    expect(m.body.flatMap(l => l.rects).every(([x, , w]) => x + w <= 28)).toBe(true)
  })
  it('turns rectangles into closed subpaths', () => {
    expect(rectsToPath([[1, 2, 3, 4], [0, 0, 1, 1]])).toBe('M1 2h3v4h-3zM0 0h1v1h-1z')
  })
})
