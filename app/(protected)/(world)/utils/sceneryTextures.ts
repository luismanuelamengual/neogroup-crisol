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

/** Draws with a soft halo of light around (fire, lava, alien light). */
function glowing(context: CanvasRenderingContext2D, color: string, blur: number, paint: () => void): void {
  context.save()
  context.shadowColor = color
  context.shadowBlur = blur
  paint()
  context.restore()
}

/** A tongue of fire standing on (x, base): an outline, a red-orange body and a yellow heart. */
function flame(context: CanvasRenderingContext2D, x: number, base: number, size: number, lean = 0): void {
  const shape = (scale: number, color: string) => {
    const width = size * 0.42 * scale
    const height = size * scale

    context.beginPath()
    context.moveTo(x, base)
    context.bezierCurveTo(
      x - width * 1.3,
      base - height * 0.15,
      x - width * 0.6,
      base - height * 0.6,
      x + lean,
      base - height
    )
    context.bezierCurveTo(x + width * 0.7, base - height * 0.55, x + width * 1.3, base - height * 0.2, x, base)
    context.closePath()
    context.fillStyle = color
    context.fill()
  }

  glowing(context, 'rgba(255, 120, 20, 0.9)', size * 0.5, () => shape(1.12, OUTLINE))
  shape(1, '#e8361c')
  shape(0.74, '#ff8a1a')
  shape(0.42, '#ffe25a')
}

/** A charred tree whose branches burn at their tips. */
function burningTree(): Sketch {
  return {
    width: 120,
    height: 160,
    paint: (context, random) => {
      const tips: [number, number][] = []

      const branch = (x: number, y: number, angle: number, length: number, width: number, depth: number) => {
        const tx = x + Math.cos(angle) * length
        const ty = y + Math.sin(angle) * length

        for (const [color, extra] of [
          [OUTLINE, 5],
          ['#2a1210', 0]
        ] as const) {
          context.lineWidth = width + extra
          context.strokeStyle = color
          context.beginPath()
          context.moveTo(x, y)
          context.lineTo(tx, ty)
          context.stroke()
        }

        if (depth > 0) {
          branch(tx, ty, angle - 0.5 - random() * 0.3, length * 0.66, width * 0.62, depth - 1)
          branch(tx, ty, angle + 0.45 + random() * 0.3, length * 0.6, width * 0.6, depth - 1)
        } else {
          tips.push([tx, ty])
        }
      }

      branch(60, 158, -Math.PI / 2, 50, 14, 2)
      // Embers glowing in the cracks of the bark.
      glowing(context, '#ff6a1a', 6, () => {
        context.lineWidth = 2.5
        context.strokeStyle = '#ff7a22'
        context.beginPath()
        context.moveTo(57, 150)
        context.lineTo(61, 132)
        context.lineTo(58, 116)
        context.stroke()
      })
      tips.forEach(([x, y], index) =>
        flame(context, x, y + 6, 18 + random() * 10 + (index % 2) * 4, (random() - 0.5) * 6)
      )
    }
  }
}

/** A jagged spire of red rock split by glowing veins of lava. */
function lavaSpire(): Sketch {
  return {
    width: 90,
    height: 170,
    paint: (context, random) => {
      const points: [number, number][] = [
        [10, 166],
        [22, 104],
        [30, 70],
        [40, 30],
        [46, 6],
        [54, 34],
        [62, 62],
        [70, 110],
        [80, 166]
      ]

      context.beginPath()
      points.forEach(([x, y], index) => (index ? context.lineTo(x, y) : context.moveTo(x, y)))
      context.closePath()
      context.lineWidth = 6
      context.strokeStyle = OUTLINE
      context.stroke()
      context.fillStyle = '#5a1a12'
      context.fill()
      context.beginPath()
      context.moveTo(46, 12)
      context.lineTo(34, 70)
      context.lineTo(24, 162)
      context.lineTo(44, 162)
      context.lineTo(44, 80)
      context.closePath()
      context.fillStyle = '#8a2c1a'
      context.fill()
      glowing(context, '#ff7a1a', 10, () => {
        context.lineWidth = 3.5
        context.strokeStyle = '#ffa82a'
        context.beginPath()
        context.moveTo(48, 40)
        context.lineTo(52 + random() * 4, 78)
        context.lineTo(46, 104)
        context.lineTo(56, 136)
        context.lineTo(52, 164)
        context.moveTo(46, 104)
        context.lineTo(34, 128)
        context.stroke()
      })
    }
  }
}

