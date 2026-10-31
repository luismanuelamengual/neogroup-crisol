import { Texture } from 'pixi.js'
import { loadArtManifest, loadTextures } from '@/app/(protected)/(art)/utils/art'
import { Biome } from '@/app/(protected)/(engine)/models/Biome'
import { SceneryItem } from '@/app/(protected)/(engine)/models/SceneryItem'
import { createRandom, Random } from '@/app/(protected)/(engine)/utils/random'

/**
 * The drawings of the scenery of each biome, by layer: the final art cut from
 * its sheet when it exists (`map/<biome>-scenery`, see `yarn art`) and
 * otherwise provisional ones painted here in the style of the game (flat
 * colors, a light and a dark tone, black outline). Every drawing has its base
 * at the bottom middle.
 */

export type SceneryTextures = Record<Biome, Record<SceneryItem['layer'], Texture[]>>

type Painter = (context: CanvasRenderingContext2D, random: Random) => void

interface Sketch {
  width: number
  height: number
  paint: Painter
}

const OUTLINE = '#1a120c'

export function paintSceneryTextures(): SceneryTextures {
  const random = createRandom(0x5ce7)
  const textures = (sketches: Sketch[]) => sketches.map((sketch) => draw(sketch, random))

  return Object.fromEntries(
    Object.values(Biome).map((biome) => {
      const { tall, low, ground } = SKETCHES[biome]

      return [biome, { tall: textures(tall), low: textures(low), ground: textures(ground) }]
    })
  ) as SceneryTextures
}

/** The provisional drawings with the final art of the biomes that have it. */
export async function loadSceneryArt(provisional: SceneryTextures): Promise<SceneryTextures> {
  const { scenery } = await loadArtManifest()
  const result = { ...provisional }

  for (const [biome, layers] of Object.entries(scenery) as [Biome, Record<SceneryItem['layer'], string[]>][]) {
    const loaded = await loadTextures(Object.values(layers).flat())

    const pick = (ids: string[], fallback: Texture[]) => {
      const found = ids.flatMap((id) => (loaded.has(id) ? [loaded.get(id)!] : []))

      return found.length ? found : fallback
    }

    result[biome] = {
      tall: pick(layers.tall, provisional[biome].tall),
      low: pick(layers.low, provisional[biome].low),
      ground: pick(layers.ground, provisional[biome].ground)
    }
  }

  return result
}

/** A soft dark oval, for the shadow at the foot of every piece. */
export function paintShadow(): Texture {
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')!
  const gradient = context.createRadialGradient(64, 32, 0, 64, 32, 64)

  canvas.width = 128
  canvas.height = 64
  gradient.addColorStop(0, 'rgba(10, 6, 4, 0.55)')
  gradient.addColorStop(0.6, 'rgba(10, 6, 4, 0.35)')
  gradient.addColorStop(1, 'rgba(10, 6, 4, 0)')
  context.setTransform(1, 0, 0, 0.5, 0, 16)
  context.fillStyle = gradient
  context.fillRect(0, 0, 128, 128)

  return Texture.from(canvas)
}

function draw({ width, height, paint }: Sketch, random: Random): Texture {
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')!

  canvas.width = width
  canvas.height = height
  context.lineJoin = 'round'
  context.lineCap = 'round'
  paint(context, random)

  return Texture.from(canvas)
}

// Shapes, with the base of the drawing at (cx, base).

function blobs(context: CanvasRenderingContext2D, circles: [number, number, number][], fill: string): void {
  context.fillStyle = fill
  circles.forEach(([x, y, r]) => {
    context.beginPath()
    context.arc(x, y, r, 0, Math.PI * 2)
    context.fill()
  })
}

/** Circles with one outline around all of them: the outline drawn wider first, the fill over it. */
function outlinedBlobs(context: CanvasRenderingContext2D, circles: [number, number, number][], fill: string): void {
  blobs(
    context,
    circles.map(([x, y, r]) => [x, y, r + 3]),
    OUTLINE
  )
  blobs(context, circles, fill)
}

