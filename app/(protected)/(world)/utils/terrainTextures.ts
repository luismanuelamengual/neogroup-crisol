import { artUrl, loadArtManifest } from '@/app/(protected)/(art)/utils/art'
import { TERRAINS } from '@/app/(protected)/(engine)/data/terrains'
import { Terrain } from '@/app/(protected)/(engine)/models/Terrain'
import { createRandom, Random } from '@/app/(protected)/(engine)/utils/random'

/**
 * The repeating texture of each terrain, and the one of the faces of the
 * cliffs, as pixels: their final art when it exists (`tiles/<terrain>` and
 * `tiles/cliff`, see `yarn art`) and otherwise a provisional one painted here
 * (noise, blades of grass, stones...). Every texture wraps around without a
 * seam.
 */

export interface TerrainTexture {
  size: number
  /** RGBA, row by row. */
  data: Uint8ClampedArray
  /** Average color, for the map seen from far. */
  average: [number, number, number]
}

/** Everything the ground is drawn with. */
export interface GroundTextures {
  terrains: Map<Terrain, TerrainTexture>
  cliff: TerrainTexture
}

/** Side of the provisional textures. */
const SIZE = 128

type Rgb = [number, number, number]

interface Look {
  base: Rgb
  dark: Rgb
  light: Rgb
  pattern: 'speckles' | 'blades' | 'cobbles' | 'slabs' | 'cracks' | 'ripples' | 'waves' | 'crust' | 'flow'
  /** Color that glows in the cracks, the joints or a few specks (embers, alien light). */
  glow?: Rgb
}

const LOOKS: Record<Terrain, Look> = {
  [Terrain.GRASS]: { base: [92, 168, 60], dark: [52, 112, 40], light: [150, 204, 88], pattern: 'blades' },
  [Terrain.MOSS]: { base: [44, 108, 56], dark: [22, 64, 38], light: [86, 146, 70], pattern: 'blades' },
  [Terrain.SNOW]: { base: [226, 236, 246], dark: [178, 196, 222], light: [255, 255, 255], pattern: 'speckles' },
  [Terrain.SAND]: { base: [222, 178, 98], dark: [184, 134, 70], light: [244, 212, 140], pattern: 'ripples' },
  [Terrain.ASH]: { base: [78, 70, 82], dark: [46, 40, 52], light: [118, 108, 118], pattern: 'speckles' },
  [Terrain.DIRT]: { base: [136, 96, 58], dark: [92, 62, 38], light: [176, 132, 86], pattern: 'speckles' },
  [Terrain.ROCK]: { base: [118, 124, 138], dark: [62, 66, 80], light: [160, 166, 178], pattern: 'cracks' },
  [Terrain.ICE]: { base: [150, 206, 236], dark: [92, 156, 200], light: [228, 246, 255], pattern: 'cracks' },
  [Terrain.STONE]: { base: [180, 166, 138], dark: [94, 82, 64], light: [216, 206, 182], pattern: 'slabs' },
  [Terrain.COBBLESTONE]: { base: [190, 160, 116], dark: [86, 64, 42], light: [228, 204, 156], pattern: 'cobbles' },
  [Terrain.WATER]: { base: [56, 138, 206], dark: [34, 96, 168], light: [170, 222, 250], pattern: 'waves' },
  [Terrain.LAVA]: { base: [255, 112, 12], dark: [196, 28, 10], light: [255, 236, 110], pattern: 'flow' },
  [Terrain.SCORCHED]: {
    base: [124, 38, 24],
    dark: [66, 16, 12],
    light: [176, 70, 36],
    pattern: 'cracks',
    glow: [255, 140, 36]
  },
  [Terrain.MAGMA]: { base: [214, 66, 18], dark: [58, 18, 14], light: [255, 206, 72], pattern: 'crust' },
  [Terrain.FIRESTONE]: {
    base: [214, 102, 40],
    dark: [104, 32, 14],
    light: [244, 152, 66],
    pattern: 'slabs'
  },
  [Terrain.GLOOM]: {
    base: [38, 20, 54],
    dark: [14, 6, 22],
    light: [74, 40, 100],
    pattern: 'speckles',
    glow: [196, 116, 255]
  },
  [Terrain.MYCELIUM]: {
    base: [82, 30, 110],
    dark: [36, 10, 56],
    light: [176, 82, 222],
    pattern: 'blades',
    glow: [240, 150, 255]
  },
  [Terrain.RUNESTONE]: {
    base: [70, 50, 98],
    dark: [20, 12, 32],
    light: [112, 86, 148],
    pattern: 'slabs',
    glow: [132, 76, 200]
  },
  [Terrain.ICHOR]: { base: [128, 44, 208], dark: [44, 12, 86], light: [226, 160, 255], pattern: 'flow' },
  [Terrain.BASALT]: {
    base: [44, 28, 28],
    dark: [18, 10, 10],
    light: [78, 50, 46],
    pattern: 'cracks',
    glow: [150, 36, 20]
  },
  [Terrain.GLACIER]: { base: [168, 214, 240], dark: [104, 162, 210], light: [236, 250, 255], pattern: 'cracks' },
  [Terrain.LEAVES]: { base: [194, 102, 40], dark: [134, 50, 26], light: [242, 178, 68], pattern: 'speckles' },
  [Terrain.NEEDLES]: { base: [112, 78, 46], dark: [70, 46, 28], light: [150, 112, 64], pattern: 'blades' },
  [Terrain.BLIGHT]: {
    base: [60, 44, 72],
    dark: [30, 20, 42],
    light: [96, 74, 110],
    pattern: 'speckles',
    glow: [150, 230, 90]
  }
}

