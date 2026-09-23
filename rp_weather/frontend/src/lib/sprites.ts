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
  /** Colors for the shared feet; ignored when the sprite brings its own feet layers. */
  feet: { outline: string; fill: string }
  zzz: string
  /** Grid size; defaults to 40x40. A coarser grid shows bigger dots in the same 80px box. */
  width?: number
  height?: number
  /** Own feet (left/right step independently) and shadow, for sprites not on the 40x40 grid. */
  feetLeft?: Layer[]
  feetRight?: Layer[]
  shadow?: Rect[]
}
export type SpriteName = 'mametchi' | 'memetchi' | 'oyajitchi' | 'gozarutchi' | 'ringotchi' | 'furawatchi' | 'ichigotchi'

export const SPRITE_SIZE = 40
const NAVY = '#1c2a63'
const ZZZ = '#d4e4be'

/** Turns a character grid (one string per row) into layers, one per palette color, as horizontal runs. */
export function gridToLayers(rows: string[], palette: Record<string, string>): Layer[] {
  const layers = new Map<string, Rect[]>()
  rows.forEach((row, y) => {
    let x = 0
    while (x < row.length) {
      const ch = row[x]!
      let w = 1
      while (x + w < row.length && row[x + w] === ch) w++
      if (palette[ch]) (layers.get(ch) ?? layers.set(ch, []).get(ch)!).push([x, y, w, 1])
      x += w
    }
  })
  return [...layers].map(([ch, rects]) => ({ fill: palette[ch]!, rects }))
}

/** Converts rectangles into one SVG path so each layer is a single node. */
export function rectsToPath(rects: Rect[]): string {
  return rects.map(([x, y, w, h]) => `M${x} ${y}h${w}v${h}h-${w}z`).join('')
}

// Sprites on a coarser grid than 40x40 show bigger dots in the same 80px box; the trade-off is a closer match to the chart.
const MAMETCHI_PALETTE = { n: NAVY, y: '#ffe45c', p: '#ffb3c6', w: '#ffffff' }
// Mametchi: transcribed cell by cell from its 28x28 bead chart (30 rows with the shadow). '.' transparent, n navy, y yellow, p pink, w white.
const mametchi: Sprite = {
  name: 'mametchi', label: 'まめっち', width: 28, height: 30,
  body: gridToLayers([
    '............................',
    '.......nnn.......nnn........',
    '......nnnnn.....nnnnn.......',
    '......nnnnnn...nnnnnn.......',
    '.....nnnnnnn...nnnnnnn......',
    '.....nnnnnnn...nnnnnnn......',
    '.....nnnnnnn...nnnnnnn......',
    '.....nnnnnnn...nnnnnnn......',
    '.....nnnnnnnnnnnnnnnnn......',
    '....nnnnnnnnnnnnnnnnnnn.....',
    '...nyyyyyyyyyyyyyyyyyyyn....',
    '..nyyyyyyyyyyyyyyyyyyyyn....',
    '..nyyyyyyyyyyyyyyyyyyyyn....',
    '..nyyyyyyyyyyyyyyyyyyyyn....',
    '..nyyyyyyyyyyyyyyyyyyyyn....',
    '..nyyyyyyyyyyyyyyyyyyyyn....',
    '..nyyyyyyyyyyyyyyyyyyyyn....',
    '...npppyyyyynynyyyyypppn....',
    '....npppyyyyynyyyyypppn.....',
    '.....nnnnnnnnnnnnnnnnn......',
    '........nnnnnnnnnnnn........',
    '.......nyyyyyyyyyyyyn.......',
    '......nnyyyyyyyyyyyynn......',
    '......nnyyyyyyyyyyyynn......',
    '.......nnyyyyyyyyyynn.......',
    '.........nyyynnnyyyn........',
    '............................',
    '............................',
  ], MAMETCHI_PALETTE),
  eyesOpen: gridToLayers([
    '............................',
    '............................',
    '............................',
    '............................',
    '............................',
    '............................',
    '............................',
    '............................',
    '............................',
    '............................',
    '............................',
    '.....nnnnnn....nnnnnn.......',
    '.....nnnnwn....nnnnwn.......',
    '.....nwnnwn....nwnnwn.......',
    '.....nwnnwn....nwnnwn.......',
    '.....nnnnwn....nnnnwn.......',
    '.....nnnnnn....nnnnnn.......',
    '............................',
    '............................',
    '............................',
    '............................',
    '............................',
    '............................',
    '............................',
    '............................',
    '............................',
    '............................',
    '............................',
  ], MAMETCHI_PALETTE),
  eyesClosed: [{ fill: NAVY, rects: [[5,14,6,1],[15,14,6,1]] }],
  feet: { outline: NAVY, fill: '#ffe45c' },
  feetLeft: [{fill: '#1c2a63',rects:[[9,26,1,1],[12,26,1,1],[10,27,1,1],[11,27,1,1]]},{fill: '#ffe45c',rects:[[10,26,1,1],[11,26,1,1]]}],
  feetRight: [{fill: '#1c2a63',rects:[[16,26,1,1],[19,26,1,1],[17,27,1,1],[18,27,1,1]]},{fill: '#ffe45c',rects:[[17,26,1,1],[18,26,1,1]]}],
  shadow: [[8,28,12,1]],
  zzz: ZZZ,
}

