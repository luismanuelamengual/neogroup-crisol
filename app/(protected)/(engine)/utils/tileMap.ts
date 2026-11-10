import {
  BIOME_RISE,
  BIOME_TERRAINS,
  BIOMES_ORDER,
  BiomeTerrains,
  LAKES,
  TERRAINS
} from '@/app/(protected)/(engine)/data/terrains'
import { getZoneDefinition, VILLAGES, ZONES_ORDER } from '@/app/(protected)/(engine)/data/zones'
import { Biome } from '@/app/(protected)/(engine)/models/Biome'
import { BossKind } from '@/app/(protected)/(engine)/models/BossKind'
import { Terrain } from '@/app/(protected)/(engine)/models/Terrain'
import { TileMap } from '@/app/(protected)/(engine)/models/TileMap'
import { World } from '@/app/(protected)/(engine)/models/World'
import { WorldNode } from '@/app/(protected)/(engine)/models/WorldNode'
import { createNoise } from '@/app/(protected)/(engine)/utils/noise'
import { createRandom } from '@/app/(protected)/(engine)/utils/random'
import { placeVillages } from '@/app/(protected)/(engine)/utils/village'
import { createZoneFinder } from '@/app/(protected)/(engine)/utils/zones'

/**
 * The ground of the world map as square tiles, worked out from the points and
 * trails (the same world always gives the same tiles): every tile takes the
 * biome of its closest point; trails are paved, points sit on a small clearing
 * of the same paving, and lakes and patches come from noise away from them.
 * The ground rises in levels (plateaus) from more noise, but the trails rule
 * it: every point has a level, a trail running east-west joins two points of
 * the same level and is flat, one running north-south climbs at most one
 * level, by a single straight step halfway (drawn as stairs, see
 * WorldGround). A strip on each side of a trail and the clearing of a point
 * are as flat as the trail, and lakes only lie on flat ground.
 */

export const TILE_SIZE = 64
/** Half the width of a paved trail, and the radius of the clearing around a point (world pixels). */
const TRAIL_HALF_WIDTH = 52
const CLEARING_RADIUS = 84
/** Shares of the radius of a village: flat and dry up to the first, its ground blending into the land around up to the second. */
const VILLAGE_FLAT = 0.85
const VILLAGE_EDGE = 1.25
/** Lakes keep this far from trails and points. */
const LAKE_CLEARANCE = 160
/** Noise above these makes a lake or a patch; the scales are in world pixels. */
const LAKE_THRESHOLD = 0.56
const LAKE_SCALE = 1100
const PATCH_THRESHOLD = 0.62
const PATCH_SCALE = 520
/** World pixels per bend of the rivers (see BiomeTerrains.rivers). */
const RIVER_SCALE = 1400
/** How much the noise widens or narrows the trails (never under half the diagonal of a tile, or they would break). */
const TRAIL_WOBBLE = 0.12
/** World pixels per hill of the noise of the levels. */
const HEIGHT_SCALE = 1100
/** Share of the tiles under each level (the rest is the top one). */
const LEVEL_SHARES = [0.42, 0.72, 0.9]
/** The strip around a trail that takes its level (world pixels from its middle). */
const CORRIDOR = TRAIL_HALF_WIDTH + TILE_SIZE
/** Passes evening out the ground around the trails, at most. */
const SETTLE_PASSES = 40
/** Side of the buckets used to find close points and trails quickly. */
const BUCKET = 400

