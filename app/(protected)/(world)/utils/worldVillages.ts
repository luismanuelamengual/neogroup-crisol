import { CanvasSource, Sprite, Texture } from 'pixi.js'
import { loadArtManifest, loadTextures } from '@/app/(protected)/(art)/utils/art'
import { Village, VillagePieceKind } from '@/app/(protected)/(engine)/models/VillagePiece'
import { VILLAGE_PIECE_SIZES } from '@/app/(protected)/(engine)/utils/village'
import {
  MERCHANT_VILLAGE_HOUSES,
  paintVillageHouse,
  VILLAGE_HOUSE_VARIANTS
} from '@/app/(protected)/(world)/utils/merchantHouses'
import { WorldScenery } from '@/app/(protected)/(world)/utils/worldScenery'
import { pixelsOf } from '@/app/(protected)/(world)/utils/zoneTextures'

/**
 * The drawings of the villages of the world map (see placeVillages): the
 * cottages from their own sheet (`map/village-sheet`, see `yarn art`) or,
 * while it does not exist, provisional ones painted in the style of the
 * merchant houses; the rest from the decorations of the meadows sheet (the
 * well, the fences, the windmill, the wheat, the hay, the cart and the sign).
 */

export type VillageTextures = Record<VillagePieceKind, Texture[]> & {
  /** The shadow of each cottage, hugging the bottom edge of its base (same size and anchor as its drawing). */
  houseShadows: Map<Texture, Texture>
}

/** The decorations of the meadows sheet of each kind (see MAP_SHEETS in scripts/art/catalog.ts, in its order). */
const MEADOWS_PIECES: Record<Exclude<VillagePieceKind, VillagePieceKind.HOUSE>, number[]> = {
  [VillagePieceKind.HAY]: [5, 6],
  [VillagePieceKind.FENCE]: [7, 8],
  [VillagePieceKind.WHEAT]: [11, 12],
  [VillagePieceKind.MILL]: [13],
  [VillagePieceKind.WELL]: [14],
  [VillagePieceKind.SIGN]: [15],
  [VillagePieceKind.CART]: [16]
}

export async function loadVillageTextures(): Promise<VillageTextures> {
  const { decorations } = await loadArtManifest()
  // Without the cottages the merchants live in (each one only once on the map), as long as some are left.
  const borrowed = new Set(Object.values(MERCHANT_VILLAGE_HOUSES))
  const allHouses = decorations.village ?? []
  const houseIds = allHouses.some((id) => !borrowed.has(id)) ? allHouses.filter((id) => !borrowed.has(id)) : allHouses
  const pieceIds = Object.values(MEADOWS_PIECES).flatMap((numbers) => numbers.map((number) => `map/meadows/${number}`))
  const art = await loadTextures([...houseIds, ...pieceIds])
  const houses = houseIds.flatMap((id) => (art.has(id) ? [art.get(id)!] : []))
  const result = {
    [VillagePieceKind.HOUSE]: houses.length
      ? houses
      : Array.from({ length: VILLAGE_HOUSE_VARIANTS }, (_, variant) => paintVillageHouse(variant))
  } as VillageTextures

  result.houseShadows = new Map(result[VillagePieceKind.HOUSE].map((texture) => [texture, paintContactShadow(texture)]))

  for (const [kind, numbers] of Object.entries(MEADOWS_PIECES)) {
    result[kind as VillagePieceKind] = numbers.flatMap((number) => {
      const texture = art.get(`map/meadows/${number}`)

      return texture ? [texture] : []
    })
  }

  return result
}

/** Stands the pieces of the villages among the scenery (as landmarks: the trees that would overlap them are left out). */
export function addVillages(villages: Village[], textures: VillageTextures, scenery: WorldScenery): void {
  for (const piece of villages.flatMap(({ pieces }) => pieces)) {
    const choices = textures[piece.kind]

    if (!choices.length) {
      continue
    }

    const sprite = new Sprite(choices[Math.floor(piece.pick * choices.length)])
    const scale = VILLAGE_PIECE_SIZES[piece.kind].height / sprite.texture.height
    // The sign and the cottages face the trails as drawn; the rest may be mirrored.
    const flip = piece.flip && piece.kind !== VillagePieceKind.SIGN && piece.kind !== VillagePieceKind.HOUSE

    sprite.anchor.set(0.5, HOUSE_ANCHOR)
    sprite.position.set(piece.x, piece.y)
    sprite.scale.set(flip ? -scale : scale, scale)
    scenery.add(sprite, piece.kind === VillagePieceKind.HOUSE ? textures.houseShadows.get(sprite.texture) : undefined)
  }
}