const MEMETCHI_PALETTE = { n: NAVY, o: '#f2a93b', w: '#ffffff' }
// Memetchi: transcribed cell by cell from its 31x32 bead chart (33 rows with the shadow). '.' transparent, n navy, o orange, w white.
const memetchi: Sprite = {
  name: 'memetchi', label: 'めめっち', width: 31, height: 33,
  body: gridToLayers([
    '...............................',
    '.............nnnn..............',
    '...........nn....nn............',
    '..........n........n...........',
    '.........n..........n..........',
    '.........n...nnnn...n..........',
    '........n...n....n..n..........',
    '........n..n..nn.n..n..........',
    '........n..n.n...n..n..........',
    '........n..n..nnn...n..........',
    '.........n..n......n...........',
    '.........nnnnnnnnnnnn..........',
    '.......nnoonnonnnnooonn........',
    '......noooooooooooooooon.......',
    '.....noooooooooooooooooon......',
    '.....noooooooooooooooooonn.....',
    '....noooooooooooooooooooonn....',
    '....noooooooooooooooooooonn....',
    '....noooooooooooooooooooon.....',
    '....noooooooooooooooooooon.....',
    '....noooooooooooooooooooon.....',
    '.....noooooooooooooooooon......',
    '.....noooooooooooooooooon......',
    '......noooonnooooonoooon.......',
    '.......nnoooonnnnnooonn........',
    '.........nnnooooooonn..........',
    '............nooooon............',
    '...........nnooooonn...........',
    '..........n..nnnnn..n..........',
    '...............................',
    '...............................',
  ], MEMETCHI_PALETTE),
  eyesOpen: gridToLayers([
    '...............................',
    '...............................',
    '...............................',
    '...............................',
    '...............................',
    '...............................',
    '...............................',
    '...............................',
    '...............................',
    '...............................',
    '...............................',
    '...............................',
    '...............................',
    '...............................',
    '......ononon......nonon........',
    '......ononon......nonon........',
    '......onnwnn......nnwnn........',
    '......onnwnn......nnwnn........',
    '......onwwwn......nwwwn........',
    '......onnwnn......nnwnn........',
    '......oonnno......onnno........',
    '......ononon......nonon........',
    '...............................',
    '...............................',
    '...............................',
    '...............................',
    '...............................',
    '...............................',
    '...............................',
    '...............................',
    '...............................',
  ], MEMETCHI_PALETTE),
  eyesClosed: [{ fill: NAVY, rects: [[7,18,5,1],[18,18,5,1]] }],
  feet: { outline: NAVY, fill: '#f2a93b' },
  feetLeft: [{fill: '#1c2a63',rects:[[14,29,1,1],[14,30,1,1]]}],
  feetRight: [{fill: '#1c2a63',rects:[[16,29,1,1],[16,30,1,1]]}],
  shadow: [[12,32,7,1]],
  zzz: ZZZ,
}