export function buildTileMap(world: World): TileMap {
  const columns = Math.ceil(world.width / TILE_SIZE)
  const rows = Math.ceil(world.height / TILE_SIZE)
  const terrains = new Uint8Array(columns * rows)
  const random = createRandom(world.seed ^ 0x711e)
  const lakeNoise = createNoise(random, 3)
  const patchNoise = createNoise(random, 3)
  const trailNoise = createNoise(random, 2)
  const heightNoise = createNoise(random, 3)
  // Made after the rest, so that the other noises stay as they were.
  const riverNoise = createNoise(random, 2)
  const sealNoise = createNoise(random, 2)
  const paved = new Uint8Array(columns * rows)
  const rise = new Float32Array(columns * rows)
  const grounds = new Uint8Array(columns * rows)
  const biomes = new Uint8Array(columns * rows)
  const nearSeal = new Uint8Array(columns * rows)
  const zones = new Uint8Array(columns * rows)
  // Its own random numbers, so that the noises above stay as they were.
  const zoneAt = createZoneFinder(world)
  const seals = sealsOf(world)
  const nodes = new Map(world.nodes.map((node) => [node.id, node]))
  const nodeBuckets = new Buckets<WorldNode>(world.width)
  const trailBuckets = new Buckets<[WorldNode, WorldNode]>(world.width)
  const terrainIndex = new Map(TERRAINS.map((terrain, index) => [terrain, index]))

  for (const node of world.nodes) {
    nodeBuckets.add(node.x, node.y, node.x, node.y, node)
  }

  for (const [a, b] of world.edges) {
    const from = nodes.get(a)!
    const to = nodes.get(b)!

    trailBuckets.add(Math.min(from.x, to.x), Math.min(from.y, to.y), Math.max(from.x, to.x), Math.max(from.y, to.y), [
      from,
      to
    ])
  }

  // The villages around the merchants lie on one level and keep dry (see placeVillages).
  const villages = world.nodes.flatMap((node) =>
    node.merchant && VILLAGES[node.biome]
      ? [
          {
            x: node.x,
            y: node.y,
            radius: VILLAGES[node.biome]!.radius,
            rise: heightNoise(node.x / HEIGHT_SCALE, node.y / HEIGHT_SCALE) + BIOME_RISE[node.biome]
          }
        ]
      : []
  )

  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      const x = (column + 0.5) * TILE_SIZE
      const y = (row + 0.5) * TILE_SIZE
      let closest: WorldNode | null = null
      let nodeDistance = Infinity
      let trailDistance = Infinity

      for (const node of nodeBuckets.around(x, y, 2)) {
        const distance = Math.hypot(node.x - x, node.y - y)

        if (distance < nodeDistance) {
          closest = node
          nodeDistance = distance
        }
      }

      for (const [from, to] of trailBuckets.around(x, y, 1)) {
        trailDistance = Math.min(trailDistance, distanceToSegment(x, y, from, to))
      }

      const home = (closest ?? world.nodes[0]).biome
      const seal = seals.get(home)
      // How close to the Seal of the biome, a little wobbly so that the rings around it are not round.
      const toSeal = seal
        ? Math.min(
            1,
            Math.max(0, 1 - Math.hypot(seal.x - x, seal.y - y) / seal.reach + (sealNoise(x / 900, y / 900) - 0.5) * 0.3)
          )
        : 0
      const zone = zoneAt(x, y, home)
      const biome = withZone(terrainsNear(BIOME_TERRAINS[home], toSeal), zone)
      // How much of a village the tile is: all of it up to most of its radius, fading out to its edge.
      const village = villages.find((place) => Math.hypot(place.x - x, place.y - y) < place.radius * VILLAGE_EDGE)
      const inVillage = village
        ? Math.min(
            1,
            (VILLAGE_EDGE - Math.hypot(village.x - x, village.y - y) / village.radius) / (VILLAGE_EDGE - VILLAGE_FLAT)
          )
        : 0
      const width = TRAIL_HALF_WIDTH * (1 - TRAIL_WOBBLE + 2 * TRAIL_WOBBLE * trailNoise(x / 300, y / 300))
      let terrain: Terrain

      if (trailDistance < width || nodeDistance < CLEARING_RADIUS) {
        terrain = biome.trail
        paved[row * columns + column] = 1
      } else if (
        biome.lake &&
        !inVillage &&
        trailDistance > LAKE_CLEARANCE &&
        nodeDistance > LAKE_CLEARANCE &&
        (lakeNoise(x / LAKE_SCALE, y / LAKE_SCALE) > (biome.lakes ?? LAKE_THRESHOLD) ||
          (biome.rivers !== undefined && Math.abs(riverNoise(x / RIVER_SCALE, y / RIVER_SCALE) - 0.5) < biome.rivers))
      ) {
        terrain = biome.lake
      } else if (patchNoise(x / PATCH_SCALE, y / PATCH_SCALE) > (biome.patchy ?? PATCH_THRESHOLD)) {
        terrain = biome.patches
      } else {
        terrain = biome.ground
      }

      nearSeal[row * columns + column] = Math.round(toSeal * 255)
      terrains[row * columns + column] = terrainIndex.get(terrain)!
      rise[row * columns + column] =
        (heightNoise(x / HEIGHT_SCALE, y / HEIGHT_SCALE) + BIOME_RISE[home]) * (1 - inVillage) +
        (village?.rise ?? 0) * inVillage
      grounds[row * columns + column] = terrainIndex.get(biome.ground)!
      biomes[row * columns + column] = BIOMES_ORDER.indexOf(home)
      zones[row * columns + column] = zone
    }
  }

  const heights = buildHeights(world, columns, rows, rise)

  digMoats(columns, rows, zones, paved, terrains, grounds, terrainIndex)

  // A lake next to a change of level would spill over a cliff: there it is dry ground.
  const lakes = new Set(TERRAINS.flatMap((terrain, index) => (LAKES.has(terrain) ? [index] : [])))

  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      const index = row * columns + column

      if (lakes.has(terrains[index]) && !isFlatAround(heights, columns, rows, column, row)) {
        terrains[index] = grounds[index]
      }
    }
  }

  const map = { columns, rows, tileSize: TILE_SIZE, terrains, heights, paved, biomes, nearSeal, zones }
  const dirt = terrainIndex.get(Terrain.DIRT)!

  // The dirt paths of the villages, from the doors of their cottages to the trails.
  for (const village of placeVillages(world, map)) {
    village.paths.forEach((index) => (terrains[index] = dirt))
  }

  return map
}

