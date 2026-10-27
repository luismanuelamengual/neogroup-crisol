import Delaunator from 'delaunator'
import {
  BIOME_LINKS,
  BiomeDefinition,
  BIOMES,
  getBiomeDefinition,
  WORLD_HEIGHT,
  WORLD_WIDTH
} from '@/app/(protected)/(engine)/data/biomes'
import { WEAPONS } from '@/app/(protected)/(engine)/data/weapons'
import { START_NODE_ID, WORLD_SEED, WORLD_VERSION } from '@/app/(protected)/(engine)/data/world'
import { Biome } from '@/app/(protected)/(engine)/models/Biome'
import { BossKind } from '@/app/(protected)/(engine)/models/BossKind'
import { NodeType } from '@/app/(protected)/(engine)/models/NodeType'
import { RuneTier } from '@/app/(protected)/(engine)/models/RuneTier'
import { World } from '@/app/(protected)/(engine)/models/World'
import { WorldNode } from '@/app/(protected)/(engine)/models/WorldNode'
import { buildAdjacency, DisjointSet, hopDistances } from '@/app/(protected)/(engine)/utils/graph'
import { createNoise } from '@/app/(protected)/(engine)/utils/noise'
import { createRandom, Random, shuffle } from '@/app/(protected)/(engine)/utils/random'
import { validateWorld } from '@/app/(protected)/(engine)/utils/worldValidation'

/**
 * World generator. The world is generated once with a seed (yarn
 * world:generate), reviewed and stored as public/world/world.json: everybody
 * plays the same map.
 *
 *   1. Biome regions: a Voronoi diagram of the anchors of each biome, with its
 *      borders bent by noise so they look natural.
 *   2. Points: scattered inside each region keeping a minimum distance (Poisson
 *      disk), as many as the biome asks for.
 *   3. Trails: the Delaunay triangulation of the points gives the candidates; a
 *      random spanning tree of each biome (Kruskal) makes the maze (long
 *      corridors, branches and dead ends); a few border trails join the linked
 *      biomes; and some extra trails close loops (alternative routes).
 *   4. Points of interest: the starting camp, the bosses that open the camps,
 *      the rune sanctuaries, merchants, Tears of Oblivion and chests (in dead
 *      ends), the reliquaries of the weapons (in the deepest dead ends), the
 *      door of the Abyss and Crisol.
 *   5. Levels: from the entrance of each biome to its deepest point.
 *
 * An attempt that does not pass validateWorld is thrown away and the next seed
 * is tried, so the result is still deterministic.
 */

/** Maximum number of trails of a point (up, down, left, right, like Super Mario World). */
export const MAX_DEGREE = 4

/** Share of extra trails (over the spanning tree) that close loops. */
const LOOP_SHARE = 0.12
/** Points keep this far from the edges of the world. */
const MARGIN = 300
/** Cell of the grid used to measure the area of the regions. */
const AREA_CELL = 100
/** Attempts before giving up (each one with the next seed). */
const MAX_ATTEMPTS = 200
/** Where the starting camp is looked for. */
const START_POSITION: [number, number] = [8000, 8600]
/** Mini boss guardians of the sanctuaries, by number of sanctuaries of the biome (the rest: elite fights). */
const GUARDIAN_SHARE = 0.2
/** Extra levels of the special fights over the point where they are. */
const KEY_BOSS_EXTRA_LEVELS = 2
const MINIBOSS_EXTRA_LEVELS = 2
const GUARDIAN_EXTRA_LEVELS = 3
const ELITE_EXTRA_LEVELS = 2
/** The wardens of the reliquaries: over the deepest level of their biome. */
const WARDEN_EXTRA_LEVELS = 4
const TIER_ORDER = [RuneTier.LESSER, RuneTier.GREATER, RuneTier.ANCESTRAL, RuneTier.ABYSSAL]

interface Point {
  index: number
  x: number
  y: number
  biome: Biome
}

interface Candidate {
  a: number
  b: number
  length: number
}

/** Generates the world. Throws if no attempt passes the validation. */
export function generateWorld(seed = WORLD_SEED): World {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const world = generateAttempt(seed + attempt)

    if (world && validateWorld(world).length === 0) {
      return world
    }
  }

  throw new Error(`No valid world after ${MAX_ATTEMPTS} attempts from seed ${seed}`)
}