// Oyajitchi: transcribed cell by cell from its 27x31 bead chart (29 rows with the shadow). '.' transparent, k black, p pink.
const OYAJITCHI_PALETTE = { k: '#2b2b2b', p: '#f4b0b0' }
// Oyajitchi: transcribed cell by cell from its 27x31 bead chart (29 rows with the shadow). '.' transparent, k black, p pink.
const oyajitchi: Sprite = {
  name: 'oyajitchi', label: 'おやじっち', width: 27, height: 29,
  body: gridToLayers([
    '...........................',
    '...........................',
    '...........................',
    '...........................',
    '............kk.............',
    '.............kk............',
    '..............k............',
    '.............kk............',
    '............kk.............',
    '.........kkkkkkkkk.........',
    '...kk.kkkpppppppppkkk.kk...',
    '...kkkkkkkkpppppkkkkkkkk...',
    '...kkppppppppppppppppkk....',
    '...kkpppppppppppppppppkk...',
    '....kpppppppppppppppppk....',
    '....kpppppppppppppppppk....',
    '....kpppppkkkkkkkpppppk....',
    '....kpppppkkkkkkkpppppk....',
    '....kpppkkkkkkkkkkkpppk....',
    '....kpkkkkkkkkkkkkkkkpk....',
    '.....kkkkkpppppppkkkkk.....',
    '.....kkkkpppkkkpppkkkk.....',
    '......kkkpppppppppkkk......',
    '.....kkkkkkkkkkkkkkkkk.....',
    '...........................',
    '...........................',
    '...........................',
  ], OYAJITCHI_PALETTE),
  eyesOpen: gridToLayers([
    '...........................',
    '...........................',
    '...........................',
    '...........................',
    '...........................',
    '...........................',
    '...........................',
    '...........................',
    '...........................',
    '...........................',
    '...........................',
    '...........................',
    '...........................',
    '........kk.......kk........',
    '........kk.......kk........',
    '...........................',
    '...........................',
    '...........................',
    '...........................',
    '...........................',
    '...........................',
    '...........................',
    '...........................',
    '...........................',
    '...........................',
    '...........................',
    '...........................',
  ], OYAJITCHI_PALETTE),
  eyesClosed: [{ fill: '#2b2b2b', rects: [[8,14,2,1],[17,14,2,1]] }],
  feet: { outline: '#2b2b2b', fill: '#f4b0b0' },
  feetLeft: [{fill: '#2b2b2b',rects:[[5,24,1,1],[6,24,1,1],[6,25,1,1],[7,25,1,1],[4,26,1,1],[5,26,1,1],[6,26,1,1],[7,26,1,1],[8,26,1,1],[9,26,1,1]]}],
  feetRight: [{fill: '#2b2b2b',rects:[[19,24,1,1],[20,24,1,1],[18,25,1,1],[19,25,1,1],[16,26,1,1],[17,26,1,1],[18,26,1,1],[19,26,1,1],[20,26,1,1],[21,26,1,1]]}],
  shadow: [[6,27,15,1]],
  zzz: ZZZ,
}

// Gozarutchi: transcribed cell by cell from its 35x35 bead chart (34 rows with the shadow). '.' transparent, b blue, c cream.
const GOZARUTCHI_PALETTE = { b: '#1d4fa3', c: '#fff0b0' }
// Gozarutchi: transcribed cell by cell from its 35x35 bead chart (34 rows with the shadow). '.' transparent, b blue, c cream.
const gozarutchi: Sprite = {
  name: 'gozarutchi', label: 'ござるっち', width: 35, height: 34,
  body: gridToLayers([
    '...................................',
    '...................................',
    '.....................b.............',
    '.....................bb............',
    '............bbbbbbbbbbbb...........',
    '..........bbbbbbbbbbbbbbbb.........',
    '..........bbbbbbbbbbbbbbbb.........',
    '.........bbbbbbbbbbbbbbbbbb........',
    '........bbbbbbbbbbbbbbbbbbbb.......',
    '.......bbbbbbbbbbbbbbbbbbbbbb......',
    '.......bbbbbbbbbbbbbbbbbbbbbb......',
    '.....bbbbbcccccccccccccccbbbbbb....',
    '.....bbbbbcccccccccccccccbbbbbb....',
    '.....bbbbbcccccccccccccccbbbbbb....',
    '.....bbbbbcccccccccccccccbbbbbb....',
    '.....bbbbbbbbbbbbbbbbbbbbbbbbbb....',
    '.....bbbbbbbbbbbbbbbbbbbbbbbbbb....',
    '.....bbbbbbbbbbbbbbbbbbbbbbbbbb....',
    '.......bbbbbbbbbbbbbbbbbbbbbb......',
    '.......bbbbbbbbbbbbbbbbbbbbbb......',
    '........bbbbbbbbbbbbbbbbbbbb.......',
    '.........bbbbbbbbbbbbbbbbbb........',
    '..............bb.bb.bb.............',
    '.............bbbb..bbbb............',
    '............bbbbb..bbbbb...........',
    '...........bbb.bbbbbb.bbb..........',
    '...........bb..bbbbbb..bb..........',
    '...................................',
    '...................................',
    '...................................',
    '...................................',
    '...................................',
  ], GOZARUTCHI_PALETTE),
  eyesOpen: gridToLayers([
    '...................................',
    '...................................',
    '...................................',
    '...................................',
    '...................................',
    '...................................',
    '...................................',
    '...................................',
    '...................................',
    '...................................',
    '...................................',
    '...................................',
    '............bb.......bb............',
    '............bb.......bb............',
    '...................................',
    '...................................',
    '...................................',
    '...................................',
    '...................................',
    '...................................',
    '...................................',
    '...................................',
    '...................................',
    '...................................',
    '...................................',
    '...................................',
    '...................................',
    '...................................',
    '...................................',
    '...................................',
    '...................................',
    '...................................',
  ], GOZARUTCHI_PALETTE),
  eyesClosed: [{ fill: '#1d4fa3', rects: [[12,13,2,1],[21,13,2,1]] }],
  feet: { outline: '#1d4fa3', fill: '#fff0b0' },
  feetLeft: [{fill: '#1d4fa3',rects:[[16,27,1,1],[16,28,1,1],[16,29,1,1],[16,30,1,1],[16,31,1,1]]}],
  feetRight: [{fill: '#1d4fa3',rects:[[19,27,1,1],[19,28,1,1],[19,29,1,1],[19,30,1,1],[19,31,1,1]]}],
  shadow: [[13,32,10,1]],
  zzz: ZZZ,
}

