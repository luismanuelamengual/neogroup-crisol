import { CanvasSource, Texture } from 'pixi.js'
import { loadTextures } from '@/app/(protected)/(art)/utils/art'
import { ZONES } from '@/app/(protected)/(engine)/data/zones'
import { SceneryItem } from '@/app/(protected)/(engine)/models/SceneryItem'
import { Zone } from '@/app/(protected)/(engine)/models/Zone'
import { SceneryTextures } from '@/app/(protected)/(world)/utils/sceneryTextures'

/**
 * The drawings of the zones of the biomes (see data/zones.ts), made from the
 * ones of their biome: some of its pieces (only its pines, only its oaks...),
 * recolored (the greens of the leaves turned orange, pink or violet; the
 * trunks, the outlines and the rest keep their colors), plus pieces of its
 * other sheets (logs, stumps, giant mushrooms...) brought to the size of the
 * scenery. Also the pieces of the lairs: their standing stones and the tree
 * where the captive hangs in a cage.
 */

type Layer = SceneryItem['layer']

export type ZoneTextures = Partial<Record<Zone, Record<Layer, Texture[]>>>

/** Turns the colors of a range of hues (the greens by default) into others, keeping their light and shade. */
export interface Recolor {
  /** New hue (degrees) of the middle of the range; the rest of the range spreads around it, narrower. */
  hue: number
  /** Multiply the saturation and the lightness of the colors turned. */
  saturation?: number
  lightness?: number
  /** Range of hues turned (degrees). */
  from?: [number, number]
}

/** Some pieces of the biome (a share of its list, as the sheet orders them), maybe recolored. */
interface Pick {
  share: [number, number]
  recolor?: Recolor
}

/** A piece of another sheet, brought to a height (world pixels), maybe recolored. */
interface Extra {
  id: string
  height: number
  recolor?: Recolor
}

type Look = Record<Layer, (Pick | Extra)[]>