/** One try with one seed; null when the trails could not be built (a biome split in two, a missing border...). */
export function generateAttempt(seed: number): World | null {
  const random = createRandom(seed)
  const biomeAt = createBiomeField(random)
  const points = scatterPoints(random, biomeAt)
  const candidates = triangulate(points)
  const edges = buildTrails(random, points, candidates)

  if (!edges) {
    return null
  }

  return placeContent(random, seed, points, edges)
}

/** 1. Which biome each position of the world belongs to. */
function createBiomeField(random: Random): (x: number, y: number) => Biome {
  const warpX = createNoise(random)
  const warpY = createNoise(random)
  const anchors = BIOMES.flatMap((definition) =>
    definition.anchors.map(([x, y]) => ({ x, y, biome: definition.biome }))
  )

  return (x, y) => {
    // Bend the space before measuring: the borders wave instead of being straight lines.
    const wx = x + (warpX(x / 2600, y / 2600) - 0.5) * 2200
    const wy = y + (warpY(x / 2600, y / 2600) - 0.5) * 2200
    let best = anchors[0]
    let bestDistance = Infinity

    for (const anchor of anchors) {
      const distance = (anchor.x - wx) ** 2 + (anchor.y - wy) ** 2

      if (distance < bestDistance) {
        best = anchor
        bestDistance = distance
      }
    }

    return best.biome
  }
}

/** 2. The points of every biome, spread evenly inside its region. */
function scatterPoints(random: Random, biomeAt: (x: number, y: number) => Biome): Point[] {
  const cells = new Map<Biome, [number, number][]>(BIOMES.map((definition) => [definition.biome, []]))

  for (let y = MARGIN; y < WORLD_HEIGHT - MARGIN; y += AREA_CELL) {
    for (let x = MARGIN; x < WORLD_WIDTH - MARGIN; x += AREA_CELL) {
      cells.get(biomeAt(x + AREA_CELL / 2, y + AREA_CELL / 2))!.push([x, y])
    }
  }

  const points: Point[] = []
  const grid = new SpatialGrid(200)

  for (const definition of BIOMES) {
    const biomeCells = cells.get(definition.biome)!
    const area = biomeCells.length * AREA_CELL * AREA_CELL
    let spacing = Math.sqrt(area / definition.nodes) * 0.85
    let placed = 0
    let failures = 0

    while (placed < definition.nodes) {
      const [cellX, cellY] = biomeCells[Math.floor(random() * biomeCells.length)]
      const x = cellX + random() * AREA_CELL
      const y = cellY + random() * AREA_CELL

      if (biomeAt(x, y) === definition.biome && !grid.hasNeighbor(x, y, spacing)) {
        const point: Point = { index: points.length, x: Math.round(x), y: Math.round(y), biome: definition.biome }

        points.push(point)
        grid.add(point)
        placed++
        failures = 0
      } else if (++failures > 400) {
        // The region is full at this spacing: tighten it a little.
        spacing *= 0.95
        failures = 0
      }
    }
  }

  return points
}

/** Buckets of points to find close ones quickly. */
class SpatialGrid {
  private cells = new Map<string, Point[]>()

  constructor(private size: number) {}

  private key(cx: number, cy: number): string {
    return `${cx}:${cy}`
  }

  add(point: Point): void {
    const key = this.key(Math.floor(point.x / this.size), Math.floor(point.y / this.size))

    this.cells.set(key, [...(this.cells.get(key) ?? []), point])
  }

  hasNeighbor(x: number, y: number, distance: number): boolean {
    const reach = Math.ceil(distance / this.size)
    const cx = Math.floor(x / this.size)
    const cy = Math.floor(y / this.size)

    for (let dy = -reach; dy <= reach; dy++) {
      for (let dx = -reach; dx <= reach; dx++) {
        for (const point of this.cells.get(this.key(cx + dx, cy + dy)) ?? []) {
          if ((point.x - x) ** 2 + (point.y - y) ** 2 < distance ** 2) {
            return true
          }
        }
      }
    }

    return false
  }
}

/** 3a. Candidate trails: the edges of the Delaunay triangulation (they never cross each other). */
function triangulate(points: Point[]): Candidate[] {
  const delaunay = Delaunator.from(points.map((point) => [point.x, point.y]))
  const candidates: Candidate[] = []

  for (let edge = 0; edge < delaunay.triangles.length; edge++) {
    const opposite = delaunay.halfedges[edge]

    // Every inner edge appears twice (once per triangle): keep one.
    if (edge > opposite) {
      const a = delaunay.triangles[edge]
      const b = delaunay.triangles[edge % 3 === 2 ? edge - 2 : edge + 1]
      const length = Math.hypot(points[a].x - points[b].x, points[a].y - points[b].y)

      candidates.push({ a, b, length })
    }
  }

  return candidates
}