/** A cone of red rock throwing up a column of fire. */
function fireGeyser(): Sketch {
  return {
    width: 110,
    height: 170,
    paint: (context) => {
      flame(context, 55, 112, 100)
      flame(context, 42, 110, 50, -8)
      flame(context, 68, 110, 54, 8)
      context.beginPath()
      context.moveTo(8, 166)
      context.lineTo(38, 108)
      context.lineTo(72, 108)
      context.lineTo(102, 166)
      context.closePath()
      context.lineWidth = 6
      context.strokeStyle = OUTLINE
      context.stroke()
      context.fillStyle = '#6a2014'
      context.fill()
      context.beginPath()
      context.moveTo(16, 162)
      context.lineTo(40, 112)
      context.lineTo(54, 112)
      context.lineTo(40, 162)
      context.closePath()
      context.fillStyle = '#9a3a1e'
      context.fill()
      glowing(context, '#ffb02a', 8, () => {
        context.beginPath()
        context.ellipse(55, 109, 18, 5, 0, 0, Math.PI * 2)
        context.fillStyle = '#ffd04a'
        context.fill()
      })
    }
  }
}

/** A low clump of flames over charred twigs. */
function flameBush(): Sketch {
  return {
    width: 80,
    height: 70,
    paint: (context) => {
      flame(context, 26, 62, 36, -4)
      flame(context, 54, 62, 40, 4)
      flame(context, 40, 64, 52)
      context.lineWidth = 7
      context.strokeStyle = OUTLINE
      context.beginPath()
      context.moveTo(16, 66)
      context.lineTo(64, 66)
      context.stroke()
      context.lineWidth = 4
      context.strokeStyle = '#3a1810'
      context.stroke()
    }
  }
}

/** Glowing embers lying on the ground. */
function embers(): Sketch {
  return {
    width: 30,
    height: 20,
    paint: (context, random) => {
      glowing(context, '#ff7a1a', 6, () => {
        for (let index = 0; index < 5; index++) {
          blobs(
            context,
            [[5 + random() * 20, 6 + random() * 10, 1.6 + random() * 1.6]],
            index % 2 ? '#ffd04a' : '#ff6a1a'
          )
        }
      })
    }
  }
}

function smallFlame(): Sketch {
  return {
    width: 30,
    height: 36,
    paint: (context) => flame(context, 15, 33, 26)
  }
}

/** A twisted alien stalk whose tendrils end in glowing bulbs. */
function alienTree(bark: string, bulb: string): Sketch {
  return {
    width: 130,
    height: 170,
    paint: (context, random) => {
      const tendrils: [number, number, number, number][] = [
        [62, 60, 20, 30],
        [66, 58, 104, 34],
        [60, 80, 14, 74],
        [66, 82, 116, 78],
        [64, 50, 64, 14]
      ]

      for (const [color, width] of [
        [OUTLINE, 20],
        [bark, 13]
      ] as const) {
        context.lineWidth = width
        context.strokeStyle = color
        context.beginPath()
        context.moveTo(64, 168)
        context.bezierCurveTo(40, 130, 88, 100, 64, 56)
        context.stroke()
      }

      for (const [x, y, tx, ty] of tendrils) {
        for (const [color, width] of [
          [OUTLINE, 9],
          [bark, 5]
        ] as const) {
          context.lineWidth = width
          context.strokeStyle = color
          context.beginPath()
          context.moveTo(x, y)
          context.quadraticCurveTo((x + tx) / 2 + (random() - 0.5) * 20, Math.min(y, ty) - 18, tx, ty)
          context.stroke()
        }
      }

      for (const [, , tx, ty] of tendrils) {
        blobs(context, [[tx, ty, 10]], OUTLINE)
        glowing(context, bulb, 14, () => blobs(context, [[tx, ty, 7.5]], bulb))
        blobs(context, [[tx - 2.5, ty - 2.5, 2.8]], '#ffffff')
      }
    }
  }
}