// Ringotchi: transcribed cell by cell from its 26x26 bead chart (28 rows with the shadow). '.' transparent, n navy, r red, c cream, p pink, g green.
const RINGOTCHI_PALETTE = { n: '#1f4e8c', r: '#e8322e', c: '#fff6c8', p: '#ff9ab0', g: '#7cc32a' }
const ringotchi: Sprite = {
  name: 'ringotchi', label: 'りんごっち', width: 26, height: 28,
  body: gridToLayers([
    '.............nnnn.........',
    '............nnggn.........',
    '...........nnggnnnnn......',
    '.....nnnnn.nnnnnnrrnnnn...',
    '...nnnrrrnnnnnrrrrrrrnnn..',
    '...nnnrrrnnnnnrrrrrrrrnn..',
    '..nnrrrrrrrnnrrrrrrrrrrnn.',
    '..nrrrrrrrrrrrnnccnrrrrrn.',
    '.nnrrrnnncccnncccccnrrrrn.',
    '.nrrrnccccccccccccccnnrrnn',
    '.nrrrnccccccccccccccnnrrrn',
    '.nrrrcccccccccccccccnnrrrn',
    '.nrrnccccccccccccccccnnrrn',
    '.nrrncccccccccccccccccnrrn',
    '.nrrncpppccccccccpppccrrnn',
    '.nnrrnpppccncncppppcnnrrn.',
    '..nrrnpppccnnnccccccnnnrn.',
    '..nnrrnncccccccccccrrnnn..',
    '...nrnnnccccccccccnrrrnn..',
    '...nnnrrncccccccccnrrrnnn.',
    '....nnrrrnnnnrrnnnrrnnn...',
    '....nnnnrrrrrrrrrrrnnn....',
    '......nnnnnnnnnnnnnn......',
    '..........................',
    '..........................',
    '..........................',
  ], RINGOTCHI_PALETTE),
  eyesOpen: gridToLayers([
    '..........................',
    '..........................',
    '..........................',
    '..........................',
    '..........................',
    '..........................',
    '..........................',
    '..........................',
    '..........................',
    '..........................',
    '.........ncc..ccn.........',
    '.........nnn..nnn.........',
    '.........nnn..nnn.........',
    '.........nnn..nnn.........',
    '..........................',
    '..........................',
    '..........................',
    '..........................',
    '..........................',
    '..........................',
    '..........................',
    '..........................',
    '..........................',
    '..........................',
    '..........................',
    '..........................',
  ], RINGOTCHI_PALETTE),
  eyesClosed: [{ fill: '#1f4e8c', rects: [[9,12,3,1],[14,12,3,1]] }],
  feet: { outline: '#1f4e8c', fill: '#fff6c8' },
  feetLeft: [{fill: '#1f4e8c',rects:[[12,23,1,1],[11,24,1,1],[12,24,1,1],[11,25,1,1],[12,25,1,1]]}],
  feetRight: [{fill: '#1f4e8c',rects:[[16,23,1,1],[16,24,1,1],[17,24,1,1],[16,25,1,1],[17,25,1,1]]}],
  shadow: [[9,26,10,1]],
  zzz: ZZZ,
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