function linkKey(a: Biome, b: Biome): string {
  return [a, b].sort().join('|')
}

/** 3b. The trails: a maze inside every biome, a single border trail per linked pair of biomes, and some loops. */
function buildTrails(random: Random, points: Point[], candidates: Candidate[]): [number, number][] | null {
  const degree = new Array<number>(points.length).fill(0)
  const edges: [number, number][] = []
  const used = new Set<string>()

  const add = (candidate: Candidate) => {
    edges.push([candidate.a, candidate.b])
    used.add(`${candidate.a}:${candidate.b}`)
    degree[candidate.a]++
    degree[candidate.b]++
  }

  const isUsed = (candidate: Candidate) => used.has(`${candidate.a}:${candidate.b}`)
  const fits = (candidate: Candidate) => degree[candidate.a] < MAX_DEGREE && degree[candidate.b] < MAX_DEGREE
  // Very long edges (along the hull of the triangulation) are never trails.
  const typicalLength = median(candidates.map((candidate) => candidate.length))
  const usable = candidates.filter((candidate) => candidate.length < typicalLength * 2.2)
  const inner = usable.filter((candidate) => points[candidate.a].biome === points[candidate.b].biome)
  const border = usable.filter((candidate) => points[candidate.a].biome !== points[candidate.b].biome)
  // The maze: a random spanning tree of every biome, preferring short trails.
  const sets = new DisjointSet()
  const weighted = inner
    .map((candidate) => ({ candidate, weight: candidate.length * (0.4 + random() * 1.2) }))
    .sort((first, second) => first.weight - second.weight)

  for (const { candidate } of weighted) {
    if (fits(candidate) && sets.union(String(candidate.a), String(candidate.b))) {
      add(candidate)
    }
  }

  for (const definition of BIOMES) {
    const members = points.filter((point) => point.biome === definition.biome)
    const root = sets.find(String(members[0].index))

    if (members.some((point) => sets.find(String(point.index)) !== root)) {
      return null
    }
  }

  // One border trail per linked pair of biomes, between points with free trails (a pass, a bridge).
  for (const [first, second] of BIOME_LINKS) {
    const options = border
      .filter((candidate) => linkKey(points[candidate.a].biome, points[candidate.b].biome) === linkKey(first, second))
      .filter((candidate) => degree[candidate.a] <= 2 && degree[candidate.b] <= 2)

    if (options.length === 0) {
      return null
    }

    add(options[Math.floor(random() * options.length)])
  }

  // Loops: some extra trails inside the biomes (they never touch the Abyss before the door).
  const loops = Math.round(points.length * LOOP_SHARE)
  let added = 0

  for (const candidate of shuffle(random, inner)) {
    if (added >= loops) {
      break
    }

    if (!isUsed(candidate) && fits(candidate)) {
      add(candidate)
      added++
    }
  }

  return edges
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)

  return sorted[Math.floor(sorted.length / 2)]
}

