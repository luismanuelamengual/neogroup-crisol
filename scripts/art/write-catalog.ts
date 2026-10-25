/* eslint-disable no-console */
/**
 * Writes art/catalog.csv: one row per piece of art with its file, size,
 * batch and full prompt, to generate them (see scripts/art/catalog.ts).
 *
 * Usage: yarn art:catalog
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { BATCHES, buildCatalog } from '@/scripts/art/catalog'

const pieces = buildCatalog().sort((a, b) => BATCHES.indexOf(a.batch) - BATCHES.indexOf(b.batch))
const quote = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`
const rows = [
  ['batch', 'file', 'width', 'height', 'prompt'],
  ...pieces.map((piece) => [piece.batch, `art/source/${piece.id}.png`, piece.width, piece.height, piece.prompt])
]

mkdirSync('art', { recursive: true })
writeFileSync('art/catalog.csv', `${rows.map((row) => row.map(quote).join(',')).join('\n')}\n`)
console.log(`art/catalog.csv: ${pieces.length} pieces`)