/** The provisional textures. */
export function paintGroundTextures(): GroundTextures {
  return {
    terrains: new Map(TERRAINS.map((terrain, index) => [terrain, paintTerrain(terrain, createRandom(0x7e77 + index))])),
    cliff: paintCliff(createRandom(0xc11f))
  }
}

/** The textures with the final art of the ones that have it (null when none has). */
export async function loadGroundArt(provisional: GroundTextures): Promise<GroundTextures | null> {
  const { images } = await loadArtManifest()
  const read = async (id: string) => (images[id] ? await readImage(artUrl(id)).catch(() => null) : null)
  const terrains = new Map(provisional.terrains)
  let found = 0

  await Promise.all(
    TERRAINS.map(async (terrain) => {
      const art = await read(`tiles/${terrain}`)

      if (art) {
        terrains.set(terrain, art)
        found++
      }
    })
  )

  const cliff = await read('tiles/cliff')

  return found || cliff ? { terrains, cliff: cliff ?? provisional.cliff } : null
}

async function readImage(url: string): Promise<TerrainTexture> {
  const bitmap = await createImageBitmap(await (await fetch(url)).blob())
  const size = Math.min(bitmap.width, bitmap.height)
  const canvas = document.createElement('canvas')

  canvas.width = size
  canvas.height = size

  const context = canvas.getContext('2d')!

  context.drawImage(bitmap, 0, 0, size, size, 0, 0, size, size)

  return withAverage(size, context.getImageData(0, 0, size, size).data)
}