/** A giant alien mushroom with a wide cap dotted with glowing spots. */
function giantFungus(cap: string, dark: string, spots: string): Sketch {
  return {
    width: 130,
    height: 160,
    paint: (context) => {
      context.beginPath()
      context.moveTo(54, 158)
      context.quadraticCurveTo(50, 100, 60, 64)
      context.lineTo(72, 64)
      context.quadraticCurveTo(80, 100, 78, 158)
      context.closePath()
      context.lineWidth = 6
      context.strokeStyle = OUTLINE
      context.stroke()
      context.fillStyle = '#c9b6e0'
      context.fill()
      context.fillStyle = 'rgba(40, 0, 60, 0.3)'
      context.fillRect(66, 66, 12, 92)

      const capShape = (grow: number) => {
        context.beginPath()
        context.moveTo(8 - grow, 74 + grow)
        context.quadraticCurveTo(14, 8 - grow, 66, 10 - grow)
        context.quadraticCurveTo(118, 8 - grow, 122 + grow, 74 + grow)
        context.quadraticCurveTo(66, 58, 8 - grow, 74 + grow)
        context.closePath()
      }

      capShape(3)
      context.fillStyle = OUTLINE
      context.fill()
      capShape(0)
      context.fillStyle = dark
      context.fill()
      context.beginPath()
      context.moveTo(14, 68)
      context.quadraticCurveTo(22, 16, 66, 16)
      context.quadraticCurveTo(100, 18, 112, 52)
      context.quadraticCurveTo(60, 48, 14, 68)
      context.closePath()
      context.fillStyle = cap
      context.fill()
      glowing(context, spots, 10, () =>
        blobs(
          context,
          [
            [34, 40, 6],
            [58, 28, 5],
            [84, 34, 6.5],
            [100, 54, 4],
            [48, 54, 4]
          ],
          spots
        )
      )
    }
  }
}

/** A black monolith of an unknown people, carved with glowing runes, with shards floating around it. */
function obelisk(rune: string): Sketch {
  return {
    width: 90,
    height: 180,
    paint: (context) => {
      context.beginPath()
      context.moveTo(28, 176)
      context.lineTo(32, 40)
      context.lineTo(45, 22)
      context.lineTo(58, 40)
      context.lineTo(62, 176)
      context.closePath()
      context.lineWidth = 6
      context.strokeStyle = OUTLINE
      context.stroke()
      context.fillStyle = '#1e1430'
      context.fill()
      context.beginPath()
      context.moveTo(32, 172)
      context.lineTo(35, 42)
      context.lineTo(45, 28)
      context.lineTo(44, 172)
      context.closePath()
      context.fillStyle = '#3a2856'
      context.fill()
      glowing(context, rune, 10, () => {
        context.lineWidth = 3
        context.strokeStyle = rune
        context.beginPath()

        for (const y of [62, 92, 122, 150]) {
          context.moveTo(39, y)
          context.lineTo(51, y)
          context.moveTo(45, y - 8)
          context.lineTo(45, y + 8)
          context.moveTo(40, y + 6)
          context.lineTo(50, y - 6)
        }

        context.stroke()

        // Shards floating beside it.
        for (const [x, y, size] of [
          [12, 70, 7],
          [78, 100, 6],
          [16, 132, 5]
        ]) {
          context.beginPath()
          context.moveTo(x, y - size * 1.6)
          context.lineTo(x + size, y)
          context.lineTo(x, y + size * 1.6)
          context.lineTo(x - size, y)
          context.closePath()
          context.fillStyle = rune
          context.fill()
        }
      })
    }
  }
}

