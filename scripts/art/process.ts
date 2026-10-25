/* eslint-disable no-console */
/**
 * Processes the generated art and audio into the game: reads art/source/
 * (named as in art/catalog.csv), removes the green background, trims, resizes,
 * cuts the sheets into pieces, writes WebP images to public/art/ and copies the
 * audio to public/audio/, then writes public/art/manifest.json and lists what
 * is still missing in each batch.
 *
 * Usage: yarn art
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import sharp from 'sharp'
import { MUSIC, SFX } from '@/app/(protected)/(art)/data/audio'
import { ArtManifest } from '@/app/(protected)/(art)/models/ArtManifest'
import { BATCHES, buildCatalog, Piece, PieceKind } from '@/scripts/art/catalog'
import { Box, findParts, hasChromaBackground, opaqueBox, Part, RawImage, removeChroma } from '@/scripts/art/images'

const SOURCE = 'art/source'
const OUTPUT = 'public/art'
const AUDIO = 'public/audio'
const EXTENSIONS = ['png', 'webp', 'jpg', 'jpeg']
/** Largest side of each kind of piece in the game, in pixels (about twice what a phone shows). */
const MAX_SIDE: Record<PieceKind, number> = {
  hero: 720,
  heroParts: 0,
  portrait: 256,
  enemy: 512,
  boss: 900,
  bossParts: 0,
  background: 1920,
  mapSheet: 0,
  icon: 128
}
/** A part keeps the scale of its figure: the sheet is reduced by this. */
const PARTS_SCALE = 0.5
const DECORATION_SIDE = 256

function sourceOf(id: string): string | null {
  return EXTENSIONS.map((extension) => join(SOURCE, `${id}.${extension}`)).find((path) => existsSync(path)) ?? null
}

async function readRaw(path: string): Promise<RawImage> {
  const { data, info } = await sharp(path).ensureAlpha().raw().toBuffer({ resolveWithObject: true })

  return { data, width: info.width, height: info.height }
}

async function writeWebp(
  image: RawImage,
  box: Box | Part,
  id: string,
  maxSide: number,
  quality = 88
): Promise<{ width: number; height: number }> {
  const path = join(OUTPUT, `${id}.webp`)
  const scale = maxSide > 0 ? Math.min(1, maxSide / Math.max(box.width, box.height)) : 1
  const width = Math.max(1, Math.round(box.width * scale))
  const height = Math.max(1, Math.round(box.height * scale))
  // Only the piece's own pixels: a neighbor reaching into its box is left out.
  const pixels = Buffer.alloc(box.width * box.height * 4)

  for (let y = 0; y < box.height; y++) {
    for (let x = 0; x < box.width; x++) {
      const target = (y * box.width + x) * 4

      if (!('mask' in box) || box.mask[y * box.width + x]) {
        pixels.set(
          image.data.subarray(
            ((box.y + y) * image.width + box.x + x) * 4,
            ((box.y + y) * image.width + box.x + x) * 4 + 4
          ),
          target
        )
      }
    }
  }

  mkdirSync(dirname(path), { recursive: true })
  await sharp(pixels, { raw: { width: box.width, height: box.height, channels: 4 } })
    .resize(width, height)
    .webp({ quality, alphaQuality: 90 })
    .toFile(path)

  return { width, height }
}

async function processPiece(piece: Piece, path: string, manifest: ArtManifest): Promise<void> {
  const image = await readRaw(path)
  const whole = { x: 0, y: 0, width: image.width, height: image.height }

  if (piece.kind === 'background' || piece.kind === 'portrait') {
    const size = piece.kind === 'background' ? { width: 1920, height: 1080 } : { width: 256, height: 256 }
    const output = join(OUTPUT, `${piece.id}.webp`)

    mkdirSync(dirname(output), { recursive: true })
    await sharp(path).resize(size.width, size.height, { fit: 'cover' }).webp({ quality: 82 }).toFile(output)
    manifest.images[piece.id] = size

    return
  }

  if (hasChromaBackground(image)) {
    removeChroma(image)
  }

  if (piece.kind === 'mapSheet') {
    const biome = piece.id.replace(/^map\//, '').replace(/-sheet$/, '')
    const ids: string[] = []

    // Any layout works: each separate drawing is a decoration (crumbs are left out).
    for (const [index, box] of findParts(image, 0.004).entries()) {
      const id = `map/${biome}/${index + 1}`

      manifest.images[id] = await writeWebp(image, box, id, DECORATION_SIDE)
      ids.push(id)
    }

    manifest.decorations[biome] = ids

    return
  }

  if (piece.kind === 'heroParts' || piece.kind === 'bossParts') {
    const parts: ArtManifest['parts'][string] = []

    for (const [index, box] of findParts(image).entries()) {
      const id = `${piece.id}/${index + 1}`

      manifest.images[id] = await writeWebp(image, box, id, Math.max(box.width, box.height) * PARTS_SCALE)
      parts.push({ id, x: box.x, y: box.y, width: box.width, height: box.height })
    }

    manifest.parts[piece.id] = parts

    return
  }

  const box = opaqueBox(image) ?? whole

  manifest.images[piece.id] = await writeWebp(image, box, piece.id, MAX_SIDE[piece.kind])
}

function copyAudio(kind: 'music' | 'sfx', names: readonly string[]): string[] {
  const found: string[] = []

  for (const name of names) {
    const source = ['mp3', 'ogg'].map((extension) => join(SOURCE, kind, `${name}.${extension}`)).find(existsSync)

    if (source) {
      mkdirSync(join(AUDIO, kind), { recursive: true })
      copyFileSync(source, join(AUDIO, kind, `${name}.mp3`))
      found.push(name)
    }
  }

  return found
}

async function main(): Promise<void> {
  const catalog = buildCatalog()
  const manifest: ArtManifest = { images: {}, decorations: {}, parts: {}, music: [], sfx: [] }
  const missing = new Map<string, string[]>()

  rmSync(OUTPUT, { recursive: true, force: true })
  mkdirSync(OUTPUT, { recursive: true })

  for (const piece of catalog) {
    const path = sourceOf(piece.id)

    if (path) {
      await processPiece(piece, path, manifest)
    } else {
      missing.set(piece.batch, [...(missing.get(piece.batch) ?? []), piece.id])
    }
  }

  manifest.music = copyAudio('music', MUSIC)
  manifest.sfx = copyAudio('sfx', SFX)
  writeFileSync(join(OUTPUT, 'manifest.json'), `${JSON.stringify(manifest, null, 1)}\n`)

  const known = new Set(catalog.map((piece) => piece.id))
  const strays = existsSync(SOURCE)
    ? readdirSync(SOURCE, { recursive: true, encoding: 'utf8' })
        .filter((file) => EXTENSIONS.some((extension) => file.endsWith(`.${extension}`)))
        .map((file) => file.replace(/\.\w+$/, ''))
        .filter((id) => !known.has(id))
    : []

  console.log(
    `${Object.keys(manifest.images).length} images, ${manifest.music.length}/${MUSIC.length} music, ${manifest.sfx.length}/${SFX.length} sound effects`
  )

  for (const batch of BATCHES) {
    const left = missing.get(batch) ?? []
    const total = catalog.filter((piece) => piece.batch === batch).length

    console.log(
      `${batch.padEnd(12)} ${String(total - left.length).padStart(3)}/${total}${left.length ? `  missing: ${left.join(', ')}` : ''}`
    )
  }

  if (strays.length > 0) {
    console.log(`Not in the catalog (check the names): ${strays.join(', ')}`)
  }
}

void main()
