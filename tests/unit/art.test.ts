import { describe, expect, it } from 'vitest'
import { MUSIC, SFX } from '@/app/(protected)/(art)/data/audio'
import { ENEMIES } from '@/app/(protected)/(engine)/data/enemies'
import { BATCHES, buildCatalog } from '@/scripts/art/catalog'
import { ENEMY_LOOKS } from '@/scripts/art/descriptions'
import { findParts, hasChromaBackground, opaqueBox, RawImage, removeChroma } from '@/scripts/art/images'

type Color = [number, number, number]

const GREEN: Color = [0, 255, 0]

/** A test image filled with chroma green, with `paint` drawing over it. */
function image(width: number, height: number, paint: (x: number, y: number) => Color | null): RawImage {
  const data = new Uint8ClampedArray(width * height * 4)

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const [r, g, b] = paint(x, y) ?? GREEN

      data.set([r, g, b, 255], (y * width + x) * 4)
    }
  }

  return { data, width, height }
}

const alphaAt = ({ data, width }: RawImage, x: number, y: number) => data[(y * width + x) * 4 + 3]

describe('art pipeline', () => {
  it('removes the green background but keeps the greens of the art', () => {
    // A brown body with a leaf-green (not chroma) patch inside.
    const picture = image(40, 40, (x, y) => {
      if (x >= 10 && x < 30 && y >= 10 && y < 30) {
        return x >= 15 && x < 25 && y >= 15 && y < 25 ? [60, 170, 40] : [120, 70, 30]
      }

      return null
    })

    expect(hasChromaBackground(picture)).toBe(true)
    removeChroma(picture)

    expect(alphaAt(picture, 0, 0)).toBe(0)
    expect(alphaAt(picture, 5, 20)).toBe(0)
    expect(alphaAt(picture, 20, 12)).toBe(255)
    expect(alphaAt(picture, 20, 20)).toBe(255)
    expect(opaqueBox(picture)).toEqual({ x: 10, y: 10, width: 20, height: 20 })
  })

  it('also clears pure green enclosed by the art', () => {
    // A ring: the hole is closed off from the borders.
    const picture = image(30, 30, (x, y) => {
      const inside = x >= 5 && x < 25 && y >= 5 && y < 25
      const hole = x >= 12 && x < 18 && y >= 12 && y < 18

      return inside && !hole ? [200, 40, 40] : null
    })

    removeChroma(picture)

    expect(alphaAt(picture, 15, 15)).toBe(0)
    expect(alphaAt(picture, 8, 8)).toBe(255)
  })

  it('does not take an image without the green background as chroma', () => {
    expect(hasChromaBackground(image(10, 10, () => [30, 30, 60]))).toBe(false)
  })

  it('finds the separate parts of a sheet in reading order', () => {
    const blocks = [
      { x: 2, y: 2, size: 8 },
      { x: 30, y: 4, size: 10 },
      { x: 4, y: 30, size: 12 }
    ]
    const sheet = image(50, 50, (x, y) =>
      blocks.some((block) => x >= block.x && x < block.x + block.size && y >= block.y && y < block.y + block.size)
        ? [90, 90, 200]
        : x === 45 && y === 45
          ? [255, 255, 255]
          : null
    )

    removeChroma(sheet)

    // The single stray pixel is too small to be a part.
    expect(findParts(sheet, 0.01).map(({ x, y, width, height }) => ({ x, y, width, height }))).toEqual([
      { x: 2, y: 2, width: 8, height: 8 },
      { x: 30, y: 4, width: 10, height: 10 },
      { x: 4, y: 30, width: 12, height: 12 }
    ])
  })

  it('lists every piece once, with a look for every species', () => {
    const catalog = buildCatalog()
    const ids = catalog.map((piece) => piece.id)

    expect(catalog).toHaveLength(224)
    expect(new Set(ids).size).toBe(ids.length)
    expect(catalog.every((piece) => BATCHES.includes(piece.batch) && piece.prompt.length > 40)).toBe(true)

    for (const species of ENEMIES) {
      expect(ENEMY_LOOKS[species.id], species.id).toBeTruthy()
      expect(ids).toContain(`${species.rarity === 'boss' ? 'bosses' : 'enemies'}/${species.id}`)
    }
  })

  it('names each theme and effect once', () => {
    expect(new Set(MUSIC).size).toBe(MUSIC.length)
    expect(new Set(SFX).size).toBe(SFX.length)
  })
})