/** A ring of black metal standing on its foot, with violet light swirling inside. */
function alienRing(light: string): Sketch {
  return {
    width: 120,
    height: 160,
    paint: (context) => {
      glowing(context, light, 22, () => {
        context.beginPath()
        context.ellipse(60, 70, 34, 50, 0, 0, Math.PI * 2)
        context.fillStyle = 'rgba(170, 90, 255, 0.55)'
        context.fill()
      })
      context.beginPath()
      context.ellipse(60, 70, 22, 36, 0, 0, Math.PI * 2)
      context.fillStyle = 'rgba(240, 200, 255, 0.5)'
      context.fill()

      for (const [color, width] of [
        [OUTLINE, 18],
        ['#2a1e3e', 11]
      ] as const) {
        context.lineWidth = width
        context.strokeStyle = color
        context.beginPath()
        context.ellipse(60, 70, 40, 56, 0, 0, Math.PI * 2)
        context.stroke()
      }

      context.lineWidth = 3
      context.strokeStyle = '#5a4680'
      context.beginPath()
      context.ellipse(60, 70, 40, 56, 0, Math.PI * 1.05, Math.PI * 1.6)
      context.stroke()
      context.beginPath()
      context.moveTo(34, 156)
      context.lineTo(44, 122)
      context.lineTo(76, 122)
      context.lineTo(86, 156)
      context.closePath()
      context.lineWidth = 6
      context.strokeStyle = OUTLINE
      context.stroke()
      context.fillStyle = '#2a1e3e'
      context.fill()
      glowing(context, light, 8, () => blobs(context, [[60, 140, 5]], light))
    }
  }
}

/** A swollen alien pod on fleshy leaves, its core glowing. */
function podPlant(skin: string, core: string): Sketch {
  return {
    width: 76,
    height: 70,
    paint: (context) => {
      for (const [x, angle] of [
        [24, -0.9],
        [52, 0.9]
      ]) {
        context.save()
        context.translate(x, 60)
        context.rotate(angle)
        context.beginPath()
        context.ellipse(0, -10, 8, 18, 0, 0, Math.PI * 2)
        context.lineWidth = 5
        context.strokeStyle = OUTLINE
        context.stroke()
        context.fillStyle = '#4a1e6a'
        context.fill()
        context.restore()
      }

      context.beginPath()
      context.ellipse(38, 38, 20, 26, 0, 0, Math.PI * 2)
      context.lineWidth = 6
      context.strokeStyle = OUTLINE
      context.stroke()
      context.fillStyle = skin
      context.fill()
      glowing(context, core, 14, () => {
        context.beginPath()
        context.ellipse(38, 38, 7, 16, 0, 0, Math.PI * 2)
        context.fillStyle = core
        context.fill()
      })
    }
  }
}

/** Alien tendrils curling up from the ground, tipped with light. */
function tentacles(skin: string, tip: string): Sketch {
  return {
    width: 80,
    height: 70,
    paint: (context) => {
      const curls: [number, number, number][] = [
        [20, 26, -1],
        [40, 6, 1],
        [60, 22, 1]
      ]

      for (const [x, top, side] of curls) {
        for (const [color, width] of [
          [OUTLINE, 10],
          [skin, 6]
        ] as const) {
          context.lineWidth = width
          context.strokeStyle = color
          context.beginPath()
          context.moveTo(x, 68)
          context.bezierCurveTo(x - side * 14, 50, x + side * 16, top + 16, x + side * 4, top)
          context.stroke()
        }

        glowing(context, tip, 8, () => blobs(context, [[x + side * 4, top, 3.5]], tip))
      }
    }
  }
}

/** A small black stone of the old ones with a glowing rune. */
function runeStone(rune: string): Sketch {
  return {
    width: 60,
    height: 70,
    paint: (context) => {
      context.beginPath()
      context.moveTo(14, 66)
      context.lineTo(16, 20)
      context.lineTo(30, 8)
      context.lineTo(44, 20)
      context.lineTo(46, 66)
      context.closePath()
      context.lineWidth = 6
      context.strokeStyle = OUTLINE
      context.stroke()
      context.fillStyle = '#22183a'
      context.fill()
      glowing(context, rune, 10, () => {
        context.lineWidth = 3
        context.strokeStyle = rune
        context.beginPath()
        context.arc(30, 36, 8, 0, Math.PI * 2)
        context.moveTo(30, 24)
        context.lineTo(30, 52)
        context.stroke()
      })
    }
  }
}

