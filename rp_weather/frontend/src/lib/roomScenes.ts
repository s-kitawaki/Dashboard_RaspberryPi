import type { RoomPhase } from './room'

/** Scenes are drawn on a 256x150 canvas and shown at 4x with pixelated scaling. */
export const SCENE_WIDTH = 256
export const SCENE_HEIGHT = 150

type Ctx = CanvasRenderingContext2D

function R(g: Ctx, x: number, y: number, w: number, h: number, c: string) { g.fillStyle = c; g.fillRect(x, y, w, h) }
function stripes(g: Ctx, x: number, y: number, w: number, h: number, a: string, b: string, s: number) {
  for (let i = 0; i < w; i += s) R(g, x + i, y, Math.min(s, w - i), h, (i / s) % 2 ? a : b)
}
function checker(g: Ctx, x: number, y: number, w: number, h: number, a: string, b: string, s: number) {
  for (let j = 0; j < h; j += s) for (let i = 0; i < w; i += s) R(g, x + i, y + j, s, s, ((i / s + j / s) % 2) ? a : b)
}
function frame(g: Ctx, x: number, y: number, w: number, h: number, c: string) {
  R(g, x, y, w, 1, c); R(g, x, y + h - 1, w, 1, c); R(g, x, y, 1, h, c); R(g, x + w - 1, y, 1, h, c)
}
function window_(g: Ctx, x: number, y: number, w: number, h: number, sky: string, ol: string) {
  R(g, x, y, w, h, ol); R(g, x + 1, y + 1, w - 2, h - 2, sky); R(g, x + (w >> 1), y + 1, 1, h - 2, ol); R(g, x + 1, y + (h >> 1), w - 2, 1, ol)
}
function sun(g: Ctx, x: number, y: number, c: string) { R(g, x, y, 4, 4, c); R(g, x - 1, y + 1, 6, 2, c); R(g, x + 1, y - 1, 2, 6, c) }
function cloud(g: Ctx, x: number, y: number, c: string) { R(g, x, y + 1, 7, 2, c); R(g, x + 2, y, 3, 1, c) }
function moon(g: Ctx, x: number, y: number) { R(g, x, y, 6, 6, '#ffe27a'); R(g, x - 2, y + 1, 2, 4, '#0e1436') }
function curtains(g: Ctx, x: number, y: number, w: number, h: number, c: string, d: string) { stripes(g, x, y, w, h, c, d, 2); R(g, x, y + h - 3, w, 1, d) }
function sofa(g: Ctx, x: number, y: number, c: string, d: string, ol: string) {
  R(g, x, y, 34, 14, ol); R(g, x + 1, y + 1, 32, 12, c); R(g, x + 1, y + 6, 32, 1, d)
  R(g, x, y + 5, 4, 9, ol); R(g, x + 30, y + 5, 4, 9, ol); R(g, x + 1, y + 6, 2, 7, c); R(g, x + 31, y + 6, 2, 7, c)
  R(g, x + 3, y + 14, 3, 2, ol); R(g, x + 28, y + 14, 3, 2, ol)
}
function tv(g: Ctx, x: number, y: number, ol: string, on: boolean) {
  R(g, x, y, 26, 20, ol); R(g, x + 1, y + 1, 24, 18, '#3ec9c1'); R(g, x + 3, y + 3, 16, 12, on ? '#ffe27a' : '#22303a')
  if (on) { R(g, x + 6, y + 6, 4, 4, '#ff6f9c'); R(g, x + 12, y + 8, 5, 3, '#3c6fd6') }
  R(g, x + 20, y + 4, 3, 3, '#ff6f9c'); R(g, x + 20, y + 9, 3, 3, '#ffd23f')
  R(g, x + 6, y - 5, 1, 5, ol); R(g, x + 12, y - 5, 1, 5, ol)
  R(g, x - 2, y + 20, 30, 2, ol); R(g, x, y + 22, 2, 5, ol); R(g, x + 24, y + 22, 2, 5, ol)
}
function shelf(g: Ctx, x: number, y: number, ol: string, wood: string) {
  R(g, x, y, 22, 40, ol); R(g, x + 1, y + 1, 20, 38, wood)
  const cols = ['#ff6f9c', '#7fb7e6', '#ffd23f', '#a8ce0b', '#c9a0ff', '#ff9a5c']
  for (let s = 0; s < 3; s++) {
    const yy = y + 3 + s * 12
    R(g, x + 1, yy + 9, 20, 1, ol)
    for (let i = 0; i < 6; i++) R(g, x + 2 + i * 3, yy + (i % 2), 2, 9 - (i % 2), cols[(i + s) % 6]!)
  }
}
function lamp(g: Ctx, x: number, y: number, ol: string, on: boolean) {
  R(g, x, y, 1, 10, ol); R(g, x - 4, y + 10, 9, 4, on ? '#ffe27a' : '#e8dcb0'); R(g, x - 5, y + 9, 11, 1, ol); R(g, x - 4, y + 14, 9, 1, ol)
  if (on) R(g, x - 8, y + 15, 17, 2, 'rgba(255,226,122,.35)')
}
function plant(g: Ctx, x: number, y: number, ol: string) {
  R(g, x, y + 8, 6, 6, '#ff9a5c'); R(g, x - 1, y + 7, 8, 1, ol); R(g, x + 2, y + 2, 2, 6, '#3f8f4a'); R(g, x, y, 2, 4, '#5cbf6a'); R(g, x + 4, y + 1, 2, 4, '#5cbf6a')
}
function rug(g: Ctx, x: number, y: number, w: number, h: number, a: string, b: string, ol: string) { R(g, x, y, w, h, ol); stripes(g, x + 1, y + 1, w - 2, h - 2, a, b, 4) }
function picture(g: Ctx, x: number, y: number, paper: string, ol: string, art: string) { R(g, x, y, 20, 14, paper); frame(g, x, y, 20, 14, ol); R(g, x + 3, y + 3, 14, 8, art) }
function stars(g: Ctx, count: number, maxY: number) {
  for (let i = 0; i < count; i++) R(g, (i * 61) % SCENE_WIDTH, (i * 37) % maxY, 1, 1, i % 3 ? '#8ea2ff' : '#ffffff')
}

