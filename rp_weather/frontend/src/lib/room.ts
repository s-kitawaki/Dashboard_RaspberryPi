import { japanDate } from './time'

/** Time-of-day phases of the pixel room, in Japan Standard Time. */
export type RoomPhase = 'morning' | 'day' | 'evening' | 'night' | 'bedroom'

export const ROOM_PHASES: RoomPhase[] = ['morning', 'day', 'evening', 'night', 'bedroom']

/** 6:00-10:59 morning, 11:00-13:59 day, 14:00-16:59 evening, 17:00-20:59 night, 21:00-5:59 bedroom. */
export function phaseForHour(hour: number): RoomPhase {
  if (hour >= 6 && hour < 11) return 'morning'
  if (hour >= 11 && hour < 14) return 'day'
  if (hour >= 14 && hour < 17) return 'evening'
  if (hour >= 17 && hour < 21) return 'night'
  return 'bedroom'
}

export function phaseAt(now: Date): RoomPhase {
  return phaseForHour(Number(japanDate(now).hour))
}

/** Everyone in the room sleeps while the bedroom is shown. */
export function isSleepHour(hour: number): boolean {
  return phaseForHour(hour) === 'bedroom'
}

export const PHASE_LABELS: Record<RoomPhase, string> = {
  morning: 'あさ・バスルーム', day: 'ひる・リビング', evening: 'ゆうがた・リビング', night: 'よる・リビング', bedroom: 'よる・寝室',
}

/** A point in percent of the room stage; y is where the character's feet stand. */
export interface Spot { x: number; y: number }
/** The walkable band of floor, in percent of the room stage. */
export interface FloorBand { x: [number, number]; y: [number, number] }

export type Behavior = 'walk' | 'brush' | 'sleep'

export interface PhaseRoom {
  behavior: Behavior
  /** Fixed spots for stationary behaviors, one per resident (wraps around if there are more residents). */
  spots?: Spot[]
  /** A spot the walker prefers (for example the television at night). */
  favorite?: Spot
}

/** Furniture is drawn above this band, so walkers never overlap it. */
export const FLOOR_BAND: FloorBand = { x: [12, 88], y: [56, 88] }

export const PHASE_ROOMS: Record<RoomPhase, PhaseRoom> = {
  morning: { behavior: 'brush', spots: [{ x: 38, y: 80 }, { x: 62, y: 80 }] },
  day: { behavior: 'walk' },
  evening: { behavior: 'walk' },
  night: { behavior: 'walk', favorite: { x: 80, y: 66 } },
  bedroom: { behavior: 'sleep', spots: [{ x: 36, y: 62 }, { x: 60, y: 62 }] },
}

/** Where resident `index` stands during a stationary phase. */
export function spotFor(room: PhaseRoom, index: number): Spot | undefined {
  if (!room.spots?.length) return undefined
  return room.spots[index % room.spots.length]
}

export interface Walker {
  x: number
  y: number
  target: Spot
  facing: 'left' | 'right'
  /** Timestamp (ms) until which the walker rests at its target. */
  restUntil: number
}

const SPEED_PERCENT_PER_SECOND = 7
const REST_MS: [number, number] = [1500, 4500]

function between(range: [number, number], rng: () => number): number {
  return range[0] + (range[1] - range[0]) * rng()
}

/** Picks the next destination; the favorite spot wins half the time when present. */
export function pickTarget(band: FloorBand, rng: () => number, favorite?: Spot): Spot {
  if (favorite && rng() < 0.5) return { ...favorite }
  return { x: between(band.x, rng), y: between(band.y, rng) }
}

export function createWalker(band: FloorBand, rng: () => number, favorite?: Spot): Walker {
  const start = pickTarget(band, rng, favorite)
  return { x: start.x, y: start.y, target: pickTarget(band, rng, favorite), facing: 'right', restUntil: 0 }
}

/** Advances a walker by dt milliseconds; pure so the motion is unit-testable. */
export function stepWalker(walker: Walker, now: number, dtMs: number, band: FloorBand, rng: () => number, favorite?: Spot): Walker {
  if (now < walker.restUntil) return walker
  const dx = walker.target.x - walker.x
  const dy = walker.target.y - walker.y
  const distance = Math.hypot(dx, dy)
  const step = SPEED_PERCENT_PER_SECOND * dtMs / 1000
  if (distance <= step) {
    return { ...walker, x: walker.target.x, y: walker.target.y, target: pickTarget(band, rng, favorite), restUntil: now + between(REST_MS, rng) }
  }
  const facing = Math.abs(dx) < 0.01 ? walker.facing : dx < 0 ? 'left' : 'right'
  return { ...walker, x: walker.x + dx / distance * step, y: walker.y + dy / distance * step, facing }
}

/** Characters nearer the viewer (larger y) are drawn a little larger and in front. */
export function depthScale(y: number, band: FloorBand): number {
  const t = (y - band.y[0]) / (band.y[1] - band.y[0])
  return 0.85 + 0.3 * Math.min(1, Math.max(0, t))
}