/** Glowing spores (or embers) drifting low over the ground. */
function spores(color: string): Sketch {
  return {
    width: 30,
    height: 24,
    paint: (context, random) => {
      glowing(context, color, 6, () => {
        for (let index = 0; index < 6; index++) {
          blobs(context, [[5 + random() * 20, 5 + random() * 14, 1.4 + random() * 1.6]], color)
        }
      })
    }
  }
}

/** A curled alien tendril lying on the ground. */
function tendril(skin: string, tip: string): Sketch {
  return {
    width: 30,
    height: 24,
    paint: (context) => {
      for (const [color, width] of [
        [OUTLINE, 6],
        [skin, 3]
      ] as const) {
        context.lineWidth = width
        context.strokeStyle = color
        context.beginPath()
        context.moveTo(4, 20)
        context.bezierCurveTo(12, 22, 24, 18, 22, 10)
        context.bezierCurveTo(20, 4, 12, 8, 15, 12)
        context.stroke()
      }

      glowing(context, tip, 5, () => blobs(context, [[15, 12, 2]], tip))
    }
  }
}

/** Little alien mushrooms with glowing caps. */
function glowShrooms(cap: string): Sketch {
  return {
    width: 30,
    height: 26,
    paint: (context) => {
      for (const [x, height, size] of [
        [9, 12, 5],
        [19, 17, 6.5],
        [25, 8, 4]
      ]) {
        context.lineWidth = 4
        context.strokeStyle = OUTLINE
        context.beginPath()
        context.moveTo(x, 25)
        context.lineTo(x, 25 - height)
        context.stroke()
        context.lineWidth = 2
        context.strokeStyle = '#d8c8ee'
        context.stroke()
        blobs(context, [[x, 25 - height, size + 1.5]], OUTLINE)
        glowing(context, cap, 6, () => blobs(context, [[x, 25 - height, size]], cap))
      }
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
    tall: [burningTree(), lavaSpire(), burningTree(), fireGeyser()],
    low: [
      rock('#6a1e14', '#9a3a22', '#ffb02a'),
      rock('#8a2a16', '#c0502a', '#ffd04a'),
      flameBush(),
      crystal('#ff8a1a', '#ffe07a')
    ],
    ground: [embers(), smallFlame(), pebbles('#8a2a1a', '#d0602a'), pebbles('#c88a1a', '#ffd84a'), embers()]
  },
  [Biome.WASTELANDS]: {
    tall: [deadTree('#6a5a6e', '#8f7f92'), deadTree('#5a4c5e', '#7f6f82')],
    low: [rock('#6a5f6e', '#8f8592'), bush('#7a6a5a', '#a08f7a', '#4a3e32')],
    ground: [tuft('#9a8a6a', '#4a3e32'), pebbles('#6f6574', '#958b98')]
  },
  [Biome.ABYSS]: {
    tall: [
      alienTree('#3a1a56', '#e070ff'),
      giantFungus('#8a3ad0', '#4a1a78', '#f0a8ff'),
      obelisk('#b070ff'),
      alienTree('#2a1240', '#9a6aff'),
      crystal('#6a2fc0', '#c49aff'),
      alienRing('#b070ff')
    ],
    low: [
      podPlant('#6a2a9a', '#f090ff'),
      tentacles('#5a2480', '#e070ff'),
      runeStone('#b070ff'),
      crystal('#7a3ab0', '#c08af0'),
      rock('#1e1430', '#3a2856', '#c06aff')
    ],
    ground: [
      spores('#d08aff'),
      glowShrooms('#c070ff'),
      tendril('#5a2480', '#f090ff'),
      pebbles('#2a1a3a', '#8a5ac0'),
      spores('#f0a0ff')
    ]
  }
}