/** The shore and the band of lake along the edge of the zones that have a moat, leaving room around the trails. */
function digMoats(
  columns: number,
  rows: number,
  zones: Uint8Array,
  paved: Uint8Array,
  terrains: Uint8Array,
  grounds: Uint8Array,
  terrainIndex: Map<Terrain, number>
): void {
  // How many tiles from a tile to the closest one around it that passes, up to a reach.
  const closest = (column: number, row: number, reach: number, passes: (index: number) => boolean) => {
    let best = Infinity

    for (let dy = -reach; dy <= reach; dy++) {
      for (let dx = -reach; dx <= reach; dx++) {
        const x = column + dx
        const y = row + dy

        if (x >= 0 && y >= 0 && x < columns && y < rows && passes(y * columns + x)) {
          best = Math.min(best, Math.hypot(dx, dy))
        }
      }
    }

    return best
  }

  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      const index = row * columns + column
      const zone = zones[index]
      const definition = zone ? getZoneDefinition(ZONES_ORDER[zone - 1]) : undefined

      if (!definition?.moat || paved[index]) {
        continue
      }

      const { shore, width } = definition.moat
      const edge = closest(column, row, width + 2, (other) => zones[other] !== zone)

      if (edge < 2) {
        terrains[index] = terrainIndex.get(shore)!
      } else if (edge < width + 2 && closest(column, row, 1, (other) => paved[other] === 1) === Infinity) {
        terrains[index] = terrainIndex.get(definition.lake!)!
        // Where a cliff keeps the lake from lying, the shore goes on.
        grounds[index] = terrainIndex.get(shore)!
      }
    }
  }
}

/** The terrains of a biome in one of its zones (its index in ZONES_ORDER plus one; 0 leaves them as they are). */
function withZone(terrains: BiomeTerrains, zone: number): BiomeTerrains {
  if (!zone) {
    return terrains
  }

  const { ground, patches, trail, lake, lakes, patchy } = getZoneDefinition(ZONES_ORDER[zone - 1])

  return {
    ...terrains,
    ground: ground ?? terrains.ground,
    patches: patches ?? terrains.patches,
    trail: trail ?? terrains.trail,
    lake: lake ?? terrains.lake,
    lakes: lakes ?? terrains.lakes,
    patchy: patchy ?? terrains.patchy
  }
}

/** The Seal of each biome that changes on the way to it, and how far from it its farthest point lies. */
function sealsOf(world: World): Map<Biome, { x: number; y: number; reach: number }> {
  const seals = new Map<Biome, { x: number; y: number; reach: number }>()

  for (const seal of world.nodes) {
    if (seal.bossKind === BossKind.SEAL && BIOME_TERRAINS[seal.biome].seal) {
      const reach = Math.max(
        ...world.nodes
          .filter((node) => node.biome === seal.biome)
          .map((node) => Math.hypot(node.x - seal.x, node.y - seal.y))
      )

      seals.set(seal.biome, { x: seal.x, y: seal.y, reach: reach + CLEARING_RADIUS })
    }
  }

  return seals
}