// The room stage (bottom-right of the screen) covers canvas x 134-250, y 88-147. Panels hide anything above y 88
// on the right, so the furniture that should be seen sits between y 90 and the rug at y 118.

function morning(g: Ctx) {
  checker(g, 0, 0, 256, 92, '#cfeaff', '#eaf6ff', 6)
  R(g, 0, 90, 256, 3, '#7fb7e6'); R(g, 0, 93, 256, 2, '#ffffff')
  checker(g, 0, 95, 256, 55, '#ffe9a8', '#fff7d6', 8)
  R(g, 84, 10, 44, 30, '#4a6a8a'); R(g, 86, 12, 40, 26, '#ffd9a8'); R(g, 86, 12, 40, 10, '#ffb27a'); sun(g, 104, 18, '#ff6f4a'); cloud(g, 90, 16, '#fff')
  R(g, 8, 58, 60, 34, '#ffffff'); frame(g, 8, 58, 60, 34, '#4a6a8a'); R(g, 20, 62, 36, 8, '#dff6ff'); frame(g, 20, 62, 36, 8, '#4a6a8a'); R(g, 36, 54, 4, 8, '#7fb7e6'); R(g, 34, 52, 8, 3, '#4a6a8a')
  R(g, 60, 50, 6, 8, '#ff8fb8'); R(g, 61, 46, 1, 5, '#7fb7e6'); R(g, 63, 45, 1, 6, '#ffd23f')
  R(g, 150, 20, 8, 22, '#ff8fb8'); R(g, 162, 20, 8, 22, '#ffd23f'); R(g, 148, 18, 24, 2, '#4a6a8a')
  R(g, 232, 12, 3, 40, '#7fb7e6'); R(g, 226, 8, 15, 4, '#4a6a8a'); for (let i = 0; i < 5; i++) R(g, 224 + i * 4, 14 + (i % 2) * 3, 1, 6, '#bfe3ff')
  R(g, 176, 96, 70, 22, '#ffffff'); frame(g, 176, 96, 70, 22, '#4a6a8a'); R(g, 180, 100, 62, 10, '#bfe3ff'); R(g, 186, 98, 8, 4, '#ffffff'); R(g, 202, 97, 10, 5, '#ffffff'); R(g, 222, 99, 6, 3, '#ffffff')
  R(g, 236, 88, 6, 8, '#7fb7e6'); R(g, 234, 86, 10, 3, '#4a6a8a')
  rug(g, 140, 118, 100, 22, '#bfe3ff', '#dff6ff', '#7fb7e6')
  R(g, 24, 100, 30, 12, '#ff8fb8'); frame(g, 24, 100, 30, 12, '#a04a6a')
}

