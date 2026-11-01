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
import {
  Box,
  findParts,
  hasChromaBackground,
  makeSeamless,
  opaqueBox,
  Part,
  RawImage,
  removeChroma
} from '@/scripts/art/images'

const SOURCE = 'art/source'
const OUTPUT = 'public/art'
const AUDIO = 'public/audio'
const EXTENSIONS = ['png', 'webp', 'jpg', 'jpeg']
/** Largest side of each kind of piece in the game, in pixels (about twice what a phone shows). */
const MAX_SIDE: Record<PieceKind, number> = {
  hero: 720,
  heroPart: 720,
  weapon: 1024,
  portrait: 256,
  enemy: 512,
  boss: 900,
  bossParts: 0,
  background: 1920,
  mapSheet: 0,
  propSheet: 0,
  horizonSheet: 0,
  landmarkSheet: 0,
  floorStrip: 0,
  scenerySheet: 0,
  building: 320,
  tile: 256,
  icon: 128
}
/** A part keeps the scale of its figure: the sheet is reduced by this. */
const PARTS_SCALE = 0.5
const DECORATION_SIDE = 256
/**
 * Scenery: the longest side of each layer as drawn on the map, doubled so it
 * stays sharp at the closest zoom (the `@2x` in its name tells PixiJS to draw
 * it at half its pixels), and where each layer ends on the sheet (share of its
 * height, by the middle of each piece).
 */
const SCENERY_SIDE = { tall: 328, low: 160, ground: 64 }
const SCENERY_ROWS = { tall: 0.5, low: 0.75 }
/** Props keep their sizes relative to each other (a tree taller than a rock): the whole sheet is reduced by this. */
const PROPS_SCALE = 0.5
/** Widest side of a band of the battle landscape and tallest side of a landmark (about twice what a phone shows). */
const HORIZON_SIDE = 2048
const LANDMARK_SIDE = 640

function sourceOf(id: string): string | null {
  return EXTENSIONS.map((extension) => join(SOURCE, `${id}.${extension}`)).find((path) => existsSync(path)) ?? null
}

/** The pixels of an image; with `square`, cut to a centered square of that side. */
async function readRaw(path: string, square?: number): Promise<RawImage> {
  const image = sharp(path).ensureAlpha()
  const { data, info } = await (square ? image.resize(square, square, { fit: 'cover' }) : image)
    .raw()
    .toBuffer({ resolveWithObject: true })

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

  if (piece.kind === 'tile') {
    // Ground textures fill the whole square: no background to remove, nothing to trim.
    const square = Math.min(image.width, image.height)
    const cropped = await readRaw(path, square)

    manifest.images[piece.id] = await writeWebp(
      makeSeamless(cropped),
      { x: 0, y: 0, width: square, height: square },
      piece.id,
      MAX_SIDE.tile
    )

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

  if (piece.kind === 'scenerySheet') {
    const biome = piece.id.replace(/^map\//, '').replace(/-scenery$/, '')
    const layers: ArtManifest['scenery'][string] = { tall: [], low: [], ground: [] }

    for (const box of findParts(image, 0.0005)) {
      const middle = (box.y + box.height / 2) / image.height
      const layer = middle < SCENERY_ROWS.tall ? 'tall' : middle < SCENERY_ROWS.low ? 'low' : 'ground'
      const id = `map/${biome}/scenery/${layer}-${layers[layer].length + 1}@2x`

      manifest.images[id] = await writeWebp(image, box, id, SCENERY_SIDE[layer])
      layers[layer].push(id)
    }

    manifest.scenery[biome] = layers

    return
  }

  if (piece.kind === 'propSheet') {
    const biome = piece.id.replace(/^props\//, '').replace(/-sheet$/, '')
    const ids: string[] = []

    for (const [index, box] of findParts(image, 0.004).entries()) {
      const id = `props/${biome}/${index + 1}`

      manifest.images[id] = await writeWebp(image, box, id, Math.max(box.width, box.height) * PROPS_SCALE)
      ids.push(id)
    }

    manifest.props[biome] = ids

    return
  }

  if (piece.kind === 'horizonSheet') {
    const biome = piece.id.replace(/^battle\//, '').replace(/-horizon$/, '')
    // The three biggest drawings are the bands (crumbs are left out), far to near from the top.
    const bands = findParts(image, 0.004)
      .sort((a, b) => b.width * b.height - a.width * a.height)
      .slice(0, 3)
      .sort((a, b) => a.y - b.y)
    const ids: string[] = []

    for (const [index, box] of bands.entries()) {
      const id = `battle/${biome}/${['far', 'middle', 'near'][index]}`

      manifest.images[id] = await writeWebp(image, box, id, HORIZON_SIDE)
      ids.push(id)
    }

    manifest.battle[biome] = {
      ...manifest.battle[biome],
      landmarks: manifest.battle[biome]?.landmarks ?? [],
      bands: ids
    }

    return
  }

  if (piece.kind === 'floorStrip') {
    const biome = piece.id.replace(/^battle\//, '').replace(/-floor$/, '')
    const id = `battle/${biome}/floor`

    // Only the top corners are green (the floor reaches the bottom), so the check above misses it.
    if (!hasChromaBackground(image)) {
      removeChroma(image)
    }

    // The whole strip: its decorated edge on top (the green above it is gone) and the floor down to the bottom.
    manifest.images[id] = await writeWebp(image, opaqueBox(image) ?? whole, id, HORIZON_SIDE)
    manifest.battle[biome] = {
      bands: manifest.battle[biome]?.bands ?? [],
      landmarks: manifest.battle[biome]?.landmarks ?? [],
      floor: id
    }

    return
  }

  if (piece.kind === 'landmarkSheet') {
    const biome = piece.id.replace(/^battle\//, '').replace(/-landmarks$/, '')
    const ids: string[] = []

    for (const [index, box] of findParts(image, 0.004).entries()) {
      const id = `battle/${biome}/landmarks/${index + 1}`

      manifest.images[id] = await writeWebp(image, box, id, LANDMARK_SIDE)
      ids.push(id)
    }

    manifest.battle[biome] = { ...manifest.battle[biome], bands: manifest.battle[biome]?.bands ?? [], landmarks: ids }

    return
  }

  if (piece.kind === 'heroPart' || piece.kind === 'weapon') {
    // One piece: everything drawn (a sword guard drawn apart from its blade stays with it).
    const box = opaqueBox(image) ?? whole

    manifest.images[piece.id] = await writeWebp(image, box, piece.id, MAX_SIDE[piece.kind])
    manifest.parts[piece.id] = [{ id: piece.id, ...box }]

    return
  }

  if (piece.kind === 'bossParts') {
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
  const manifest: ArtManifest = {
    images: {},
    decorations: {},
    scenery: {},
    props: {},
    battle: {},
    parts: {},
    music: [],
    sfx: []
  }
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