/** 4 and 5. Ids, the starting camp, the points of interest and the levels. */
function placeContent(random: Random, seed: number, points: Point[], trailIndexes: [number, number][]): World | null {
  // Stable ids, from north-west to south-east.
  const order = [...points].sort((a, b) => a.y - b.y || a.x - b.x)
  const ids = new Map<number, string>(order.map((point, position) => [point.index, `n${position + 1}`]))
  const startPoint = findStart(points, trailIndexes)

  if (!startPoint) {
    return null
  }

  ids.set(startPoint.index, START_NODE_ID)

  const nodes: WorldNode[] = order.map((point) => ({
    id: ids.get(point.index)!,
    x: point.x,
    y: point.y,
    biome: point.biome,
    type: NodeType.COMBAT
  }))
  const byId = new Map(nodes.map((node) => [node.id, node]))
  const edges: [string, string][] = trailIndexes.map(([a, b]) => [ids.get(a)!, ids.get(b)!])
  const adjacency = buildAdjacency(
    nodes.map((node) => node.id),
    edges
  )
  const start = byId.get(START_NODE_ID)!

  start.type = NodeType.START

  // The door of the Abyss is the Abyss end of its only border trail; Crisol waits at the farthest point from it.
  const gateEdge = edges.find(([a, b]) => {
    const biomes = [byId.get(a)!.biome, byId.get(b)!.biome]

    return biomes.includes(Biome.ABYSS) && biomes.includes(Biome.WASTELANDS)
  })!
  const gate = byId.get(byId.get(gateEdge[0])!.biome === Biome.ABYSS ? gateEdge[0] : gateEdge[1])!
  const fromGate = hopDistances(adjacency, [gate.id], (id) => byId.get(id)!.biome === Biome.ABYSS)
  const finalBoss = maxBy(
    nodes.filter((node) => node.biome === Biome.ABYSS && node.id !== gate.id),
    (node) => fromGate.get(node.id) ?? -1
  )

  gate.type = NodeType.ABYSS_GATE
  finalBoss.type = NodeType.FINAL_BOSS

  const fromStart = hopDistances(adjacency, [START_NODE_ID])
  const isFree = (node: WorldNode) => node.type === NodeType.COMBAT
  const isBorder = (node: WorldNode) => adjacency.get(node.id)!.some((id) => byId.get(id)!.biome !== node.biome)
  const isLeaf = (node: WorldNode) => adjacency.get(node.id)!.length === 1
  const biomeNodes = (definition: BiomeDefinition) => nodes.filter((node) => node.biome === definition.biome)

  // Captors and Seals: in the deepest part of their biome.
  for (const definition of BIOMES) {
    const options = biomeNodes(definition).filter((node) => isFree(node) && !isBorder(node) && !isLeaf(node))

    if (definition.captor) {
      const node = maxBy(options, (candidate) => fromStart.get(candidate.id)!)

      Object.assign(node, {
        type: NodeType.CAMP_BOSS,
        bossKind: BossKind.CAPTOR,
        bossId: definition.captor.bossId,
        captive: definition.captor.captive
      })
    }

    if (definition.sealId) {
      const node = maxBy(options, (candidate) => fromStart.get(candidate.id)!)

      Object.assign(node, { type: NodeType.CAMP_BOSS, bossKind: BossKind.SEAL, bossId: definition.sealId })
    }
  }

  // Mini boss camps: each one as far as possible from the camps placed before (even coverage).
  const camps = () => nodes.filter((node) => node.type === NodeType.START || node.type === NodeType.CAMP_BOSS)

  for (const definition of BIOMES) {
    for (let index = 1; index <= definition.minibossCamps; index++) {
      const fromCamps = hopDistances(
        adjacency,
        camps().map((node) => node.id)
      )
      const options = biomeNodes(definition).filter((node) => isFree(node) && !isBorder(node) && !isLeaf(node))
      const node = maxBy(options, (candidate) => fromCamps.get(candidate.id) ?? 0)

      Object.assign(node, {
        type: NodeType.CAMP_BOSS,
        bossKind: BossKind.MINIBOSS,
        bossId: `${definition.biome}-miniboss-${index}`
      })
    }
  }

  // Sanctuaries, Tears and chests: in dead ends, never on the way through.
  for (const definition of BIOMES) {
    const deadEnds = () => biomeNodes(definition).filter((node) => isFree(node) && isLeaf(node))
    const sanctuaries: WorldNode[] = []

    for (let index = 0; index < definition.sanctuaries; index++) {
      const spread = hopDistances(
        adjacency,
        [...sanctuaries, ...camps()].map((node) => node.id)
      )
      const options = deadEnds()

      if (options.length === 0) {
        return null
      }

      const node = maxBy(options, (candidate) => spread.get(candidate.id) ?? 0)

      node.type = NodeType.SANCTUARY
      node.runeTier = definition.runeTier
      sanctuaries.push(node)
    }

    // The deepest sanctuaries are guarded by a mini boss.
    const guardians = Math.round(definition.sanctuaries * GUARDIAN_SHARE)

    sanctuaries
      .sort((a, b) => fromStart.get(b.id)! - fromStart.get(a.id)!)
      .forEach((node, position) => {
        node.guardian = position < guardians
      })

    if (definition.tear) {
      const options = deadEnds()

      if (options.length === 0) {
        return null
      }

      maxBy(options, (candidate) => fromStart.get(candidate.id)!).type = NodeType.TEAR
    }

    for (const node of shuffle(random, deadEnds()).slice(0, definition.chests)) {
      node.type = NodeType.CHEST
    }

    if (definition.merchant) {
      const fromCamps = hopDistances(
        adjacency,
        camps().map((node) => node.id)
      )
      const options = biomeNodes(definition).filter((node) => {
        const distance = fromCamps.get(node.id) ?? 0

        return isFree(node) && !isBorder(node) && distance >= 2 && distance <= 5
      })

      if (options.length === 0) {
        return null
      }

      Object.assign(options[Math.floor(random() * options.length)], {
        type: NodeType.MERCHANT,
        merchant: definition.merchant
      })
    }
  }

  // Runes 1..60, from the weakest to the strongest.
  nodes
    .filter((node) => node.type === NodeType.SANCTUARY)
    .sort(
      (a, b) =>
        TIER_ORDER.indexOf(a.runeTier!) - TIER_ORDER.indexOf(b.runeTier!) || fromStart.get(a.id)! - fromStart.get(b.id)!
    )
    .forEach((node, position) => {
      node.runeIndex = position + 1
    })

  // Reliquaries: one per weapon to find, in the deepest dead ends of its biome and apart from each other.
  const reliquaries: WorldNode[] = []

  for (const weapon of WEAPONS.filter((item) => item.biome)) {
    const spread = hopDistances(
      adjacency,
      [...reliquaries, ...camps()].map((node) => node.id)
    )
    const options = nodes.filter((node) => node.biome === weapon.biome && isFree(node) && isLeaf(node))

    if (options.length === 0) {
      return null
    }

    const node = maxBy(options, (candidate) => fromStart.get(candidate.id)! + (spread.get(candidate.id) ?? 0))

    Object.assign(node, { type: NodeType.RELIQUARY, weaponId: weapon.id })
    reliquaries.push(node)
  }

  assignLevels(nodes, fromStart)

  return {
    version: WORLD_VERSION,
    seed,
    width: WORLD_WIDTH,
    height: WORLD_HEIGHT,
    nodes,
    edges,
    startNodeId: START_NODE_ID,
    gateNodeId: gate.id,
    finalBossNodeId: finalBoss.id
  }
}