/** The leaves and the grass: greens, from yellowish to bluish. */
const GREENS: [number, number] = [62, 175]
/** Shares of the forest sheet (see SCENERY_SHEETS in scripts/art/catalog.ts): 5 pines then 3 oaks; 2 bushes, a rock, a fern; grass, 2 mushrooms, pebbles. */
const ALL: [number, number] = [0, 1]
const PINES: [number, number] = [0, 0.625]
const OAKS: [number, number] = [0.625, 1]
const BUSHES: [number, number] = [0, 0.5]
const ROCK_AND_FERN: [number, number] = [0.5, 1]
const GRASS: [number, number] = [0, 0.25]
const MUSHROOMS: [number, number] = [0.25, 0.75]
const VIOLET_MUSHROOM: [number, number] = [0.5, 0.75]
const PEBBLES: [number, number] = [0.75, 1]
const ORANGE: Recolor = { hue: 26, saturation: 1.15, lightness: 1.12 }
const RED: Recolor = { hue: 6, saturation: 1.05, lightness: 0.98 }
const GOLD: Recolor = { hue: 44, saturation: 1.15, lightness: 1.22 }
const TEAL: Recolor = { hue: 178, saturation: 0.8, lightness: 0.86 }
const FROST: Recolor = { hue: 202, saturation: 0.6, lightness: 1.02 }
const PINK: Recolor = { hue: 330, saturation: 0.8, lightness: 1.38 }
const WHITE_BLOOM: Recolor = { hue: 345, saturation: 0.35, lightness: 1.62 }
const SPRING: Recolor = { hue: 92, saturation: 1.05, lightness: 1.18 }
const WITHERED: Recolor = { hue: 282, saturation: 0.42, lightness: 0.72 }
const SICKLY: Recolor = { hue: 72, saturation: 0.5, lightness: 0.6 }
const NIGHTSHADE: Recolor = { hue: 262, saturation: 0.4, lightness: 0.6 }
/** The orange glowing mushrooms and the cyan runes, turned to the magenta of the witch. */
const HEX_GLOW: Recolor = { hue: 312, saturation: 1, lightness: 1.05, from: [10, 60] }
const HEX_RUNES: Recolor = { hue: 318, saturation: 1, lightness: 1.05, from: [150, 210] }
const LOOKS: Partial<Record<Zone, Look>> = {
  [Zone.AUTUMN]: {
    tall: [
      { share: OAKS, recolor: ORANGE },
      { share: OAKS, recolor: RED },
      { share: OAKS, recolor: GOLD },
      { share: OAKS, recolor: ORANGE },
      { share: PINES }
    ],
    low: [
      { share: BUSHES, recolor: ORANGE },
      { share: BUSHES, recolor: GOLD },
      { share: ROCK_AND_FERN, recolor: GOLD },
      { id: 'map/forest/9', height: 54 },
      { id: 'map/forest/10', height: 54 },
      { id: 'map/forest/14', height: 64 }
    ],
    ground: [
      { share: GRASS, recolor: GOLD },
      { share: GRASS, recolor: ORANGE },
      { share: MUSHROOMS },
      { share: PEBBLES }
    ]
  },
  [Zone.PINEWOOD]: {
    tall: [{ share: PINES, recolor: TEAL }, { share: PINES }, { share: PINES, recolor: FROST }],
    low: [
      { share: ROCK_AND_FERN },
      { id: 'props/forest/4', height: 50 },
      { id: 'props/forest/5', height: 44 },
      { id: 'props/forest/7', height: 46, recolor: TEAL },
      { id: 'props/forest/8', height: 46 }
    ],
    ground: [{ share: GRASS, recolor: TEAL }, { share: PEBBLES }, { share: PEBBLES }]
  },
  [Zone.BLOSSOM]: {
    tall: [
      { share: OAKS, recolor: PINK },
      { share: OAKS, recolor: WHITE_BLOOM },
      { share: OAKS, recolor: PINK },
      { share: OAKS, recolor: SPRING }
    ],
    low: [
      { share: BUSHES, recolor: SPRING },
      { id: 'map/forest/16', height: 58, recolor: SPRING },
      { id: 'map/forest/15', height: 56, recolor: PINK }
    ],
    ground: [
      { share: GRASS, recolor: SPRING },
      { id: 'map/meadows/scenery/ground-3@2x', height: 26 },
      { id: 'map/meadows/scenery/ground-3@2x', height: 26, recolor: { hue: 330, from: [30, 70], lightness: 1.1 } },
      { share: MUSHROOMS }
    ]
  },
  [Zone.WITCHWOOD]: {
    tall: [
      { share: ALL, recolor: WITHERED },
      { share: OAKS, recolor: SICKLY },
      { share: PINES, recolor: NIGHTSHADE },
      { share: OAKS, recolor: WITHERED }
    ],
    low: [
      { share: BUSHES, recolor: WITHERED },
      { id: 'map/forest/6', height: 78 },
      { id: 'props/forest/12', height: 50, recolor: SICKLY },
      { id: 'props/forest/9', height: 48, recolor: HEX_GLOW }
    ],
    ground: [
      { share: VIOLET_MUSHROOM },
      { share: GRASS, recolor: SICKLY },
      { share: GRASS, recolor: WITHERED },
      { share: PEBBLES }
    ]
  }
}
/** The pieces of the lairs: a standing stone of their ring and the tree of the cage (see LairTextures). */
const LAIR_STONE: Extra = { id: 'props/forest/11', height: 92, recolor: HEX_RUNES }
const CAPTIVE_ART = 'heroes/sera/full'

/** Every piece of other sheets the zones and the lairs use. */
export function zoneArtIds(): string[] {
  const extras = Object.values(LOOKS).flatMap((look) =>
    Object.values(look).flatMap((pieces) => pieces.flatMap((piece) => ('id' in piece ? [piece.id] : [])))
  )

  return [...new Set([...extras, LAIR_STONE.id, CAPTIVE_ART])]
}

export async function loadZoneArt(): Promise<Map<string, Texture>> {
  return loadTextures(zoneArtIds())
}

/** The drawings of every zone, from the ones of its biome and the pieces of other sheets loaded (the missing ones are left out). */
export function buildZoneTextures(biomes: SceneryTextures, extras: Map<string, Texture>): ZoneTextures {
  const result: ZoneTextures = {}

  for (const { zone, biome } of ZONES) {
    const look = LOOKS[zone]

    if (!look) {
      continue
    }

    const layers = {} as Record<Layer, Texture[]>

    for (const layer of ['tall', 'low', 'ground'] as Layer[]) {
      const base = biomes[biome][layer]
      const made = look[layer].flatMap((piece) => {
        if ('id' in piece) {
          const texture = extras.get(piece.id)

          return texture ? [redraw(texture, piece.recolor, piece.height)] : []
        }

        return slice(base, piece.share).map((texture) => (piece.recolor ? redraw(texture, piece.recolor) : texture))
      })

      layers[layer] = made.length ? made : base
    }

    result[zone] = layers
  }

  return result
}