function trunk(
  context: CanvasRenderingContext2D,
  cx: number,
  base: number,
  width: number,
  height: number,
  color: string
): void {
  context.fillStyle = OUTLINE
  context.fillRect(cx - width / 2 - 3, base - height - 3, width + 6, height + 3)
  context.fillStyle = color
  context.fillRect(cx - width / 2, base - height, width, height)
  context.fillStyle = 'rgba(0, 0, 0, 0.25)'
  context.fillRect(cx, base - height, width / 2, height)
}

function roundTree(leaf: string, light: string, dark: string, wood = '#6b4423'): Sketch {
  return {
    width: 120,
    height: 150,
    paint: (context, random) => {
      const cx = 60
      const circles: [number, number, number][] = [
        [cx, 62, 34],
        [cx - 26, 78, 26],
        [cx + 26, 78, 26],
        [cx - 12, 94, 24],
        [cx + 14, 94, 24],
        [cx + (random() - 0.5) * 16, 40, 24]
      ]

      trunk(context, cx, 146, 14, 44, wood)
      outlinedBlobs(context, circles, dark)
      blobs(
        context,
        circles.map(([x, y, r]) => [x - r * 0.18, y - r * 0.2, r * 0.78]),
        leaf
      )
      blobs(
        context,
        circles.slice(0, 3).map(([x, y, r]) => [x - r * 0.35, y - r * 0.4, r * 0.38]),
        light
      )
    }
  }
}

function pine(leaf: string, light: string, dark: string, snow = false): Sketch {
  return {
    width: 100,
    height: 164,
    paint: (context) => {
      const cx = 50

      trunk(context, cx, 160, 12, 26, '#5a3a20')

      for (const [top, bottom, half] of [
        [70, 140, 46],
        [38, 104, 36],
        [8, 70, 26]
      ]) {
        const tier = () => {
          context.beginPath()
          context.moveTo(cx, top)
          context.lineTo(cx + half, bottom)
          context.lineTo(cx - half, bottom)
          context.closePath()
        }

        tier()
        context.lineWidth = 6
        context.strokeStyle = OUTLINE
        context.stroke()
        context.fillStyle = dark
        context.fill()
        context.beginPath()
        context.moveTo(cx, top + 4)
        context.lineTo(cx, bottom - 2)
        context.lineTo(cx - half + 6, bottom - 2)
        context.closePath()
        context.fillStyle = leaf
        context.fill()
        context.beginPath()
        context.moveTo(cx, top + 6)
        context.lineTo(cx - half * 0.35, top + (bottom - top) * 0.5)
        context.lineTo(cx, top + (bottom - top) * 0.42)
        context.closePath()
        context.fillStyle = snow ? '#f4f8ff' : light
        context.fill()
      }
    }
  }
}

function palm(): Sketch {
  return {
    width: 140,
    height: 184,
    paint: (context) => {
      // Room over the crown for the fronds that point up.
      context.translate(0, 24)
      context.lineWidth = 16
      context.strokeStyle = OUTLINE
      context.beginPath()
      context.moveTo(62, 156)
      context.quadraticCurveTo(54, 100, 70, 46)
      context.stroke()
      context.lineWidth = 10
      context.strokeStyle = '#8a6239'
      context.stroke()

      for (let frond = 0; frond < 6; frond++) {
        const angle = -Math.PI / 2 + (frond - 2.5) * 0.62

        context.save()
        context.translate(70, 46)
        context.rotate(angle)
        context.beginPath()
        context.ellipse(28, 0, 32, 10, 0, 0, Math.PI * 2)
        context.lineWidth = 5
        context.strokeStyle = OUTLINE
        context.stroke()
        context.fillStyle = frond % 2 ? '#2f9a4a' : '#43b85a'
        context.fill()
        context.restore()
      }
    }
  }
}