/** The terrains of a biome at a share of the way to its Seal (0 at its edge, 1 at the Seal). */
function terrainsNear(terrains: BiomeTerrains, toSeal: number): BiomeTerrains {
  const { seal } = terrains

  if (!seal) {
    return terrains
  }

  const lakes = terrains.lakes ?? LAKE_THRESHOLD
  const rivers = (terrains.rivers ?? 0) + (seal.rivers - (terrains.rivers ?? 0)) * toSeal
  const past = toSeal >= seal.from

  return {
    ...terrains,
    ground: past ? seal.ground : terrains.ground,
    patches: past ? seal.patches : terrains.patches,
    lakes: lakes + (seal.lakes - lakes) * toSeal,
    rivers: rivers > 0 ? rivers : undefined
  }
}

/**
 * Levels of the tiles. Each point takes the level of the noise under it, then
 * trails even them out (east-west: the same level; north-south: one level
 * apart at most). The strip of a trail takes the level of its points (split
 * at the middle when they differ), the clearings the level of their point,
 * and the rest of the ground, from the noise, settles so that neighbors differ
 * by one level at most wherever it can.
 */
function buildHeights(world: World, columns: number, rows: number, rise: Float32Array): Uint8Array {
  const sorted = [...rise].sort((a, b) => a - b)
  const cuts = LEVEL_SHARES.map((share) => sorted[Math.floor(share * (sorted.length - 1))])
  const heights = new Uint8Array(rise.map((value) => cuts.filter((cut) => value > cut).length))
  const fixed = new Uint8Array(columns * rows)
  const indexOf = (x: number, y: number) =>
    Math.min(rows - 1, Math.max(0, Math.floor(y / TILE_SIZE))) * columns +
    Math.min(columns - 1, Math.max(0, Math.floor(x / TILE_SIZE)))
  const levels = new Map(world.nodes.map((node) => [node.id, heights[indexOf(node.x, node.y)]]))
  const nodes = new Map(world.nodes.map((node) => [node.id, node]))
  const flat = ([a, b]: [string, string]) =>
    Math.abs(nodes.get(b)!.y - nodes.get(a)!.y) < Math.abs(nodes.get(b)!.x - nodes.get(a)!.x)

  // Points only go down, so this ends.
  for (let changed = true; changed;) {
    changed = false

    for (const edge of world.edges) {
      const [a, b] = edge
      const [high, low] = levels.get(a)! >= levels.get(b)! ? [a, b] : [b, a]
      const most = levels.get(low)! + (flat(edge) ? 0 : 1)

      if (levels.get(high)! > most) {
        levels.set(high, most)
        changed = true
      }
    }
  }

  // Every tile within reach of a segment or a point, with its distance.
  const around = (
    left: number,
    top: number,
    right: number,
    bottom: number,
    visit: (index: number, x: number, y: number) => void
  ) => {
    for (
      let row = Math.max(0, Math.floor(top / TILE_SIZE));
      row <= Math.min(rows - 1, Math.floor(bottom / TILE_SIZE));
      row++
    ) {
      for (
        let column = Math.max(0, Math.floor(left / TILE_SIZE));
        column <= Math.min(columns - 1, Math.floor(right / TILE_SIZE));
        column++
      ) {
        visit(row * columns + column, (column + 0.5) * TILE_SIZE, (row + 0.5) * TILE_SIZE)
      }
    }
  }

  for (const [a, b] of world.edges) {
    const from = nodes.get(a)!
    const to = nodes.get(b)!
    const middle = (from.y + to.y) / 2
    // The northern point, and the level of each half.
    const [north, south] = from.y <= to.y ? [from, to] : [to, from]

    around(
      Math.min(from.x, to.x) - CORRIDOR,
      Math.min(from.y, to.y) - CORRIDOR,
      Math.max(from.x, to.x) + CORRIDOR,
      Math.max(from.y, to.y) + CORRIDOR,
      (index, x, y) => {
        if (distanceToSegment(x, y, from, to) < CORRIDOR) {
          heights[index] = levels.get((y < middle ? north : south).id)!
          fixed[index] = 1
        }
      }
    )
  }

  for (const node of world.nodes) {
    const reach = CLEARING_RADIUS + TILE_SIZE

    around(node.x - reach, node.y - reach, node.x + reach, node.y + reach, (index, x, y) => {
      if (Math.hypot(node.x - x, node.y - y) < reach) {
        heights[index] = levels.get(node.id)!
        fixed[index] = 1
      }
    })
  }

  // The rest settles between its neighbors.
  for (let pass = 0, changed = true; changed && pass < SETTLE_PASSES; pass++) {
    changed = false

    for (let row = 0; row < rows; row++) {
      for (let column = 0; column < columns; column++) {
        const index = row * columns + column

        if (fixed[index]) {
          continue
        }

        const neighbors = [
          column > 0 ? heights[index - 1] : heights[index],
          column < columns - 1 ? heights[index + 1] : heights[index],
          row > 0 ? heights[index - columns] : heights[index],
          row < rows - 1 ? heights[index + columns] : heights[index]
        ]
        const floor = Math.max(...neighbors) - 1
        const ceiling = Math.min(...neighbors) + 1
        const settled =
          floor <= ceiling ? Math.min(ceiling, Math.max(floor, heights[index])) : Math.round((floor + ceiling) / 2)

        if (settled !== heights[index]) {
          heights[index] = settled
          changed = true
        }
      }
    }
  }

  return heights
}

