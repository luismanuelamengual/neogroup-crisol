import { SCENERY_DENSITY } from '@/app/(protected)/(engine)/data/scenery'
import { BIOME_TERRAINS, BIOMES_ORDER, LAKES, TERRAINS } from '@/app/(protected)/(engine)/data/terrains'
import { SceneryItem } from '@/app/(protected)/(engine)/models/SceneryItem'
import { TileMap } from '@/app/(protected)/(engine)/models/TileMap'
import { World } from '@/app/(protected)/(engine)/models/World'
import { createNoise } from '@/app/(protected)/(engine)/utils/noise'
import { createRandom } from '@/app/(protected)/(engine)/utils/random'

/**
 * Trees, bushes, rocks and the small things on the ground of the world map,
 * the same for the same world: woods grow where the noise says, thicker away
 * from the trails (the trails run through clearings), never on a trail or a
 * lake. Whatever stands rests all its foot on one level (never half over a
 * cliff), and bushes and rocks keep some room around them.
 */

/** Tiles kept free of tall pieces on each side of a trail, and how many tiles the woods take to reach their thickest. */
const TRAIL_GAP = 2
const TRAIL_FADE = 2
/** World pixels per wood of the noise, and how much of the land it covers. */
const WOODS_SCALE = 900
const WOODS_FLOOR = 0.3
/** Room under the rim of a plateau where nothing stands (the face of the cliff, see WorldGround). */
const CLIFF_FACE = 56
/**
 * Half the width of the foot of a tree (its trunk) and of a bush or a rock:
 * all of it must rest on the same level, off trails, lakes and the faces of
 * cliffs, or the piece would hang in the air.
 */
const FOOT = { tall: 16, low: 34 }
/** Least room between a bush or a rock and any other standing piece (trees may crowd each other: woods). */
const LOW_ROOM = 52
const SCALE_RANGE = [0.82, 1.18]

export function placeScenery(world: World, map: TileMap): SceneryItem[] {
  const { columns, rows, tileSize, terrains, heights, biomes, nearSeal } = map
  const random = createRandom(world.seed ^ 0x7ee5)
  const woods = createNoise(random, 3)
  const fromTrail = distancesFromTrails(map)
  const lakes = TERRAINS.map((terrain) => LAKES.has(terrain))
  const items: SceneryItem[] = []
  const indexAt = (x: number, y: number) =>
    Math.min(rows - 1, Math.max(0, Math.floor(y / tileSize))) * columns +
    Math.min(columns - 1, Math.max(0, Math.floor(x / tileSize)))
  const heightAt = (x: number, y: number) => heights[indexAt(x, y)]

  // Whether the whole foot of a piece rests on the level of its middle.
  const rests = (x: number, y: number, half: number) => {
    const level = heightAt(x, y)

    return [-half, 0, half].every((dx) =>
      [-half / 2, 0, half / 4].every((dy) => {
        const index = indexAt(x + dx, y + dy)

        return (
          heights[index] === level &&
          !map.paved[index] &&
          !lakes[terrains[index]] &&
          heightAt(x + dx, y + dy - CLIFF_FACE) <= level
        )
      })
    )
  }

  // The bushes and rocks placed so far, by tile, to keep room around them.
  const lows = new Map<number, SceneryItem[]>()

  const crowded = (x: number, y: number, standing: SceneryItem[]) => {
    const column = Math.floor(x / tileSize)
    const row = Math.floor(y / tileSize)

    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (
          (lows.get((row + dy) * columns + column + dx) ?? []).some(
            (low) => Math.hypot(low.x - x, low.y - y) < LOW_ROOM
          )
        ) {
          return true
        }
      }
    }

    return standing.some((other) => Math.hypot(other.x - x, other.y - y) < LOW_ROOM)
  }

  // The trees of the last two rows, the only ones close enough to crowd a new bush or rock.
  let trees: SceneryItem[] = []
  let lastTrees: SceneryItem[] = []

  for (let row = 0; row < rows; row++) {
    lastTrees = trees
    trees = []

    for (let column = 0; column < columns; column++) {
      const index = row * columns + column
      const distance = fromTrail[index]

      if (distance === 0 || lakes[terrains[index]]) {
        continue
      }

      const biome = BIOMES_ORDER[biomes[index]]
      const density = SCENERY_DENSITY[biome]
      const seals = BIOME_TERRAINS[biome].seal !== undefined
      const x = (column + random()) * tileSize
      const y = (row + random()) * tileSize
      const thickness =
        Math.min(1, Math.max(0, (woods(x / WOODS_SCALE, y / WOODS_SCALE) - WOODS_FLOOR) / (1 - WOODS_FLOOR) + 0.3)) *
        Math.min(1, distance / TRAIL_FADE)
      const item = (layer: SceneryItem['layer'], ix: number, iy: number): SceneryItem => ({
        x: ix,
        y: iy,
        layer,
        biome,
        pick: towardSeal(random(), seals ? nearSeal[index] / 255 : 0),
        scale: SCALE_RANGE[0] + random() * (SCALE_RANGE[1] - SCALE_RANGE[0]),
        flip: random() < 0.5
      })

      if (distance >= TRAIL_GAP && random() < density.tall * thickness) {
        if (rests(x, y, FOOT.tall) && !crowded(x, y, [])) {
          const tree = item('tall', x, y)

          items.push(tree)
          trees.push(tree)
        }
      } else if (random() < density.low * (0.4 + thickness)) {
        if (rests(x, y, FOOT.low) && !crowded(x, y, [...lastTrees, ...trees.slice(-2)])) {
          const low = item('low', x, y)

          items.push(low)
          lows.set(row * columns + column, [...(lows.get(row * columns + column) ?? []), low])
        }
      }

      // The small things also grow along the trails, but thinner.
      for (let count = 0; count < density.ground * Math.min(1, 0.4 + distance / TRAIL_FADE); count++) {
        if (random() < 0.7) {
          items.push(item('ground', (column + random()) * tileSize, (row + random()) * tileSize))
        }
      }
    }
  }

  return items
}

/**
 * The drawings of a biome whose Seal changes it are listed from its edge to
 * its Seal: the closer to the Seal, the further down the list the pick.
 */
function towardSeal(pick: number, toSeal: number): number {
  return toSeal > 0 ? Math.min(0.999, toSeal * 0.6 + pick * 0.4) : pick
}

/** Distance of each tile to the closest paved one, in tiles (up to a few). */
function distancesFromTrails({ columns, rows, paved }: TileMap): Uint8Array {
  const most = TRAIL_GAP + TRAIL_FADE
  const distances = new Uint8Array(columns * rows).fill(most)
  let frontier: number[] = []

  paved.forEach((value, index) => {
    if (value) {
      distances[index] = 0
      frontier.push(index)
    }
  })

  for (let distance = 1; distance < most && frontier.length; distance++) {
    const next: number[] = []

    for (const index of frontier) {
      const column = index % columns

      for (const neighbor of [
        column > 0 ? index - 1 : -1,
        column < columns - 1 ? index + 1 : -1,
        index - columns,
        index + columns
      ]) {
        if (neighbor >= 0 && neighbor < distances.length && distances[neighbor] > distance) {
          distances[neighbor] = distance
          next.push(neighbor)
        }
      }
    }

    frontier = next
  }

  return distances
}
