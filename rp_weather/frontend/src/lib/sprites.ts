/**
 * Front-facing 40x40 pixel sprites, authored as integer rectangles so they stay crisp and easy to edit.
 * Feet sit on rows 31-36 like Kuchipatchi so every character stands on the same ground line.
 */
export type Rect = [x: number, y: number, w: number, h: number]
export interface Layer { fill: string; rects: Rect[] }
export interface Sprite {
  name: SpriteName
  label: string
  body: Layer[]
  eyesOpen: Layer[]
  eyesClosed: Layer[]
  feet: { outline: string; fill: string }
  zzz: string
}
export type SpriteName = 'mametchi' | 'memetchi' | 'oyajitchi' | 'gozarutchi' | 'ringotchi' | 'furawatchi' | 'ichigotchi'

export const SPRITE_SIZE = 40
const NAVY = '#1c2a63'
const ZZZ = '#d4e4be'

/** Converts rectangles into one SVG path so each layer is a single node. */
export function rectsToPath(rects: Rect[]): string {
  return rects.map(([x, y, w, h]) => `M${x} ${y}h${w}v${h}h-${w}z`).join('')
}

const mametchi: Sprite = {
  name: 'mametchi', label: 'まめっち',
  body: [
    { fill: NAVY, rects: [[9, 2, 6, 6], [25, 2, 6, 6], [8, 6, 24, 2], [7, 8, 26, 19], [11, 27, 18, 4]] },
    { fill: '#ffe45c', rects: [[8, 14, 24, 12], [12, 27, 16, 3]] },
    { fill: '#ff9ab0', rects: [[9, 22, 3, 2], [28, 22, 3, 2]] },
    { fill: NAVY, rects: [[19, 23, 2, 1]] },
  ],
  eyesOpen: [{ fill: NAVY, rects: [[11, 16, 6, 6], [23, 16, 6, 6]] }, { fill: '#ffffff', rects: [[12, 17, 2, 2], [24, 17, 2, 2]] }],
  eyesClosed: [{ fill: NAVY, rects: [[11, 19, 6, 1], [23, 19, 6, 1]] }],
  feet: { outline: NAVY, fill: '#ffe45c' }, zzz: ZZZ,
}

const memetchi: Sprite = {
  name: 'memetchi', label: 'めめっち',
  body: [
    { fill: NAVY, rects: [[18, 1, 4, 1], [17, 2, 1, 4], [22, 2, 1, 3], [19, 3, 3, 1], [21, 4, 1, 1], [19, 5, 2, 1]] },
    { fill: NAVY, rects: [[9, 6, 22, 2], [7, 8, 26, 18], [9, 26, 22, 2], [13, 28, 14, 3]] },
    { fill: '#f2a93b', rects: [[10, 7, 20, 2], [8, 9, 24, 16], [10, 25, 20, 2], [14, 28, 12, 2]] },
    { fill: '#ff9ab0', rects: [[9, 21, 2, 2], [29, 21, 2, 2]] },
    { fill: NAVY, rects: [[19, 23, 2, 1]] },
  ],
  eyesOpen: [{ fill: NAVY, rects: [[11, 13, 7, 8], [22, 13, 7, 8]] }, { fill: '#ffffff', rects: [[13, 15, 3, 1], [14, 14, 1, 3], [24, 15, 3, 1], [25, 14, 1, 3]] }],
  eyesClosed: [{ fill: NAVY, rects: [[11, 17, 7, 1], [22, 17, 7, 1]] }],
  feet: { outline: NAVY, fill: '#f2a93b' }, zzz: ZZZ,
}

const oyajitchi: Sprite = {
  name: 'oyajitchi', label: 'おやじっち',
  body: [
    { fill: '#2b2b2b', rects: [[19, 2, 2, 1], [21, 3, 1, 2], [20, 5, 1, 1], [19, 6, 1, 2], [6, 6, 6, 3], [28, 6, 6, 3], [6, 8, 28, 18], [12, 26, 16, 5]] },
    { fill: '#f4b0b0', rects: [[7, 9, 26, 16], [13, 26, 14, 4]] },
    { fill: '#2b2b2b', rects: [[8, 17, 3, 2], [29, 17, 3, 2], [10, 18, 20, 3], [18, 22, 4, 1]] },
  ],
  eyesOpen: [{ fill: '#2b2b2b', rects: [[12, 13, 3, 3], [25, 13, 3, 3]] }],
  eyesClosed: [{ fill: '#2b2b2b', rects: [[12, 15, 3, 1], [25, 15, 3, 1]] }],
  feet: { outline: '#2b2b2b', fill: '#f4b0b0' }, zzz: ZZZ,
}

const gozarutchi: Sprite = {
  name: 'gozarutchi', label: 'ござるっち',
  body: [
    { fill: '#1d4fa3', rects: [[19, 0, 2, 2], [11, 2, 18, 2], [8, 4, 24, 3], [6, 7, 28, 16], [8, 23, 24, 3], [11, 26, 18, 2], [14, 28, 12, 3]] },
    { fill: '#fff0b0', rects: [[10, 12, 20, 6]] },
  ],
  eyesOpen: [{ fill: '#1d4fa3', rects: [[14, 14, 3, 3], [23, 14, 3, 3]] }],
  eyesClosed: [{ fill: '#1d4fa3', rects: [[14, 16, 3, 1], [23, 16, 3, 1]] }],
  feet: { outline: '#1d4fa3', fill: '#3a6fd0' }, zzz: ZZZ,
}