function cactus(): Sketch {
  return {
    width: 80,
    height: 120,
    paint: (context) => {
      const pillar = (x: number, y: number, width: number, height: number) => {
        context.beginPath()
        context.roundRect(x, y, width, height, width / 2)
        context.lineWidth = 6
        context.strokeStyle = OUTLINE
        context.stroke()
        context.fillStyle = '#3f8f4a'
        context.fill()
        context.fillStyle = '#6cbf62'
        context.fillRect(x + width * 0.22, y + width * 0.4, width * 0.18, height - width * 0.8)
      }

      pillar(30, 14, 20, 104)
      pillar(10, 40, 16, 40)
      pillar(54, 30, 16, 36)
      context.fillStyle = '#3f8f4a'
      context.fillRect(18, 70, 16, 10)
      context.fillRect(46, 58, 14, 10)
    }
  }
}

function deadTree(bark: string, light: string): Sketch {
  return {
    width: 110,
    height: 140,
    paint: (context, random) => {
      const branch = (x: number, y: number, angle: number, length: number, width: number, depth: number) => {
        const tx = x + Math.cos(angle) * length
        const ty = y + Math.sin(angle) * length

        for (const [color, extra] of [
          [OUTLINE, 5],
          [bark, 0]
        ] as const) {
          context.lineWidth = width + extra
          context.strokeStyle = color
          context.beginPath()
          context.moveTo(x, y)
          context.lineTo(tx, ty)
          context.stroke()
        }

        if (depth > 0) {
          branch(tx, ty, angle - 0.5 - random() * 0.3, length * 0.68, width * 0.62, depth - 1)
          branch(tx, ty, angle + 0.45 + random() * 0.3, length * 0.62, width * 0.6, depth - 1)
        }
      }

      branch(55, 138, -Math.PI / 2, 52, 14, 3)
      context.lineWidth = 3
      context.strokeStyle = light
      context.beginPath()
      context.moveTo(51, 134)
      context.lineTo(51, 96)
      context.stroke()
    }
  }
}

function crystal(color: string, light: string): Sketch {
  return {
    width: 90,
    height: 140,
    paint: (context) => {
      for (const [x, top, half, base] of [
        [30, 50, 12, 132],
        [62, 34, 14, 132],
        [46, 8, 16, 136]
      ]) {
        context.beginPath()
        context.moveTo(x, top)
        context.lineTo(x + half, top + half * 1.4)
        context.lineTo(x + half * 0.8, base)
        context.lineTo(x - half * 0.8, base)
        context.lineTo(x - half, top + half * 1.4)
        context.closePath()
        context.lineWidth = 6
        context.strokeStyle = OUTLINE
        context.stroke()
        context.fillStyle = color
        context.fill()
        context.beginPath()
        context.moveTo(x, top + 3)
        context.lineTo(x - half + 3, top + half * 1.4)
        context.lineTo(x - half * 0.7, base - 3)
        context.lineTo(x, base - 3)
        context.closePath()
        context.fillStyle = light
        context.fill()
      }
    }
  }
}

function bush(leaf: string, light: string, dark: string, bloom?: string): Sketch {
  return {
    width: 76,
    height: 56,
    paint: (context, random) => {
      const circles: [number, number, number][] = [
        [38, 30, 18],
        [20, 38, 14],
        [56, 38, 14]
      ]

      outlinedBlobs(context, circles, dark)
      blobs(
        context,
        circles.map(([x, y, r]) => [x - 3, y - 4, r * 0.75]),
        leaf
      )
      blobs(context, [[32, 24, 6]], light)

      if (bloom) {
        for (let index = 0; index < 5; index++) {
          blobs(context, [[16 + random() * 44, 22 + random() * 20, 3]], bloom)
        }
      }
    }
  }
}

