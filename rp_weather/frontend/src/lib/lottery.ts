import { japanDate } from './time'
import type { SpriteName } from './sprites'

/** Who may walk the seam, with their daily draw weights (percent). */
export const RAIL_CANDIDATES: { name: SpriteName; weight: number }[] = [
  { name: 'mametchi', weight: 19 },
  { name: 'memetchi', weight: 19 },
  { name: 'oyajitchi', weight: 5 },
  { name: 'gozarutchi', weight: 19 },
  { name: 'ringotchi', weight: 19 },
  { name: 'furawatchi', weight: 19 },
]
export const RAIL_WALKER_COUNT = 2

/** One seed per Japan-time calendar day, so every reload that day draws the same pair. */
export function dailySeed(now: Date): number {
  const { year, month, day } = japanDate(now)
  return year * 10000 + month * 100 + day
}

/** Small deterministic PRNG (mulberry32). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6D2B79F5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Weighted draw without replacement: each pick uses the remaining candidates' weights. */
export function drawWeighted<T extends { name: SpriteName; weight: number }>(candidates: T[], count: number, rng: () => number): SpriteName[] {
  const pool = candidates.filter(c => c.weight > 0)
  const picked: SpriteName[] = []
  while (picked.length < count && pool.length) {
    const total = pool.reduce((sum, c) => sum + c.weight, 0)
    let roll = rng() * total
    let index = pool.findIndex(c => (roll -= c.weight) < 0)
    if (index < 0) index = pool.length - 1
    picked.push(pool[index]!.name)
    pool.splice(index, 1)
  }
  return picked
}

/** The seam walkers for one day's seed. Callers that re-render often should key on the seed, not on `now`. */
export function railWalkersForSeed(seed: number): SpriteName[] {
  return drawWeighted(RAIL_CANDIDATES, RAIL_WALKER_COUNT, mulberry32(seed))
}

/** Today's two seam walkers (Japan time), fixed for the whole day. */
export function dailyRailWalkers(now: Date): SpriteName[] {
  return railWalkersForSeed(dailySeed(now))
}
