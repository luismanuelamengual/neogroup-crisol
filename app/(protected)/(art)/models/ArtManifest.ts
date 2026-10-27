/**
 * What art and audio exist (public/art/manifest.json, written by `yarn art`).
 * Whatever is not listed is drawn with the provisional art, or is silent.
 */
export interface ArtManifest {
  /** Images by id (e.g. "enemies/thorn-boar"), with their size in pixels; the file is /art/<id>.webp. */
  images: Record<string, { width: number; height: number }>
  /** Map decorations of each biome (ids of images), cut from its sheet. */
  decorations: Record<string, string[]>
  /** Battle scenery props of each biome (ids of images), cut from its sheet at a shared scale. */
  props: Record<string, string[]>
  /** Parts cut from a parts sheet (ids of images) with their box on the sheet, for the skeletal rigs. */
  parts: Record<string, { id: string; x: number; y: number; width: number; height: number }[]>
  /** Music and sound effects available (names; files under /audio/). */
  music: string[]
  sfx: string[]
}

export const EMPTY_MANIFEST: ArtManifest = { images: {}, decorations: {}, props: {}, parts: {}, music: [], sfx: [] }
