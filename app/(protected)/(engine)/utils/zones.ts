import { BIOME_PLAIN_WEIGHT, LAIRS, ZoneDefinition, ZONES, ZONES_ORDER } from '@/app/(protected)/(engine)/data/zones'
import { Biome } from '@/app/(protected)/(engine)/models/Biome'
import { BossKind } from '@/app/(protected)/(engine)/models/BossKind'
import { World } from '@/app/(protected)/(engine)/models/World'
import { createNoise } from '@/app/(protected)/(engine)/utils/noise'
import { createRandom } from '@/app/(protected)/(engine)/utils/random'

/**
 * Where the zones of the biomes lie (see data/zones.ts), the same for the
 * same world: the biome is cut in cells of irregular shape (the closest of
 * some scattered centers, with wobbly borders), each one of a zone or of the
 * plain biome, and its lair surrounds its captor.
 */

/** Side of the grid the centers of the cells are scattered on (world pixels), and how much their borders wobble. */
const CELL = 1500
const WOBBLE = 380
const WOBBLE_SCALE = 700
/** How much the edge of a lair wobbles, in shares of its radius. */
const LAIR_WOBBLE = 0.22

/** The zone of a point of a biome: its index in ZONES_ORDER plus one, or 0 for none. */
export type ZoneFinder = (x: number, y: number, biome: Biome) => number

export function createZoneFinder(world: World): ZoneFinder {
  const random = createRandom(world.seed ^ 0x2093)
  const warpX = createNoise(random, 2)
  const warpY = createNoise(random, 2)
  const lairNoise = createNoise(random, 2)
  const salt = Math.floor(random() * 0x7fffffff)
  const byBiome = new Map<Biome, ZoneDefinition[]>()

  for (const definition of ZONES) {
    if (definition.weight > 0) {
      byBiome.set(definition.biome, [...(byBiome.get(definition.biome) ?? []), definition])
    }
  }

  const lairs = world.nodes.flatMap((node) =>
    node.bossKind === BossKind.CAPTOR && LAIRS[node.biome]
      ? [{ biome: node.biome, x: node.x, y: node.y, ...LAIRS[node.biome]! }]
      : []
  )

  // A number in [0, 1) for each cell and biome, always the same.
  const hash = (column: number, row: number, extra: number) => {
    let h = Math.imul(column, 0x27d4eb2d) ^ Math.imul(row, 0x165667b1) ^ Math.imul(extra + 1, 0x9e3779b1) ^ salt

    h = Math.imul(h ^ (h >>> 15), 0x85ebca6b)
    h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35)

    return ((h ^ (h >>> 16)) >>> 0) / 4294967296
  }

  return (x, y, biome) => {
    for (const lair of lairs) {
      const reach = lair.radius * (1 - LAIR_WOBBLE + 2 * LAIR_WOBBLE * lairNoise(x / 500, y / 500))

      if (lair.biome === biome && Math.hypot(lair.x - x, lair.y - y) < reach) {
        return ZONES_ORDER.indexOf(lair.zone) + 1
      }
    }

    const zones = byBiome.get(biome)

    if (!zones) {
      return 0
    }

    // The closest center to the point, moved a little by the noise so that the borders wobble.
    const wx = x + (warpX(x / WOBBLE_SCALE, y / WOBBLE_SCALE) - 0.5) * 2 * WOBBLE
    const wy = y + (warpY(x / WOBBLE_SCALE, y / WOBBLE_SCALE) - 0.5) * 2 * WOBBLE
    const column = Math.floor(wx / CELL)
    const row = Math.floor(wy / CELL)
    let best = Infinity
    let pick = 0

    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const cx = (column + dx + 0.15 + 0.7 * hash(column + dx, row + dy, 1)) * CELL
        const cy = (row + dy + 0.15 + 0.7 * hash(column + dx, row + dy, 2)) * CELL
        const distance = Math.hypot(cx - wx, cy - wy)

        if (distance < best) {
          best = distance
          pick = hash(column + dx, row + dy, 3)
        }
      }
    }

    const total = BIOME_PLAIN_WEIGHT + zones.reduce((sum, { weight }) => sum + weight, 0)
    let left = pick * total - BIOME_PLAIN_WEIGHT

    for (const definition of zones) {
      if (left < definition.weight) {
        return left < 0 ? 0 : ZONES_ORDER.indexOf(definition.zone) + 1
      }

      left -= definition.weight
    }

    return 0
  }
}
