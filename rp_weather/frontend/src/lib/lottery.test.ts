import { describe, expect, it } from 'vitest'
import { RAIL_CANDIDATES, dailyRailWalkers, dailySeed, drawWeighted, mulberry32 } from './lottery'
import { SPRITE_NAMES } from './sprites'

describe('daily lottery', () => {
  it('weights add up to 100 with oyajitchi as the rare one', () => {
    expect(RAIL_CANDIDATES.reduce((s, c) => s + c.weight, 0)).toBe(100)
    expect(RAIL_CANDIDATES.find(c => c.name === 'oyajitchi')!.weight).toBe(5)
    for (const c of RAIL_CANDIDATES) expect(SPRITE_NAMES).toContain(c.name)
  })
  it('seeds by the Japan-time calendar day', () => {
    expect(dailySeed(new Date('2026-09-05T14:59:59Z'))).toBe(20260905) // 23:59 JST
    expect(dailySeed(new Date('2026-09-05T15:00:00Z'))).toBe(20260906) // 00:00 JST next day
  })
  it('draws the same two all day and never the same character twice', () => {
    const morning = dailyRailWalkers(new Date('2026-09-05T00:00:00Z'))
    const night = dailyRailWalkers(new Date('2026-09-05T14:30:00Z'))
    expect(morning).toEqual(night)
    expect(morning).toHaveLength(2)
    expect(morning[0]).not.toBe(morning[1])
  })
  it('changes across days', () => {
    const seen = new Set<string>()
    for (let d = 1; d <= 30; d++) seen.add(dailyRailWalkers(new Date(`2026-09-${String(d).padStart(2, '0')}T03:00:00Z`)).join('+'))
    expect(seen.size).toBeGreaterThan(5)
  })
  it('honors the weights over many days', () => {
    const counts: Record<string, number> = {}
    const days = 20000
    for (let i = 0; i < days; i++) for (const name of drawWeighted(RAIL_CANDIDATES, 2, mulberry32(i))) counts[name] = (counts[name] ?? 0) + 1
    // P(oyajitchi appears in the pair) ≈ 0.05 + 0.95 * 0.05 / 0.81 ≈ 0.109; the others ≈ 0.378 each.
    expect(counts.oyajitchi! / days).toBeGreaterThan(0.085)
    expect(counts.oyajitchi! / days).toBeLessThan(0.135)
    for (const name of ['mametchi', 'memetchi', 'gozarutchi', 'ringotchi', 'furawatchi']) {
      expect(counts[name]! / days).toBeGreaterThan(0.34)
      expect(counts[name]! / days).toBeLessThan(0.42)
    }
  })
  it('never picks a zero-weight candidate and stops when the pool runs out', () => {
    const picks = drawWeighted([{ name: 'mametchi', weight: 0 }, { name: 'memetchi', weight: 1 }], 3, mulberry32(1))
    expect(picks).toEqual(['memetchi'])
  })
})