const ringotchi: Sprite = {
  name: 'ringotchi', label: 'りんごっち',
  body: [
    { fill: '#1f4e8c', rects: [[20, 5, 2, 4], [9, 8, 22, 2], [7, 10, 26, 2], [5, 12, 30, 14], [7, 26, 26, 3], [9, 29, 22, 2]] },
    { fill: '#7cc32a', rects: [[22, 5, 5, 2], [24, 4, 2, 1]] },
    { fill: '#e8322e', rects: [[10, 9, 20, 2], [8, 11, 24, 2], [6, 13, 28, 12], [8, 25, 24, 3], [10, 28, 20, 2]] },
    { fill: '#1f4e8c', rects: [[10, 14, 20, 1], [9, 15, 1, 11], [30, 15, 1, 11], [10, 26, 20, 1]] },
    { fill: '#fff6c8', rects: [[10, 15, 20, 11]] },
    { fill: '#ff9ab0', rects: [[11, 22, 2, 2], [27, 22, 2, 2]] },
    { fill: '#1f4e8c', rects: [[19, 23, 2, 1]] },
  ],
  eyesOpen: [{ fill: '#1f4e8c', rects: [[13, 18, 3, 3], [24, 18, 3, 3]] }],
  eyesClosed: [{ fill: '#1f4e8c', rects: [[13, 20, 3, 1], [24, 20, 3, 1]] }],
  feet: { outline: '#1f4e8c', fill: '#e8322e' }, zzz: ZZZ,
}

const furawatchi: Sprite = {
  name: 'furawatchi', label: 'ふらわっち',
  body: [
    { fill: '#ffe93a', rects: [[6, 2, 3, 2], [4, 4, 7, 3], [6, 7, 3, 2]] },
    { fill: '#8dd26a', rects: [[30, 3, 4, 2], [29, 5, 6, 2], [31, 7, 3, 2]] },
    { fill: NAVY, rects: [[9, 7, 22, 2], [7, 9, 26, 16], [9, 25, 22, 2], [13, 27, 14, 4]] },
    { fill: '#f2a0c0', rects: [[10, 8, 20, 2], [8, 10, 24, 14], [10, 24, 20, 2], [14, 27, 12, 3]] },
    { fill: '#e85a8a', rects: [[10, 18, 3, 2], [27, 18, 3, 2]] },
    { fill: NAVY, rects: [[18, 19, 4, 1]] },
  ],
  eyesOpen: [{ fill: NAVY, rects: [[12, 13, 3, 3], [25, 13, 3, 3]] }, { fill: '#ffffff', rects: [[12, 13, 1, 1], [25, 13, 1, 1]] }],
  eyesClosed: [{ fill: NAVY, rects: [[12, 15, 3, 1], [25, 15, 3, 1]] }],
  feet: { outline: NAVY, fill: '#f2a0c0' }, zzz: ZZZ,
}

const ichigotchi: Sprite = {
  name: 'ichigotchi', label: 'いちごっち',
  body: [
    { fill: NAVY, rects: [[18, 2, 4, 1], [16, 3, 8, 1], [14, 4, 12, 1], [12, 5, 16, 1], [10, 6, 20, 1], [8, 7, 24, 1], [6, 8, 28, 1], [5, 9, 30, 17], [6, 26, 28, 2], [8, 28, 24, 3]] },
    { fill: '#e0302a', rects: [[18, 3, 4, 1], [16, 4, 8, 1], [14, 5, 12, 1], [12, 6, 16, 1], [10, 7, 20, 1], [8, 8, 24, 1], [6, 9, 28, 16], [7, 25, 26, 2], [9, 27, 22, 2], [10, 29, 20, 1]] },
    { fill: NAVY, rects: [[14, 8, 1, 1], [21, 7, 1, 1], [26, 10, 1, 1], [9, 12, 1, 1], [31, 14, 1, 1], [8, 20, 1, 1], [30, 22, 1, 1]] },
    { fill: NAVY, rects: [[11, 12, 18, 1], [10, 13, 1, 13], [29, 13, 1, 13], [11, 26, 18, 1]] },
    { fill: '#f8d9b0', rects: [[11, 13, 18, 13]] },
    { fill: '#ff9ab0', rects: [[12, 21, 3, 2], [25, 22, 3, 2]] },
    { fill: NAVY, rects: [[19, 23, 2, 1]] },
  ],
  eyesOpen: [{ fill: NAVY, rects: [[14, 17, 3, 3], [23, 18, 3, 3]] }],
  eyesClosed: [{ fill: NAVY, rects: [[14, 19, 3, 1], [23, 20, 3, 1]] }],
  feet: { outline: NAVY, fill: '#4caf50' }, zzz: ZZZ,
}

export const SPRITES: Record<SpriteName, Sprite> = { mametchi, memetchi, oyajitchi, gozarutchi, ringotchi, furawatchi, ichigotchi }
export const SPRITE_NAMES = Object.keys(SPRITES) as SpriteName[]

/** Feet are shared: left and right, outline then fill, on rows 31-36. */
export const FEET: { left: { outline: Rect[]; fill: Rect[] }; right: { outline: Rect[]; fill: Rect[] } } = {
  left: { outline: [[10, 31, 8, 5]], fill: [[11, 32, 6, 3]] },
  right: { outline: [[22, 31, 8, 5]], fill: [[23, 32, 6, 3]] },
}
export const SHADOW: Rect[] = [[10, 37, 20, 1]]
export const ZZZ_PATH = 'M29 6h5v1h-1v1h-1v1h-1v1h3v1h-5V9h1V8h1V7h-2zM35 1h4v1h-1v1h-1v1h2v1h-4V4h1V3h1V2h-2z'