function living(g: Ctx, tone: 'day' | 'evening' | 'night') {
  const wall = tone === 'day' ? ['#ffd9e8', '#ffeaf2'] : tone === 'evening' ? ['#ffc9a8', '#ffdcc2'] : ['#2a3a6a', '#324478']
  const rail = tone === 'day' ? ['#f2a9c7', '#ffffff'] : tone === 'evening' ? ['#e08a5c', '#fff1dc'] : ['#5464b8', '#8ea2ff']
  const floor = tone === 'day' ? ['#bff0dc', '#e8fff5'] : tone === 'evening' ? ['#f0c98f', '#ffe3b8'] : ['#3a5a5a', '#456a68']
  const ol = tone === 'day' ? '#4a4a6a' : tone === 'evening' ? '#4a3a3a' : '#1b2350'
  const curtain = tone === 'day' ? ['#ffb3cf', '#ff8fb8'] : tone === 'evening' ? ['#ff9a5c', '#e06f3c'] : ['#6f7fd0', '#5464b8']
  stripes(g, 0, 0, 256, 92, wall[0]!, wall[1]!, 6)
  R(g, 0, 90, 256, 3, rail[0]!); R(g, 0, 93, 256, 2, rail[1]!)
  checker(g, 0, 95, 256, 55, floor[0]!, floor[1]!, 8)
  if (tone === 'day') { window_(g, 84, 12, 40, 28, '#a6dcff', ol); sun(g, 112, 17, '#ffd23f'); cloud(g, 90, 22, '#fff') }
  else if (tone === 'evening') { window_(g, 84, 12, 40, 28, '#ff8a5c', ol); R(g, 85, 13, 38, 8, '#ffc25c'); R(g, 85, 30, 38, 9, '#8a3a6a'); sun(g, 100, 25, '#ffd23f'); R(g, 96, 20, 6, 2, '#ffe27a') }
  else { window_(g, 84, 12, 40, 28, '#0e1436', ol); moon(g, 112, 16); R(g, 90, 22, 1, 1, '#fff'); R(g, 96, 30, 1, 1, '#fff'); R(g, 102, 18, 1, 1, '#fff') }
  curtains(g, 76, 10, 8, 32, curtain[0]!, curtain[1]!); curtains(g, 124, 10, 8, 32, curtain[0]!, curtain[1]!)
  lamp(g, 40, 0, ol, tone === 'night'); if (tone === 'night') lamp(g, 200, 0, ol, true)
  shelf(g, 6, 50, ol, tone === 'day' ? '#ffe0a3' : tone === 'evening' ? '#e8b880' : '#7a6ab8')
  picture(g, 150, 26, tone === 'night' ? '#e8ecff' : '#fff1dc', ol, tone === 'evening' ? '#ff6f4a' : '#ffd23f')
  if (tone === 'day') sofa(g, 142, 98, '#9fe7d3', '#6fd0b8', ol)
  else if (tone === 'evening') sofa(g, 142, 98, '#e8a878', '#c9855a', ol)
  else sofa(g, 142, 98, '#5fb0a0', '#3f8a7c', ol)
  tv(g, 214, 92, ol, tone === 'night'); if (tone === 'night') R(g, 208, 114, 38, 4, 'rgba(255,226,122,.25)')
  if (tone === 'day') rug(g, 138, 118, 100, 22, '#ffd9e8', '#ffeaf2', '#f2a9c7')
  else if (tone === 'evening') rug(g, 138, 118, 100, 22, '#ff9a5c', '#ffb98a', '#e06f3c')
  else rug(g, 138, 118, 100, 22, '#5a4a9a', '#6f5fb0', '#2a2a4a')
  plant(g, 246, 100, ol)
  R(g, 40, 110, 26, 14, tone === 'day' ? '#c9a0ff' : tone === 'evening' ? '#e08a5c' : '#7a6ab8'); frame(g, 40, 110, 26, 14, ol)
  if (tone === 'night') { R(g, 60, 104, 8, 6, '#ffd23f'); R(g, 62, 102, 4, 2, ol) }
}

function bedroom(g: Ctx) {
  R(g, 0, 0, 256, 96, '#1b2350'); stars(g, 40, 80)
  R(g, 0, 94, 256, 3, '#3b4a8a'); checker(g, 0, 97, 256, 53, '#3a2f6b', '#463a7d', 8)
  window_(g, 84, 12, 40, 28, '#0e1436', '#7f8fd6'); moon(g, 112, 16); R(g, 92, 24, 1, 1, '#fff'); R(g, 98, 30, 1, 1, '#fff')
  curtains(g, 76, 10, 8, 32, '#6f7fd0', '#5464b8'); curtains(g, 124, 10, 8, 32, '#6f7fd0', '#5464b8')
  shelf(g, 6, 50, '#2a2a4a', '#5a4a9a'); lamp(g, 40, 0, '#3b4a8a', false)
  R(g, 146, 88, 76, 5, '#2a2a4a'); R(g, 148, 93, 72, 26, '#2a2a4a'); R(g, 150, 95, 68, 22, '#7f8fd6'); R(g, 150, 95, 68, 8, '#ffffff'); R(g, 154, 97, 16, 5, '#ffd9e8')
  stripes(g, 150, 103, 68, 14, '#ff8fb8', '#ffb3cf', 6); R(g, 148, 119, 4, 6, '#2a2a4a'); R(g, 216, 119, 4, 6, '#2a2a4a')
  R(g, 228, 102, 20, 16, '#2a2a4a'); R(g, 230, 104, 16, 12, '#c9a0ff'); R(g, 234, 92, 8, 10, '#ffe27a'); R(g, 233, 90, 10, 2, '#2a2a4a'); R(g, 230, 102, 16, 2, 'rgba(255,226,122,.5)')
  rug(g, 138, 126, 100, 16, '#463a7d', '#5a4a9a', '#2a2a4a')
  plant(g, 60, 80, '#2a2a4a')
}

export const SCENES: Record<RoomPhase, (g: Ctx) => void> = {
  morning,
  day: g => living(g, 'day'),
  evening: g => living(g, 'evening'),
  night: g => living(g, 'night'),
  bedroom,
}

export function drawScene(canvas: HTMLCanvasElement, phase: RoomPhase): void {
  const g = canvas.getContext('2d')
  if (!g) return
  g.imageSmoothingEnabled = false
  g.clearRect(0, 0, SCENE_WIDTH, SCENE_HEIGHT)
  SCENES[phase](g)
}