/** The provisional texture of a terrain. */
function paintTerrain(terrain: Terrain, random: Random): TerrainTexture {
  const { base, dark, light, pattern, glow } = LOOKS[terrain]
  const data = new Uint8ClampedArray(SIZE * SIZE * 4)
  const broad = periodicNoise(random, 4)
  const fine = periodicNoise(random, 16)
  const cells = pattern === 'cobbles' ? 30 : pattern === 'slabs' ? 9 : pattern === 'crust' ? 12 : 7
  const voronoi = ['cobbles', 'slabs', 'cracks', 'crust'].includes(pattern) ? periodicVoronoi(random, cells) : null
  const cellShade = Array.from({ length: cells }, () => random())

  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      // From -1 (dark) to 1 (light).
      let tone = (broad(x, y) - 0.5) * 0.9 + (fine(x, y) - 0.5) * 0.6
      let color = base

      if (pattern === 'flow') {
        // Swirling bands of molten liquid: four per side, bent by the noise, so they wrap around.
        const bend = broad(x, y) * 2.4 + fine(x, y) * 0.6
        const band = Math.sin(((x + y * 0.5) / SIZE) * Math.PI * 2 * 4 + bend * Math.PI)

        tone = band * 0.85 + (fine(x, y) - 0.5) * 0.5
      }

      if (pattern === 'ripples') {
        // Five ripples per side, so they wrap around.
        tone += Math.sin(((y + broad(x, y) * 30) / SIZE) * Math.PI * 2 * 5) * 0.35
      }

      if (voronoi) {
        const { cell, first, second } = voronoi(x, y)
        const border = second - first

        if (pattern === 'crust') {
          // Dark crust with glowing cracks.
          color = border < 3 ? light : border < 6 ? base : dark
          tone = border < 6 ? 0 : (cellShade[cell] - 0.5) * 0.6
        } else if (pattern === 'cracks') {
          color = border < 1.4 ? (glow ?? (terrain === Terrain.ICE ? light : dark)) : base
          tone = border < 1.4 && glow ? 0 : tone
        } else if (border < (pattern === 'cobbles' ? 2.2 : 1.6)) {
          color = glow ?? dark
          tone = 0
        } else {
          tone += (cellShade[cell] - 0.5) * 0.7
          // Rounded stones: light towards the middle.
          tone += pattern === 'cobbles' ? Math.min(1, border / 9) * 0.5 - 0.2 : 0
        }
      }

      const target = tone < 0 ? dark : light
      const share = Math.min(1, Math.abs(tone)) * 0.6
      const offset = (y * SIZE + x) * 4

      data[offset] = color[0] + (target[0] - color[0]) * share
      data[offset + 1] = color[1] + (target[1] - color[1]) * share
      data[offset + 2] = color[2] + (target[2] - color[2]) * share
      data[offset + 3] = 255
    }
  }

  if (pattern === 'blades' || pattern === 'speckles' || pattern === 'waves') {
    strokes(data, random, pattern, dark, light, glow)
  }

  return withAverage(SIZE, data)
}

/** The provisional face of a cliff: earth and rock in vertical streaks, with a few roots and cracks across. */
function paintCliff(random: Random): TerrainTexture {
  const base: Rgb = [128, 98, 70]
  const dark: Rgb = [66, 46, 32]
  const light: Rgb = [176, 142, 104]
  const data = new Uint8ClampedArray(SIZE * SIZE * 4)
  const streaks = periodicNoise(random, 24)
  const broad = periodicNoise(random, 4)
  const fine = periodicNoise(random, 32)

  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const tone = (streaks(x, 0) - 0.5) * 1.6 + (broad(x, y) - 0.5) * 0.6 + (fine(x, y) - 0.5) * 0.4
      const target = tone < 0 ? dark : light
      const share = Math.min(1, Math.abs(tone)) * 0.7
      const offset = (y * SIZE + x) * 4

      data[offset] = base[0] + (target[0] - base[0]) * share
      data[offset + 1] = base[1] + (target[1] - base[1]) * share
      data[offset + 2] = base[2] + (target[2] - base[2]) * share
      data[offset + 3] = 255
    }
  }

  for (let index = 0; index < 18; index++) {
    const x = Math.floor(random() * SIZE)
    const y = Math.floor(random() * SIZE)
    const length = 6 + Math.floor(random() * 14)

    for (let step = 0; step < length; step++) {
      const offset = (((y + Math.round(Math.sin(step / 3) * 1.5) + SIZE) % SIZE) * SIZE + ((x + step) % SIZE)) * 4

      data.set(dark, offset)
    }
  }

  return withAverage(SIZE, data)
}

