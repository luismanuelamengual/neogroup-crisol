import { Assets, CanvasSource, Texture, TextureSource } from 'pixi.js'
import { ArtManifest, EMPTY_MANIFEST } from '@/app/(protected)/(art)/models/ArtManifest'
import { isHandheld } from '@/app/(protected)/(art)/utils/device'

/**
 * The final art, as far as it exists: the manifest says which images are
 * there (see `yarn art`), and anything missing is drawn with the provisional
 * art. Loaded once per session.
 */

let manifest: Promise<ArtManifest> | null = null

export function loadArtManifest(): Promise<ArtManifest> {
  manifest ??= fetch('/art/manifest.json')
    // A manifest written before a field existed gets it empty.
    .then((response) => (response.ok ? (response.json() as Promise<ArtManifest>) : EMPTY_MANIFEST))
    .then((loaded) => ({ ...EMPTY_MANIFEST, ...loaded }))
    .catch(() => EMPTY_MANIFEST)

  return manifest
}

export function artUrl(id: string): string {
  return `/art/${id}.webp`
}

/** The textures of the images that exist among `ids` (the rest are left out). */
export async function loadTextures(ids: string[]): Promise<Map<string, Texture>> {
  const { images } = await loadArtManifest()
  const present = [...new Set(ids)].filter((id) => images[id])
  const textures = new Map<string, Texture>()

  await Promise.all(
    present.map(async (id) => {
      try {
        textures.set(id, await loadArt(id, images[id]))
      } catch {
        // A file that does not load keeps the provisional art.
      }
    })
  )

  return textures
}

/**
 * Longest side of an image on a phone: the bands of the battle landscape
 * (2048 pixels, about twice what a phone shows) are reduced to it, so they
 * take half the memory of the GPU and load onto it faster.
 */
const HANDHELD_MAX_SIDE = 1400
/** The reduced images, loaded once per session (each caller gets its own texture of the same pixels). */
const reduced = new Map<string, Promise<TextureSource>>()

/** The texture of an image; on a phone, a big one reduced (drawn at the same size, with fewer pixels). */
async function loadArt(id: string, size: { width: number; height: number }): Promise<Texture> {
  const longest = Math.max(size.width, size.height)

  if (!isHandheld() || longest <= HANDHELD_MAX_SIDE) {
    return Assets.load<Texture>(artUrl(id))
  }

  if (!reduced.has(id)) {
    const loading = reduce(id, HANDHELD_MAX_SIDE / longest)

    // A failed load can be tried again.
    loading.catch(() => reduced.delete(id))
    reduced.set(id, loading)
  }

  return new Texture({ source: await reduced.get(id)! })
}

async function reduce(id: string, scale: number): Promise<TextureSource> {
  const response = await fetch(artUrl(id))

  if (!response.ok) {
    throw new Error(`${id}: ${response.status}`)
  }

  const bitmap = await createImageBitmap(await response.blob())
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')!
  // An `@2x` image is drawn at half its pixels: with fewer pixels, at a smaller share still.
  const resolution = Number(/@(\d+)x$/.exec(id)?.[1] ?? 1) * scale

  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  context.imageSmoothingQuality = 'high'
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()

  return new CanvasSource({ resource: canvas, resolution })
}

/** The image of a fighter: its hero figure, or its enemy or boss figure. */
export function figureArtId(side: 'hero' | 'enemy', id: string, boss: boolean): string {
  return side === 'hero' ? `heroes/${id}/full` : `${boss ? 'bosses' : 'enemies'}/${id}`
}
