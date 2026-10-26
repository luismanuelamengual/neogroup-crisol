import { Assets, Texture } from 'pixi.js'
import { ArtManifest, EMPTY_MANIFEST } from '@/app/(protected)/(art)/models/ArtManifest'

/**
 * The final art, as far as it exists: the manifest says which images are
 * there (see `yarn art`), and anything missing is drawn with the provisional
 * art. Loaded once per session.
 */

let manifest: Promise<ArtManifest> | null = null

export function loadArtManifest(): Promise<ArtManifest> {
  manifest ??= fetch('/art/manifest.json')
    .then((response) => (response.ok ? (response.json() as Promise<ArtManifest>) : EMPTY_MANIFEST))
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
        textures.set(id, await Assets.load<Texture>(artUrl(id)))
      } catch {
        // A file that does not load keeps the provisional art.
      }
    })
  )

  return textures
}

/** The image of a fighter: its hero figure, or its enemy or boss figure. */
export function figureArtId(side: 'hero' | 'enemy', id: string, boss: boolean): string {
  return side === 'hero' ? `heroes/${id}/full` : `${boss ? 'bosses' : 'enemies'}/${id}`
}