/** The pieces of a share of a list (at least one). */
function slice<T>(items: T[], [from, to]: [number, number]): T[] {
  const start = Math.min(items.length - 1, Math.round(from * items.length))
  const end = Math.max(start + 1, Math.round(to * items.length))

  return items.slice(start, end)
}

/** The pixels of a texture on a canvas (its frame, at its full resolution). */
function pixelsOf(texture: Texture): HTMLCanvasElement {
  const { source, frame } = texture
  const resolution = source.resolution ?? 1
  const canvas = document.createElement('canvas')

  canvas.width = Math.max(1, Math.round(frame.width * resolution))
  canvas.height = Math.max(1, Math.round(frame.height * resolution))
  canvas
    .getContext('2d')!
    .drawImage(
      source.resource as CanvasImageSource,
      frame.x * resolution,
      frame.y * resolution,
      frame.width * resolution,
      frame.height * resolution,
      0,
      0,
      canvas.width,
      canvas.height
    )

  return canvas
}

function textureOf(canvas: HTMLCanvasElement, resolution: number): Texture {
  return new Texture({ source: new CanvasSource({ resource: canvas, resolution }) })
}

/** A texture recolored and, given a height (world pixels), brought to it (drawn at twice that, as the scenery). */
export function redraw(texture: Texture, recolor?: Recolor, height?: number): Texture {
  let canvas = pixelsOf(texture)
  let resolution = texture.source.resolution ?? 1

  if (height) {
    const scaled = document.createElement('canvas')

    scaled.height = Math.round(height * 2)
    scaled.width = Math.max(1, Math.round((canvas.width / canvas.height) * scaled.height))

    const context = scaled.getContext('2d')!

    context.imageSmoothingQuality = 'high'
    context.drawImage(canvas, 0, 0, scaled.width, scaled.height)
    canvas = scaled
    resolution = 2
  }

  if (recolor) {
    recolorCanvas(canvas, recolor)
  }

  return textureOf(canvas, resolution)
}

/** Turns the colors of a range of hues into others, in place (see Recolor). */
export function recolorCanvas(
  canvas: HTMLCanvasElement,
  { hue, saturation = 1, lightness = 1, from = GREENS }: Recolor
): void {
  const context = canvas.getContext('2d')!
  const image = context.getImageData(0, 0, canvas.width, canvas.height)
  const data = image.data
  const [low, high] = from
  const middle = (low + high) / 2

  for (let index = 0; index < data.length; index += 4) {
    if (data[index + 3] === 0) {
      continue
    }

    const [h, s, l] = toHsl(data[index], data[index + 1], data[index + 2])
    // How much the pixel is of the range: fully inside it, fading over 14 degrees outside; nothing for greys and the outline.
    const inRange = Math.min(1, Math.max(0, Math.min(h - low, high - h) / 14 + 1))
    const weight = inRange * Math.min(1, Math.max(0, (s - 0.08) / 0.12)) * Math.min(1, Math.max(0, (l - 0.09) / 0.08))

    if (weight <= 0) {
      continue
    }

    const [r, g, b] = toRgb(
      (hue + (h - middle) * 0.35 + 360) % 360,
      Math.min(1, s * saturation),
      Math.min(0.97, l * lightness)
    )

    data[index] += (r - data[index]) * weight
    data[index + 1] += (g - data[index + 1]) * weight
    data[index + 2] += (b - data[index + 2]) * weight
  }

  context.putImageData(image, 0, 0)
}

function toHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255
  g /= 255
  b /= 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2

  if (max === min) {
    return [0, 0, l]
  }

  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  const h =
    max === r ? ((g - b) / d + (g < b ? 6 : 0)) * 60 : max === g ? ((b - r) / d + 2) * 60 : ((r - g) / d + 4) * 60

  return [h, s, l]
}

function toRgb(h: number, s: number, l: number): [number, number, number] {
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2
  const [r, g, b] =
    h < 60
      ? [c, x, 0]
      : h < 120
        ? [x, c, 0]
        : h < 180
          ? [0, c, x]
          : h < 240
            ? [0, x, c]
            : h < 300
              ? [x, 0, c]
              : [c, 0, x]

  return [(r + m) * 255, (g + m) * 255, (b + m) * 255]
}