/** Whether a tile and the eight around it are at the same level. */
function isFlatAround(heights: Uint8Array, columns: number, rows: number, column: number, row: number): boolean {
  const level = heights[row * columns + column]

  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const x = Math.min(columns - 1, Math.max(0, column + dx))
      const y = Math.min(rows - 1, Math.max(0, row + dy))

      if (heights[y * columns + x] !== level) {
        return false
      }
    }
  }

  return true
}

/** Index of the tile under a position of the world (the closest one at the borders). */
function tileAt(map: TileMap, x: number, y: number): number {
  const column = Math.min(map.columns - 1, Math.max(0, Math.floor(x / map.tileSize)))
  const row = Math.min(map.rows - 1, Math.max(0, Math.floor(y / map.tileSize)))

  return row * map.columns + column
}

export function terrainAt(map: TileMap, x: number, y: number): Terrain {
  return TERRAINS[map.terrains[tileAt(map, x, y)]]
}

export function isPaved(map: TileMap, x: number, y: number): boolean {
  return map.paved[tileAt(map, x, y)] === 1
}

export function heightAt(map: TileMap, x: number, y: number): number {
  return map.heights[tileAt(map, x, y)]
}

/** Items kept in square buckets of the world, by the area they cover. */
class Buckets<T> {
  private readonly items = new Map<number, T[]>()
  private readonly columns: number

  constructor(width: number) {
    this.columns = Math.ceil(width / BUCKET) + 1
  }

  add(left: number, top: number, right: number, bottom: number, item: T): void {
    for (let row = Math.floor(top / BUCKET); row <= Math.floor(bottom / BUCKET); row++) {
      for (let column = Math.floor(left / BUCKET); column <= Math.floor(right / BUCKET); column++) {
        const key = row * this.columns + column

        this.items.set(key, [...(this.items.get(key) ?? []), item])
      }
    }
  }

  /** The items of the bucket of a position and of the ones `reach` buckets around it (an item can come more than once). */
  *around(x: number, y: number, reach: number): Generator<T> {
    const column = Math.floor(x / BUCKET)
    const row = Math.floor(y / BUCKET)

    for (let dy = -reach; dy <= reach; dy++) {
      for (let dx = -reach; dx <= reach; dx++) {
        if (column + dx >= 0 && column + dx < this.columns) {
          yield* this.items.get((row + dy) * this.columns + column + dx) ?? []
        }
      }
    }
  }
}

/** Distance from a position to the segment between two points of the map. */
export function distanceToSegment(x: number, y: number, a: WorldNode, b: WorldNode): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const length = dx * dx + dy * dy
  const t = length === 0 ? 0 : Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / length))

  return Math.hypot(a.x + t * dx - x, a.y + t * dy - y)
}