/** The starting camp: a meadow point near the south-center with 3 or 4 trails. */
function findStart(points: Point[], trails: [number, number][]): Point | null {
  const degree = new Array<number>(points.length).fill(0)

  for (const [a, b] of trails) {
    degree[a]++
    degree[b]++
  }

  const options = points
    .filter((point) => point.biome === Biome.MEADOWS && degree[point.index] >= 3)
    .sort(
      (a, b) =>
        Math.hypot(a.x - START_POSITION[0], a.y - START_POSITION[1]) -
        Math.hypot(b.x - START_POSITION[0], b.y - START_POSITION[1])
    )

  return options[0] ?? null
}

/** 5. Level of every fight: it grows from the entrance of the biome to its deepest point. */
function assignLevels(nodes: WorldNode[], fromStart: Map<string, number>): void {
  for (const definition of BIOMES) {
    const members = nodes.filter((node) => node.biome === definition.biome)
    const distances = members.map((node) => fromStart.get(node.id)!)
    const nearest = Math.min(...distances)
    const farthest = Math.max(...distances)

    for (const node of members) {
      const depth = farthest > nearest ? (fromStart.get(node.id)! - nearest) / (farthest - nearest) : 0
      const level = Math.round(definition.levelMin + (definition.levelMax - definition.levelMin) * depth)

      switch (node.type) {
        case NodeType.COMBAT:
          node.level = level
          break
        case NodeType.CAMP_BOSS:
          node.level =
            node.bossKind === BossKind.MINIBOSS
              ? Math.min(level + MINIBOSS_EXTRA_LEVELS, definition.levelMax + MINIBOSS_EXTRA_LEVELS)
              : definition.levelMax + KEY_BOSS_EXTRA_LEVELS
          break
        case NodeType.SANCTUARY:
          node.level = level + (node.guardian ? GUARDIAN_EXTRA_LEVELS : ELITE_EXTRA_LEVELS)
          break
        case NodeType.TEAR:
          node.level = level + ELITE_EXTRA_LEVELS
          break
        case NodeType.RELIQUARY:
          node.level = definition.levelMax + WARDEN_EXTRA_LEVELS
          break
        case NodeType.FINAL_BOSS:
          node.level = getBiomeDefinition(Biome.ABYSS).levelMax
          break
        default:
          // Safe points (start, merchants, chests, the door) have no fight of their own.
          break
      }
    }
  }
}

function maxBy<T>(items: T[], score: (item: T) => number): T {
  let best = items[0]
  let bestScore = -Infinity

  for (const item of items) {
    const value = score(item)

    if (value > bestScore) {
      best = item
      bestScore = value
    }
  }

  return best
}