function rock(base: string, light: string, glow?: string): Sketch {
  return {
    width: 76,
    height: 56,
    paint: (context, random) => {
      const points = [
        [8, 50],
        [14, 22 + random() * 8],
        [32, 8 + random() * 6],
        [54, 12 + random() * 6],
        [68, 30],
        [70, 50]
      ]

      const shape = () => {
        context.beginPath()
        points.forEach(([x, y], index) => (index ? context.lineTo(x, y) : context.moveTo(x, y)))
        context.closePath()
      }

      shape()
      context.lineWidth = 6
      context.strokeStyle = OUTLINE
      context.stroke()
      context.fillStyle = base
      context.fill()
      context.beginPath()
      context.moveTo(16, 26)
      context.lineTo(32, 12)
      context.lineTo(52, 16)
      context.lineTo(40, 30)
      context.closePath()
      context.fillStyle = light
      context.fill()

      if (glow) {
        context.lineWidth = 3
        context.strokeStyle = glow
        context.beginPath()
        context.moveTo(30, 48)
        context.lineTo(38, 36)
        context.lineTo(48, 42)
        context.stroke()
      }
    }
  }
}

function tuft(color: string, dark: string): Sketch {
  return {
    width: 30,
    height: 24,
    paint: (context) => {
      for (const [x, lean, height] of [
        [9, -4, 14],
        [15, 0, 20],
        [21, 4, 15],
        [12, -2, 10],
        [18, 3, 11]
      ]) {
        context.lineWidth = 4
        context.strokeStyle = dark
        context.beginPath()
        context.moveTo(x, 23)
        context.lineTo(x + lean, 23 - height)
        context.stroke()
        context.lineWidth = 2
        context.strokeStyle = color
        context.stroke()
      }
    }
  }
}

function flowers(petals: string): Sketch {
  return {
    width: 30,
    height: 24,
    paint: (context, random) => {
      for (let index = 0; index < 3; index++) {
        const x = 7 + random() * 16
        const y = 8 + random() * 10

        context.strokeStyle = '#3f7a2c'
        context.lineWidth = 2
        context.beginPath()
        context.moveTo(x, y)
        context.lineTo(x, 23)
        context.stroke()
        blobs(context, [[x, y, 4.5]], OUTLINE)
        blobs(context, [[x, y, 3.5]], petals)
        blobs(context, [[x, y, 1.4]], '#ffd84a')
      }
    }
  }
}

function pebbles(color: string, light: string): Sketch {
  return {
    width: 30,
    height: 20,
    paint: (context) => {
      for (const [x, y, rx, ry] of [
        [10, 13, 6, 4],
        [20, 15, 4, 3]
      ]) {
        context.beginPath()
        context.ellipse(x, y, rx + 1.5, ry + 1.5, 0, 0, Math.PI * 2)
        context.fillStyle = OUTLINE
        context.fill()
        context.beginPath()
        context.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2)
        context.fillStyle = color
        context.fill()
        blobs(context, [[x - rx * 0.3, y - ry * 0.3, ry * 0.45]], light)
      }
    }
  }
}

function mushroom(cap: string): Sketch {
  return {
    width: 24,
    height: 24,
    paint: (context) => {
      context.fillStyle = OUTLINE
      context.fillRect(9, 11, 6, 12)
      context.fillStyle = '#efe4cc'
      context.fillRect(10, 12, 4, 10)
      context.beginPath()
      context.ellipse(12, 11, 10, 7, 0, Math.PI, 0)
      context.closePath()
      context.lineWidth = 3
      context.strokeStyle = OUTLINE
      context.stroke()
      context.fillStyle = cap
      context.fill()
      blobs(
        context,
        [
          [8, 8, 1.6],
          [15, 7, 1.4]
        ],
        '#ffffff'
      )
    }
  }
}