/**
 * The pieces of a lair: one of its standing stones, with glowing runes, and
 * the tree where the captive hangs in a cage (and the same tree with the cage
 * open and empty, once freed). Their base is at the bottom middle.
 */
export interface LairTextures {
  stone: Texture
  caged: Texture
  freed: Texture
}

/** World size of the tree of the cage. */
const LAIR_TREE_HEIGHT = 300

export function buildLairTextures(zones: ZoneTextures, extras: Map<string, Texture>, zone: Zone): LairTextures | null {
  const trees = zones[zone]?.tall ?? []
  // The widest tree of the zone (an oak: its branches hold the cage).
  const tree = [...trees].sort((a, b) => b.width / b.height - a.width / a.height)[0]
  const stoneArt = extras.get(LAIR_STONE.id)

  if (!tree) {
    return null
  }

  const captive = extras.get(CAPTIVE_ART)
  const stone = stoneArt ? redraw(stoneArt, LAIR_STONE.recolor, LAIR_STONE.height) : paintStone()

  return { stone, caged: paintCageTree(tree, captive, true), freed: paintCageTree(tree, captive, false) }
}

const OUTLINE = '#1a120c'
const IRON = '#3b3046'
const IRON_LIGHT = '#8a7a9e'
const GOLD_TRIM = '#e8b84a'
const HEX = '#ff4fc8'

/** A provisional standing stone with a glowing rune, while its art does not exist. */
function paintStone(): Texture {
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')!

  canvas.width = 80
  canvas.height = 184
  context.lineJoin = 'round'
  context.beginPath()
  context.moveTo(14, 178)
  context.lineTo(22, 30)
  context.lineTo(44, 6)
  context.lineTo(64, 34)
  context.lineTo(68, 178)
  context.closePath()
  context.lineWidth = 8
  context.strokeStyle = OUTLINE
  context.stroke()
  context.fillStyle = '#7d7488'
  context.fill()
  context.strokeStyle = HEX
  context.lineWidth = 6
  context.beginPath()
  context.arc(42, 92, 16, 0, Math.PI * 1.5)
  context.stroke()

  return textureOf(canvas, 2)
}

/**
 * The tree of the cage: a tree of the lair, bigger, with a cage hanging from
 * its branches on a chain, the captive inside (or the door open, empty).
 * Drawn at twice its world size.
 */
function paintCageTree(tree: Texture, captive: Texture | undefined, caged: boolean): Texture {
  const art = pixelsOf(tree)
  const height = LAIR_TREE_HEIGHT * 2
  const treeWidth = Math.round((art.width / art.height) * height)
  // Room on the right for the cage, which hangs past the crown.
  const width = Math.round(treeWidth * 1.3)
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')!

  canvas.width = width
  canvas.height = height
  context.lineJoin = 'round'
  context.lineCap = 'round'
  context.imageSmoothingQuality = 'high'
  context.drawImage(art, 0, 0, treeWidth, height)

  // The cage: hanging from a branch on the right of the crown, its bottom about halfway down the trunk.
  const cageWidth = height * 0.36
  const cageHeight = height * 0.42
  const cx = treeWidth * 0.86
  const top = height * 0.44
  const bottom = top + cageHeight
  const hook = height * 0.3

  // The branch it hangs from (over the crown) and the chain.
  context.strokeStyle = OUTLINE
  context.lineWidth = 22
  context.beginPath()
  context.moveTo(treeWidth * 0.55, hook + 26)
  context.quadraticCurveTo(treeWidth * 0.78, hook - 14, cx + 6, hook)
  context.stroke()
  context.strokeStyle = '#4a3550'
  context.lineWidth = 12
  context.stroke()
  chain(context, cx, hook + 4, top - 18)

  // Behind the bars: a soft magenta glow and the captive.
  const glow = context.createRadialGradient(cx, (top + bottom) / 2, 4, cx, (top + bottom) / 2, cageWidth * 0.75)

  glow.addColorStop(0, caged ? 'rgba(255, 110, 210, 0.55)' : 'rgba(255, 220, 140, 0.25)')
  glow.addColorStop(1, 'rgba(255, 110, 210, 0)')
  context.fillStyle = glow
  context.fillRect(cx - cageWidth, top - 20, cageWidth * 2, cageHeight + 40)

  if (caged && captive) {
    const figure = pixelsOf(captive)
    const figureHeight = cageHeight * 0.8
    const figureWidth = (figure.width / figure.height) * figureHeight

    context.drawImage(figure, cx - figureWidth / 2, bottom - 10 - figureHeight, figureWidth, figureHeight)
  }

  cage(context, cx, top, bottom, cageWidth, caged)

  return textureOf(canvas, 2)
}