/** Blades of grass, specks or short wave crests over the texture (some glowing), wrapping around its sides. */
function strokes(
  data: Uint8ClampedArray,
  random: Random,
  pattern: Look['pattern'],
  dark: Rgb,
  light: Rgb,
  glow?: Rgb
): void {
  const count = pattern === 'blades' ? 260 : pattern === 'waves' ? 40 : 220

  const put = (x: number, y: number, color: Rgb) => {
    const offset = ((((y % SIZE) + SIZE) % SIZE) * SIZE + (((x % SIZE) + SIZE) % SIZE)) * 4

    data.set(color, offset)
  }

  for (let index = 0; index < count; index++) {
    const x = Math.floor(random() * SIZE)
    const y = Math.floor(random() * SIZE)
    const roll = random()
    // A few glowing ones (embers, alien light) among the dark and light ones.
    const color = glow && roll > 0.88 ? glow : roll < 0.55 ? dark : light

    if (pattern === 'blades') {
      const length = 3 + Math.floor(random() * 4)
      const lean = random() < 0.5 ? -1 : 1

      for (let step = 0; step < length; step++) {
        put(x + (step > length / 2 ? lean : 0), y - step, color)
      }
    } else if (pattern === 'waves') {
      const length = 6 + Math.floor(random() * 8)

      for (let step = 0; step < length; step++) {
        put(x + step, y - Math.round(Math.sin((step / length) * Math.PI) * 2), light)
      }
    } else {
      put(x, y, color)

      if (random() < 0.4) {
        put(x + 1, y, color)
      }
    }
  }
}

function withAverage(size: number, data: Uint8ClampedArray): TerrainTexture {
  const total = [0, 0, 0]

  for (let offset = 0; offset < data.length; offset += 4) {
    total[0] += data[offset]
    total[1] += data[offset + 1]
    total[2] += data[offset + 2]
  }

  const count = data.length / 4

  return { size, data, average: [total[0] / count, total[1] / count, total[2] / count] }
}

/** Value noise in [0, 1] over the texture, `cells` per side, that wraps around. */
function periodicNoise(random: Random, cells: number): (x: number, y: number) => number {
  const values = Array.from({ length: cells * cells }, () => random())
  const at = (column: number, row: number) => values[(row % cells) * cells + (column % cells)]
  const smooth = (t: number) => t * t * (3 - 2 * t)

  return (x, y) => {
    const u = (x / SIZE) * cells
    const v = (y / SIZE) * cells
    const column = Math.floor(u)
    const row = Math.floor(v)
    const tx = smooth(u - column)
    const ty = smooth(v - row)
    const top = at(column, row) * (1 - tx) + at(column + 1, row) * tx
    const bottom = at(column, row + 1) * (1 - tx) + at(column + 1, row + 1) * tx

    return top * (1 - ty) + bottom * ty
  }
}

/** Cells around random seeds that wrap around: the closest seed and the distances to the two closest ones. */
function periodicVoronoi(
  random: Random,
  count: number
): (x: number, y: number) => { cell: number; first: number; second: number } {
  const seeds = Array.from({ length: count }, () => [random() * SIZE, random() * SIZE])

  return (x, y) => {
    let cell = 0
    let first = Infinity
    let second = Infinity

    seeds.forEach(([sx, sy], index) => {
      const dx = Math.abs(x - sx)
      const dy = Math.abs(y - sy)
      const distance = Math.hypot(Math.min(dx, SIZE - dx), Math.min(dy, SIZE - dy))

      if (distance < first) {
        second = first
        first = distance
        cell = index
      } else if (distance < second) {
        second = distance
      }
    })

    return { cell, first, second }
  }
}