const GREEN_GROUND = [
  tuft('#7cc35a', '#2f6b2a'),
  tuft('#6ab04c', '#2a5f26'),
  flowers('#ffffff'),
  flowers('#f6d84a'),
  flowers('#7fb2ff'),
  flowers('#ff9ec4'),
  pebbles('#9a9a92', '#c8c8c0')
]
const SKETCHES: Record<Biome, Record<SceneryItem['layer'], Sketch[]>> = {
  [Biome.MEADOWS]: {
    tall: [
      roundTree('#5fae3e', '#8fd06a', '#2f6b2a'),
      roundTree('#6ab845', '#9edb74', '#357a2e'),
      pine('#3f8f4a', '#6cbf62', '#245c34')
    ],
    low: [
      bush('#5fae3e', '#8fd06a', '#2f6b2a'),
      bush('#5fae3e', '#8fd06a', '#2f6b2a', '#ff9ec4'),
      rock('#8f949e', '#b9bec6')
    ],
    ground: GREEN_GROUND
  },
  [Biome.FOREST]: {
    tall: [
      pine('#2f7a3a', '#4f9f52', '#17492a'),
      pine('#2a6e36', '#468f4a', '#143f24'),
      roundTree('#2f7a3a', '#56a356', '#174a2a', '#4f331c')
    ],
    low: [bush('#2f7a3a', '#56a356', '#174a2a'), rock('#6f7d70', '#8fa08d')],
    ground: [tuft('#4f9f52', '#174a2a'), mushroom('#d94a3a'), mushroom('#b06ad6'), pebbles('#7d8a7c', '#a6b2a2')]
  },
  [Biome.TROPICAL]: {
    tall: [palm(), roundTree('#3fae5a', '#79d67a', '#1f6b3a'), palm()],
    low: [bush('#3fae5a', '#79d67a', '#1f6b3a', '#ff4fb0'), bush('#3fae5a', '#79d67a', '#1f6b3a')],
    ground: [tuft('#6fd06a', '#1f6b3a'), flowers('#ff4fb0'), flowers('#ffb02a')]
  },
  [Biome.DESERT]: {
    tall: [cactus(), deadTree('#9a7a56', '#c9a77c')],
    low: [rock('#c98f56', '#e8b77e'), rock('#b07a4a', '#d9a06a')],
    ground: [pebbles('#c49a6a', '#e8c494'), tuft('#c9b06a', '#7a6232')]
  },
  [Biome.MOUNTAINS]: {
    tall: [pine('#3a7a48', '#5f9f62', '#1f4f32'), pine('#357040', '#55935a', '#1c472c')],
    low: [rock('#7d8494', '#a9afbc'), rock('#6c7382', '#959cab')],
    ground: [pebbles('#8a909c', '#b4bac4'), tuft('#6a9a5a', '#2f4f2a')]
  },
  [Biome.SNOW]: {
    tall: [pine('#2f6b4a', '#4f8f6a', '#174a34', true), pine('#2a6244', '#4a8864', '#15422e', true)],
    low: [rock('#9aa6b8', '#e6eef7'), bush('#d9e7f4', '#ffffff', '#8fa3bf')],
    ground: [pebbles('#a9b6c8', '#e6eef7')]
  },
  [Biome.VOLCANIC]: {
    tall: [deadTree('#3a2c2c', '#5a4646'), deadTree('#2f2424', '#4f3a3a')],
    low: [rock('#3a3438', '#5a5258', '#ff7a2a'), rock('#2f2a2e', '#4e464c')],
    ground: [pebbles('#4a4246', '#6a6266'), pebbles('#7a3a22', '#ff8a3a')]
  },
  [Biome.WASTELANDS]: {
    tall: [deadTree('#6a5a6e', '#8f7f92'), deadTree('#5a4c5e', '#7f6f82')],
    low: [rock('#6a5f6e', '#8f8592'), bush('#7a6a5a', '#a08f7a', '#4a3e32')],
    ground: [tuft('#9a8a6a', '#4a3e32'), pebbles('#6f6574', '#958b98')]
  },
  [Biome.ABYSS]: {
    tall: [crystal('#6a2fa0', '#b07ae0'), deadTree('#2a1a36', '#4a3256')],
    low: [rock('#2e2236', '#4a3a56', '#c06aff'), crystal('#7a3ab0', '#c08af0')],
    ground: [pebbles('#3a2a46', '#6a5276')]
  }
}