/** A short chain of links from (x, from) down to (x, to). */
function chain(context: CanvasRenderingContext2D, x: number, from: number, to: number): void {
  for (let y = from, index = 0; y < to; y += 16, index++) {
    const across = index % 2 === 0

    context.lineWidth = 10
    context.strokeStyle = OUTLINE
    context.beginPath()
    context.ellipse(x, y + 8, across ? 7 : 3, 10, 0, 0, Math.PI * 2)
    context.stroke()
    context.lineWidth = 4
    context.strokeStyle = IRON_LIGHT
    context.stroke()
  }
}

/** A round-topped birdcage of dark iron with golden trims; open, its door swings out on the left. */
function cage(
  context: CanvasRenderingContext2D,
  cx: number,
  top: number,
  bottom: number,
  width: number,
  closed: boolean
): void {
  const half = width / 2
  const shoulder = top + width * 0.42

  const bar = (x0: number, y0: number, x1: number, y1: number, color = IRON) => {
    context.lineWidth = 11
    context.strokeStyle = OUTLINE
    context.beginPath()
    context.moveTo(x0, y0)
    context.lineTo(x1, y1)
    context.stroke()
    context.lineWidth = 5
    context.strokeStyle = color
    context.stroke()
  }

  // The dome.
  context.lineWidth = 12
  context.strokeStyle = OUTLINE
  context.beginPath()
  context.ellipse(cx, shoulder, half, shoulder - top, 0, Math.PI, Math.PI * 2)
  context.stroke()
  context.lineWidth = 6
  context.strokeStyle = IRON
  context.stroke()

  // The bars: from the dome down to the floor (the door, on the left, missing when open).
  const bars = 7

  for (let index = 0; index < bars; index++) {
    const share = index / (bars - 1)
    const x = cx - half + share * width

    if (!closed && index > 0 && index < 3) {
      continue
    }

    const curve = Math.sqrt(Math.max(0, 1 - ((x - cx) / half) ** 2))

    bar(x, shoulder - (shoulder - top) * curve, x, bottom, index === 0 || index === bars - 1 ? IRON_LIGHT : IRON)
  }

  if (!closed) {
    // The door, swung out to the left.
    const doorLeft = cx - half - width * 0.34
    const doorTop = shoulder + 6

    bar(doorLeft, doorTop, cx - half, doorTop + 10, GOLD_TRIM)
    bar(doorLeft, bottom - 6, cx - half, bottom - 2, GOLD_TRIM)
    bar(doorLeft, doorTop, doorLeft, bottom - 6)
    bar(doorLeft + width * 0.17, doorTop + 5, doorLeft + width * 0.17, bottom - 4)
  }

  // Golden rings at the shoulder and the floor, and the ring on top.
  context.lineWidth = 16
  context.strokeStyle = OUTLINE
  context.beginPath()
  context.moveTo(cx - half - 6, shoulder)
  context.lineTo(cx + half + 6, shoulder)
  context.moveTo(cx - half - 8, bottom)
  context.lineTo(cx + half + 8, bottom)
  context.stroke()
  context.lineWidth = 8
  context.strokeStyle = GOLD_TRIM
  context.stroke()
  context.lineWidth = 9
  context.strokeStyle = OUTLINE
  context.beginPath()
  context.arc(cx, top - 10, 9, 0, Math.PI * 2)
  context.stroke()
  context.lineWidth = 4
  context.strokeStyle = GOLD_TRIM
  context.stroke()

  if (closed) {
    // A padlock with a magenta spell on the door.
    const lx = cx - half * 0.55
    const ly = (shoulder + bottom) / 2

    context.fillStyle = OUTLINE
    context.beginPath()
    context.arc(lx, ly, 15, 0, Math.PI * 2)
    context.fill()
    context.fillStyle = HEX
    context.beginPath()
    context.arc(lx, ly, 10, 0, Math.PI * 2)
    context.fill()
    context.fillStyle = '#ffd6f4'
    context.beginPath()
    context.arc(lx - 3, ly - 3, 4, 0, Math.PI * 2)
    context.fill()
  }
}
