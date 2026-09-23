/**
 * Kuchipatchi's walk along the seam between the top and bottom panel rows.
 * Pure functions so the motion (steady walk, gap jump, edge wrap) is unit-testable.
 */
export interface RailGeometry {
  /** Width of the walkable line in px. */
  width: number
  /** Left and right edges of the vertical gap between the calendar and the rate panel, in px from the line's left end. */
  gapStart: number
  gapEnd: number
  /** Rendered width of the sprite in px. */
  petWidth: number
}

export interface Jump {
  start: number
  duration: number
  from: number
  to: number
  /** A wrap jump leaves the right edge and lands at the left edge. */
  wrap: boolean
}

export interface RailWalker {
  /** Left edge of the sprite in px. */
  x: number
  /** Vertical offset in px; negative while airborne. */
  y: number
  jump: Jump | null
}

export const WALK_SPEED = 36 // px per second
export const JUMP_MS = 800
export const JUMP_HEIGHT = 32
/** Take-off and landing distance on either side of the gap. */
export const JUMP_MARGIN = 28

export function createRailWalker(x = 0): RailWalker {
  return { x, y: 0, jump: null }
}

function arc(t: number): number {
  return -JUMP_HEIGHT * 4 * t * (1 - t)
}

function wrapX(t: number, geo: RailGeometry): number {
  // First half: drift half a body off the right edge. Second half: come in from beyond the left edge.
  const half = geo.petWidth / 2
  return t < 0.5 ? geo.width - geo.petWidth + half * (t / 0.5) : -half + half * ((t - 0.5) / 0.5)
}

export function stepRail(walker: RailWalker, now: number, dtMs: number, geo: RailGeometry): RailWalker {
  if (geo.width <= 0) return walker
  if (walker.jump) {
    const t = Math.min(1, (now - walker.jump.start) / walker.jump.duration)
    if (t >= 1) return { x: walker.jump.wrap ? 0 : walker.jump.to, y: 0, jump: null }
    const x = walker.jump.wrap ? wrapX(t, geo) : walker.jump.from + (walker.jump.to - walker.jump.from) * t
    return { ...walker, x, y: arc(t) }
  }
  const x = walker.x + WALK_SPEED * dtMs / 1000
  const center = x + geo.petWidth / 2
  if (x + geo.petWidth >= geo.width) {
    return { x: geo.width - geo.petWidth, y: 0, jump: { start: now, duration: JUMP_MS, from: geo.width - geo.petWidth, to: geo.width, wrap: true } }
  }
  if (geo.gapEnd > geo.gapStart && center >= geo.gapStart - JUMP_MARGIN && center <= geo.gapStart) {
    return { x, y: 0, jump: { start: now, duration: JUMP_MS, from: x, to: x + (geo.gapEnd - geo.gapStart) + 2 * JUMP_MARGIN, wrap: false } }
  }
  return { x, y: 0, jump: null }
}