/** Where the drawings stand, in shares of their height from the top (as the rest of the scenery). */
const HOUSE_ANCHOR = 0.96
/** How far the contact shadow of a cottage reaches below its base and to the right (shares of its height), and how dark. */
const CONTACT_DEPTH = 0.09
const CONTACT_SHIFT = 0.035
const CONTACT_ALPHA = 0.5

/**
 * A shadow that follows the bottom edge of a drawing, column by column: the
 * base of a cottage seen from above and to the side is slanted, and a round
 * shadow under its middle leaves its corners floating. It falls a little to
 * the right (the light comes from the top left), soft and fading downward.
 */
export function paintContactShadow(texture: Texture): Texture {
  const art = pixelsOf(texture)
  const { width, height } = art
  const source = art.getContext('2d')!.getImageData(0, 0, width, height).data
  const depth = Math.max(4, Math.round(height * CONTACT_DEPTH))
  const shift = Math.round(height * CONTACT_SHIFT)
  const canvas = document.createElement('canvas')
  // Taller than the drawing: the shadow reaches below its lowest corner.
  const canvasHeight = height + depth * 2

  canvas.width = width
  canvas.height = canvasHeight

  const context = canvas.getContext('2d')!
  const image = context.createImageData(width, canvasHeight)
  const alpha = new Float32Array(width * canvasHeight)

  for (let x = 0; x < width; x++) {
    let bottom = -1

    for (let y = height - 1; y >= 0; y--) {
      if (source[(y * width + x) * 4 + 3] > 128) {
        bottom = y
        break
      }
    }

    // Only the base casts it (not the sign or the eaves hanging over the ground far above it).
    if (bottom < height * 0.7) {
      continue
    }

    const column = Math.min(width - 1, x + shift)

    for (let t = -Math.round(depth * 0.4); t < depth; t++) {
      const y = bottom + Math.round(shift * 0.4) + t

      if (y >= 0 && y < canvasHeight) {
        const share = t < 0 ? 1 : 1 - t / depth

        alpha[y * width + column] = Math.max(alpha[y * width + column], CONTACT_ALPHA * share * share)
      }
    }
  }

  // Softened sideways, so that it does not show the steps of its columns.
  const blurred = blur(alpha, width, canvasHeight, Math.max(1, Math.round(depth / 3)))

  for (let index = 0; index < blurred.length; index++) {
    image.data[index * 4 + 3] = Math.round(blurred[index] * 255)
    image.data[index * 4] = 18
    image.data[index * 4 + 1] = 12
    image.data[index * 4 + 2] = 6
  }

  context.putImageData(image, 0, 0)

  // Anchored like the drawings of the cottages (see addVillages), its taller canvas taken into account.
  return new Texture({
    source: new CanvasSource({ resource: canvas, resolution: texture.source.resolution ?? 1 }),
    defaultAnchor: { x: 0.5, y: (height * HOUSE_ANCHOR) / canvasHeight }
  })
}

/** A box blur, across and then down. */
function blur(values: Float32Array, width: number, height: number, radius: number): Float32Array {
  const across = new Float32Array(values.length)
  const down = new Float32Array(values.length)

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0

      for (let dx = -radius; dx <= radius; dx++) {
        sum += values[y * width + Math.min(width - 1, Math.max(0, x + dx))]
      }

      across[y * width + x] = sum / (radius * 2 + 1)
    }
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0

      for (let dy = -radius; dy <= radius; dy++) {
        sum += across[Math.min(height - 1, Math.max(0, y + dy)) * width + x]
      }

      down[y * width + x] = sum / (radius * 2 + 1)
    }
  }

  return down
}
