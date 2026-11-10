import Delaunator from 'delaunator'
import {
  ADDED_TRAILS,
  BIOME_LINKS,
  BIOME_PASSES,
  BiomeDefinition,
  BIOMES,
  BiomeSide,
  getBiomeDefinition,
  REMOVED_TRAILS,
  TrailEnds,
  WORLD_HEIGHT,
  WORLD_WIDTH
} from '@/app/(protected)/(engine)/data/biomes'
import { GUARDIAN_SPECIES } from '@/app/(protected)/(engine)/data/enemies'
import { AMBER_EMBER_PLACES, AMBER_FLASK_PLACES } from '@/app/(protected)/(engine)/data/flask'
import { WEAPONS } from '@/app/(protected)/(engine)/data/weapons'
import { ABYSS_GATE_GUARDIAN, START_NODE_ID, WORLD_SEED, WORLD_VERSION } from '@/app/(protected)/(engine)/data/world'
import { Biome } from '@/app/(protected)/(engine)/models/Biome'
import { BossKind } from '@/app/(protected)/(engine)/models/BossKind'
import { NodeType } from '@/app/(protected)/(engine)/models/NodeType'
import { RuneTier } from '@/app/(protected)/(engine)/models/RuneTier'
import { World } from '@/app/(protected)/(engine)/models/World'
import { WorldNode } from '@/app/(protected)/(engine)/models/WorldNode'
import { Adjacency, buildAdjacency, DisjointSet, hopDistances } from '@/app/(protected)/(engine)/utils/graph'
import { createNoise } from '@/app/(protected)/(engine)/utils/noise'
import { createRandom, Random, shuffle } from '@/app/(protected)/(engine)/utils/random'
import {
  isJunction,
  KEY_BOSS_CAMP_MAX_STEPS,
  KEY_BOSS_CAMP_STEPS,
  MIN_CAMP_TRAILS,
  MIN_STEPS_BETWEEN_CAMPS,
  validateWorld
} from '@/app/(protected)/(engine)/utils/worldValidation'

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
 *   4. Points of interest: the starting camp, the bosses that open the camps
 *      (mini bosses always on crossroads; one near the entrance and one near
 *      the center of each biome),
 *      the rune sanctuaries, Tears of Oblivion and chests (in dead ends), the
 *      merchants (in a dead end right off a camp), the reliquaries of the weapons (in the
 *      deepest dead ends), the door of the Abyss (guarded by a boss) and Crisol.
 *      The empty dead ends left open up into new trails, and the few that can
 *      not get a guarded chest: no dead end stays without a prize.
 *      The captors and the Seals wait at the deepest point of their biome.
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
/** A camp this close to the center of its biome (in world units) counts as its central camp. */
const CENTER_RADIUS = 800
/** Extra levels of the special fights over the point where they are. */
const KEY_BOSS_EXTRA_LEVELS = 2
const MINIBOSS_EXTRA_LEVELS = 2
const GUARDIAN_EXTRA_LEVELS = 3
const ELITE_EXTRA_LEVELS = 2
/** The wardens of the reliquaries: over the deepest level of their biome. */
const WARDEN_EXTRA_LEVELS = 4
/**
 * The fights that keep a treasure (the rune of a sanctuary, the weapon of a
 * reliquary) are elite and this much stronger still: in the Abyss they can be
 * over the Crisol itself.
 */
const TREASURE_EXTRA_LEVELS = 6
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

  return placeContent(random, seed, points, edges, candidates)
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

/**
 * The order the biomes take their points in: the one the map was drawn with
 * (the Mountains before the Tropics, unlike BIOMES). Another order gives every
 * biome other points, and the whole map changes.
 */
const SCATTER_ORDER = [
  Biome.MEADOWS,
  Biome.FOREST,
  Biome.DESERT,
  Biome.MOUNTAINS,
  Biome.TROPICAL,
  Biome.WASTELANDS,
  Biome.SNOW,
  Biome.VOLCANIC,
  Biome.ABYSS
]

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

  for (const definition of SCATTER_ORDER.map(getBiomeDefinition)) {
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

    const pick = random()

    // The door of the Abyss: the border trail closest to the middle of its southern edge.
    if (first === Biome.ABYSS || second === Biome.ABYSS) {
      const [centerX] = getBiomeDefinition(Biome.ABYSS).anchors[0]
      const abyssEnd = (candidate: Candidate) =>
        points[candidate.a].biome === Biome.ABYSS ? points[candidate.a] : points[candidate.b]

      add(minBy(options, (candidate) => Math.abs(abyssEnd(candidate).x - centerX) - abyssEnd(candidate).y))
      continue
    }

    const pass = BIOME_PASSES.find(({ link }) => linkKey(link[0], link[1]) === linkKey(first, second))

    if (pass?.between) {
      // A trail set by hand: the border candidate whose ends are the closest to the two places.
      const [first, second] = pass.between
      const fitting = border.filter(
        (candidate) =>
          linkKey(points[candidate.a].biome, points[candidate.b].biome) === linkKey(...pass.link) && fits(candidate)
      )
      const ends = (candidate: Candidate) =>
        Math.min(
          distanceTo(first, points[candidate.a], points[candidate.a]) +
            distanceTo(second, points[candidate.b], points[candidate.b]),
          distanceTo(second, points[candidate.a], points[candidate.a]) +
            distanceTo(first, points[candidate.b], points[candidate.b])
        )

      add(minBy(fitting, ends))
      continue
    }

    if (pass) {
      const { side, at } = pass

      add(
        at
          ? minBy(options, (candidate) => distanceTo(at, points[candidate.a], points[candidate.b]))
          : maxBy(options, (candidate) => towards(side!, points[candidate.a], points[candidate.b]))
      )
      continue
    }

    add(options[Math.floor(pick * options.length)])
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

  // The trails set by hand (only in the world they were drawn on: with another seed there are no points at their ends).
  const removed = REMOVED_TRAILS.map((ends) => trailKey(points, ends))
  const kept = edges.filter(([a, b]) => !removed.includes(`${Math.min(a, b)}:${Math.max(a, b)}`))

  for (const ends of ADDED_TRAILS) {
    const [a, b] = ends.map((place) => pointAt(points, place))

    if (
      a !== null &&
      b !== null &&
      !kept.some(([first, second]) => (first === a && second === b) || (first === b && second === a))
    ) {
      kept.push([a, b])
    }
  }

  return kept
}

/** The point exactly at a place, or null when there is none. */
function pointAt(points: Point[], [x, y]: [number, number]): number | null {
  return points.find((point) => point.x === x && point.y === y)?.index ?? null
}

/** Key of a trail by its two ends, whichever the order (null when one of them is not a point of this world). */
function trailKey(points: Point[], ends: TrailEnds): string | null {
  const [a, b] = ends.map((place) => pointAt(points, place))

  return a === null || b === null ? null : `${Math.min(a, b)}:${Math.max(a, b)}`
}

/** How far a trail lies towards a side of the world. */
function towards(side: BiomeSide, a: Point, b: Point): number {
  const x = (a.x + b.x) / 2
  const y = (a.y + b.y) / 2

  return side === 'north' ? -y : side === 'south' ? y : -x
}

/** How far the middle of a trail is from a place. */
function distanceTo([x, y]: [number, number], a: Point, b: Point): number {
  return Math.hypot((a.x + b.x) / 2 - x, (a.y + b.y) / 2 - y)
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)

  return sorted[Math.floor(sorted.length / 2)]
}

/** 4 and 5. Ids, the starting camp, the points of interest and the levels. */
function placeContent(
  random: Random,
  seed: number,
  points: Point[],
  trailIndexes: [number, number][],
  candidates: Candidate[]
): World | null {
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
  gate.bossId = ABYSS_GATE_GUARDIAN
  finalBoss.type = NodeType.FINAL_BOSS

  const fromStart = hopDistances(adjacency, [START_NODE_ID])
  const isFree = (node: WorldNode) => node.type === NodeType.COMBAT
  const isBorder = (node: WorldNode) => adjacency.get(node.id)!.some((id) => byId.get(id)!.biome !== node.biome)
  const isLeaf = (node: WorldNode) => adjacency.get(node.id)!.length === 1
  // Mini boss camps are always crossroads (at least three trails that are not dead ends); captors and Seals can wait at
  // the end of a dead end.
  const canBeCamp = (node: WorldNode) => isFree(node) && !isBorder(node) && isJunction(node.id, adjacency)
  const canBeKeyBoss = (node: WorldNode) => isFree(node) && !isBorder(node)
  const biomeNodes = (definition: BiomeDefinition) => nodes.filter((node) => node.biome === definition.biome)

  // Captors and Seals: in the deepest part of their biome (or the place set for them), where a camp fits about
  // KEY_BOSS_CAMP_STEPS away.
  const roomForNearCamp = (boss: WorldNode) => {
    const fromBoss = hopDistances(adjacency, [boss.id])

    return nodes.some((node) => {
      const steps = fromBoss.get(node.id)!

      return (
        node !== boss &&
        node.biome === boss.biome &&
        canBeCamp(node) &&
        steps >= KEY_BOSS_CAMP_STEPS &&
        steps <= KEY_BOSS_CAMP_MAX_STEPS
      )
    })
  }

  for (const definition of BIOMES) {
    const fromCamps = hopDistances(
      adjacency,
      nodes.filter((node) => node.type === NodeType.START || node.type === NodeType.CAMP_BOSS).map((node) => node.id)
    )
    const candidates = biomeNodes(definition).filter(
      (node) => canBeKeyBoss(node) && (fromCamps.get(node.id) ?? Infinity) >= MIN_STEPS_BETWEEN_CAMPS
    )
    const withRoom = definition.captor || definition.sealId ? candidates.filter(roomForNearCamp) : []
    const options = withRoom.length > 0 ? withRoom : candidates

    if (options.length === 0) {
      return null
    }

    if (definition.captor) {
      const { captorAt } = definition
      const node = captorAt
        ? minBy(options, (candidate) => Math.hypot(candidate.x - captorAt[0], candidate.y - captorAt[1]))
        : maxBy(options, (candidate) => fromStart.get(candidate.id)!)

      Object.assign(node, {
        type: NodeType.CAMP_BOSS,
        bossKind: BossKind.CAPTOR,
        bossId: definition.captor.bossId,
        captive: definition.captor.captive
      })
    }

    if (definition.sealId) {
      const { sealAt } = definition
      const node = sealAt
        ? minBy(options, (candidate) => Math.hypot(candidate.x - sealAt[0], candidate.y - sealAt[1]))
        : maxBy(options.filter(canBeKeyBoss), (candidate) => fromStart.get(candidate.id)!)

      Object.assign(node, { type: NodeType.CAMP_BOSS, bossKind: BossKind.SEAL, bossId: definition.sealId })
    }
  }

  // Mini boss camps, never closer than MIN_STEPS_BETWEEN_CAMPS to another camp: the first one about
  // KEY_BOSS_CAMP_STEPS away from the captor or the Seal of the biome (on its side of the way in), then one near the
  // entrance of the biome and one near its center (not in the biome of the starting camp), and the rest each one as far
  // as possible from the camps placed before (even coverage).
  const isCamp = (node: WorldNode) => node.type === NodeType.START || node.type === NodeType.CAMP_BOSS
  const camps = () => nodes.filter(isCamp)

  for (const definition of BIOMES) {
    const members = biomeNodes(definition)
    const centerX = members.reduce((sum, node) => sum + node.x, 0) / members.length
    const centerY = members.reduce((sum, node) => sum + node.y, 0) / members.length
    const goals: ((options: WorldNode[]) => WorldNode)[] = []
    const toCenter = (node: WorldNode) => Math.hypot(node.x - centerX, node.y - centerY)
    const keyBoss = members.find((node) => node.bossKind === BossKind.CAPTOR || node.bossKind === BossKind.SEAL)

    if (keyBoss) {
      const fromKeyBoss = hopDistances(adjacency, [keyBoss.id])

      goals.push((options) =>
        maxBy(
          options,
          (candidate) =>
            -Math.abs(fromKeyBoss.get(candidate.id)! - KEY_BOSS_CAMP_STEPS) * 1000 - fromStart.get(candidate.id)!
        )
      )
    }

    // The starting camp is already at the entrance and near the center of its biome; a captor or a Seal can already
    // be near the center too.
    if (definition.biome !== start.biome) {
      goals.push((options) => maxBy(options, (candidate) => -fromStart.get(candidate.id)!))

      if (!members.some((node) => isCamp(node) && toCenter(node) <= CENTER_RADIUS)) {
        goals.push((options) => maxBy(options, (candidate) => -toCenter(candidate)))
      }
    }

    // The camps of a biome with their places set go there instead.
    if (definition.campsAt) {
      goals.splice(
        0,
        goals.length,
        ...definition.campsAt.map(
          ([x, y]) =>
            (options: WorldNode[]) =>
              minBy(options, (candidate) => Math.hypot(candidate.x - x, candidate.y - y))
        )
      )
    }

    // A biome where the camps do not fit keeping their distance tries again without its last goals (the near
    // camp of the captor or the Seal is always kept).
    const placeAll = (biomeGoals: typeof goals): boolean => {
      const placed: WorldNode[] = []

      for (let index = 1; index <= definition.minibossCamps; index++) {
        const fromCamps = hopDistances(
          adjacency,
          camps().map((camp) => camp.id)
        )
        // A camp set by hand on a point of this world can also wait on a corridor: the dead ends that open up later make
        // it a crossroads (the validation checks it).
        const fits = (node: WorldNode) =>
          canBeCamp(node) ||
          (definition.campsAt?.some(([x, y]) => node.x === x && node.y === y) === true &&
            isFree(node) &&
            !isBorder(node) &&
            adjacency.get(node.id)!.filter((other) => !isLeaf(byId.get(other)!)).length >= 2)
        let options = members.filter(
          (node) => fits(node) && (fromCamps.get(node.id) ?? Infinity) >= MIN_STEPS_BETWEEN_CAMPS
        )
        // In a biome with a merchant, the camps leave room for it (a free dead end beside) until one does.
        const hasRoom = (camp: WorldNode) => deadEndsBeside(camp, nodes, adjacency).length > 0
        const roomy = options.filter(hasRoom)

        if (
          definition.merchant &&
          !(keyBoss && index === 1) &&
          roomy.length > 0 &&
          !members.some((node) => node.type === NodeType.CAMP_BOSS && hasRoom(node))
        ) {
          options = roomy
        }

        if (options.length === 0) {
          for (const node of placed) {
            node.type = NodeType.COMBAT
            delete node.bossKind
            delete node.bossId
          }

          return false
        }

        const goal = biomeGoals[index - 1]
        const node = goal ? goal(options) : maxBy(options, (candidate) => fromCamps.get(candidate.id) ?? 0)

        Object.assign(node, {
          type: NodeType.CAMP_BOSS,
          bossKind: BossKind.MINIBOSS,
          bossId: `${definition.biome}-miniboss-${index}`
        })
        placed.push(node)
      }

      return true
    }

    let fitted = false

    for (let kept = goals.length; kept >= (keyBoss ? 1 : 0) && !fitted; kept--) {
      fitted = placeAll(goals.slice(0, kept))
    }

    if (!fitted) {
      return null
    }
  }

  // Merchants: in a dead end right off a camp, so once the camp is open they are reached without a fight. They are
  // placed before the sanctuaries and chests so those do not take the dead ends.
  const merchantCamps = chooseMerchantCamps(nodes, adjacency, fromStart, start.biome)

  if (!merchantCamps) {
    return null
  }

  for (const definition of BIOMES) {
    if (definition.merchant) {
      const { merchantAt } = definition
      const setByHand = merchantAt
        ? nodes.find(
            (node) =>
              node.x === merchantAt[0] &&
              node.y === merchantAt[1] &&
              isFree(node) &&
              isLeaf(node) &&
              isCamp(byId.get(adjacency.get(node.id)![0])!)
          )
        : undefined

      Object.assign(setByHand ?? deadEndsBeside(merchantCamps.get(definition.biome)!, nodes, adjacency)[0], {
        type: NodeType.MERCHANT,
        merchant: definition.merchant
      })
    }
  }

  // The Amber Flasks and Embers, at their points (with another seed, at the free dead end closest to each place).
  for (const [type, places] of [
    [NodeType.AMBER_FLASK, AMBER_FLASK_PLACES],
    [NodeType.AMBER_EMBER, AMBER_EMBER_PLACES]
  ] as const) {
    for (const [x, y] of places) {
      const exact = nodes.find((node) => isFree(node) && node.x === x && node.y === y)
      const options = nodes.filter((node) => isFree(node) && isLeaf(node) && node.biome !== Biome.ABYSS)

      if (!exact && options.length === 0) {
        return null
      }

      ;(exact ?? minBy(options, (node) => Math.hypot(node.x - x, node.y - y))).type = type
    }
  }

  // Sanctuaries, Tears and chests: in dead ends, never on the way through. Each biome draws its chests with its own
  // random numbers, so a change in one biome does not move the chests of the others.
  for (const [biomeIndex, definition] of BIOMES.entries()) {
    const deadEnds = () => biomeNodes(definition).filter((node) => isFree(node) && isLeaf(node))
    const sanctuaries: WorldNode[] = []
    // The chests set by hand first, so the sanctuaries leave their dead ends free.
    const chestsAt = definition.chestsAt ?? []

    for (const [x, y] of chestsAt) {
      // On a point of this world it goes right there, even on the way through; otherwise, to the closest dead end.
      const exact = biomeNodes(definition).find((node) => isFree(node) && node.x === x && node.y === y)
      const options = deadEnds()

      if (!exact && options.length === 0) {
        return null
      }

      ;(exact ?? minBy(options, (candidate) => Math.hypot(candidate.x - x, candidate.y - y))).type = NodeType.CHEST
    }

    for (let index = 0; index < definition.sanctuaries; index++) {
      const spread = hopDistances(
        adjacency,
        [...sanctuaries, ...camps()].map((node) => node.id)
      )
      const options = deadEnds()

      if (options.length === 0) {
        return null
      }

      // A sanctuary set by hand on a point of this world goes right there, even on the way through.
      const place = definition.sanctuariesAt?.[index]
      const exact =
        place && biomeNodes(definition).find((item) => isFree(item) && item.x === place[0] && item.y === place[1])
      const node =
        exact ||
        (place
          ? minBy(options, (candidate) => Math.hypot(candidate.x - place[0], candidate.y - place[1]))
          : maxBy(options, (candidate) => spread.get(candidate.id) ?? 0))

      node.type = NodeType.SANCTUARY
      // A rune brought from another biome keeps its tier, on its own point.
      node.runeTier = (exact && place?.[2]) || definition.runeTier
      sanctuaries.push(node)
    }

    // The deepest sanctuaries are guarded by the mini bosses of the biome (the rest: elite fights), the strongest one
    // in the deepest sanctuary.
    const guardians = GUARDIAN_SPECIES[definition.biome]

    sanctuaries
      .sort((a, b) => fromStart.get(b.id)! - fromStart.get(a.id)!)
      .forEach((node, position) => {
        node.guardian = position < guardians.length

        if (node.guardian) {
          node.guardianId = guardians[guardians.length - 1 - position]
        }
      })

    if (definition.tear) {
      const options = deadEnds()

      if (options.length === 0) {
        return null
      }

      const { tearAt } = definition

      ;(tearAt
        ? minBy(options, (candidate) => Math.hypot(candidate.x - tearAt[0], candidate.y - tearAt[1]))
        : maxBy(options, (candidate) => fromStart.get(candidate.id)!)
      ).type = NodeType.TEAR
    }

    const chestRandom = createRandom(seed + 1000 * (biomeIndex + 1))

    for (const node of shuffle(chestRandom, deadEnds()).slice(0, definition.chests - chestsAt.length)) {
      node.type = NodeType.CHEST
    }
  }

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

    const definition = getBiomeDefinition(weapon.biome!)
    // A reliquary set by hand on a point of this world goes right there, even on the way through.
    const place = definition.reliquariesAt?.[reliquaries.filter((item) => item.biome === weapon.biome).length]
    const exact =
      place &&
      nodes.find((item) => item.biome === weapon.biome && isFree(item) && item.x === place[0] && item.y === place[1])
    const node =
      exact ||
      (place
        ? minBy(options, (candidate) => Math.hypot(candidate.x - place[0], candidate.y - place[1]))
        : maxBy(options, (candidate) => fromStart.get(candidate.id)! + (spread.get(candidate.id) ?? 0)))

    Object.assign(node, { type: NodeType.RELIQUARY, weaponId: weapon.id })
    reliquaries.push(node)
  }

  // The dead ends left without a prize open up into new trails, so few remain beyond the ones with something to find.
  const typicalLength = median(candidates.map((candidate) => candidate.length))
  const removedTrails = REMOVED_TRAILS.map((ends) => trailKey(points, ends))
  const shortcuts = candidates
    .filter(
      (candidate) => candidate.length < typicalLength * 2.2 && points[candidate.a].biome === points[candidate.b].biome
    )
    .filter(
      (candidate) =>
        !removedTrails.includes(`${Math.min(candidate.a, candidate.b)}:${Math.max(candidate.a, candidate.b)}`)
    )
    .map(({ a, b }): [string, string] => [ids.get(a)!, ids.get(b)!])

  closeDeadEnds(nodes, edges, adjacency, shortcuts)

  // Any dead end that could not open ends in a prize too: a chest with the enemies of the point around it, so going
  // there pays and the fights (and the experience) of the world stay the same.
  for (const node of nodes.filter((item) => isFree(item) && isLeaf(item))) {
    Object.assign(node, { type: NodeType.CHEST, guarded: true })
  }

  assignLevels(nodes, fromStart)

  // Runes 1..RUNE_COUNT, from the weakest to the strongest: by tier and, within it, by the level of its sanctuary (so a
  // stronger rune is never easier to win), then by how far it is from the start.
  nodes
    .filter((node) => node.type === NodeType.SANCTUARY)
    .sort(
      (a, b) =>
        TIER_ORDER.indexOf(a.runeTier!) - TIER_ORDER.indexOf(b.runeTier!) ||
        a.level! - b.level! ||
        fromStart.get(a.id)! - fromStart.get(b.id)!
    )
    .forEach((node, position) => {
      node.runeIndex = position + 1
    })

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

/**
 * Turns the empty dead ends into ways through with a new trail. The new trail
 * goes, among the candidates, to another empty dead end if it can (one trail
 * opens both) and otherwise to the point that closes the widest loop. It never
 * touches a dead end with a prize, and never brings two camps too close.
 */
function closeDeadEnds(
  nodes: WorldNode[],
  edges: [string, string][],
  adjacency: Adjacency,
  shortcuts: [string, string][]
): void {
  const byId = new Map(nodes.map((node) => [node.id, node]))
  const campIds = nodes
    .filter((node) => node.type === NodeType.START || node.type === NodeType.CAMP_BOSS)
    .map((node) => node.id)
  const trails = (id: string) => adjacency.get(id)!
  const isEmptyDeadEnd = (id: string) => byId.get(id)!.type === NodeType.COMBAT && trails(id).length === 1
  const canReceive = (id: string) =>
    trails(id).length < MAX_DEGREE && (trails(id).length > 1 || byId.get(id)!.type === NodeType.COMBAT)

  for (const node of nodes) {
    if (!isEmptyDeadEnd(node.id)) {
      continue
    }

    const fromNode = hopDistances(adjacency, [node.id])
    const options = shortcuts
      .filter(([a, b]) => a === node.id || b === node.id)
      .map(([a, b]) => (a === node.id ? b : a))
      .filter((id) => canReceive(id) && !trails(node.id).includes(id))
      .filter((id) => {
        const fromOther = hopDistances(adjacency, [id])

        return campIds.every((first) =>
          campIds.every(
            (second) => first === second || fromNode.get(first)! + 1 + fromOther.get(second)! >= MIN_STEPS_BETWEEN_CAMPS
          )
        )
      })

    if (options.length > 0) {
      const other = maxBy(options, (id) => fromNode.get(id)! + (isEmptyDeadEnd(id) ? 1000 : 0))

      edges.push([node.id, other])
      trails(node.id).push(other)
      trails(other).push(node.id)
    }
  }
}

/** The starting camp: a meadow point near the south-center that is a crossroads (see isJunction). */
function findStart(points: Point[], trails: [number, number][]): Point | null {
  const degree = new Array<number>(points.length).fill(0)
  const neighbors = points.map(() => [] as number[])

  for (const [a, b] of trails) {
    degree[a]++
    degree[b]++
    neighbors[a].push(b)
    neighbors[b].push(a)
  }

  const junction = (index: number) => neighbors[index].filter((other) => degree[other] > 1).length >= MIN_CAMP_TRAILS
  const options = points
    .filter((point) => point.biome === Biome.MEADOWS && junction(point.index))
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
        case NodeType.CHEST:
          if (node.guarded) {
            node.level = level
          }

          break
        case NodeType.CAMP_BOSS:
          node.level =
            node.bossKind === BossKind.MINIBOSS
              ? Math.min(level + MINIBOSS_EXTRA_LEVELS, definition.levelMax + MINIBOSS_EXTRA_LEVELS)
              : definition.levelMax + KEY_BOSS_EXTRA_LEVELS
          break
        case NodeType.SANCTUARY:
          node.level = level + (node.guardian ? GUARDIAN_EXTRA_LEVELS : ELITE_EXTRA_LEVELS) + TREASURE_EXTRA_LEVELS
          break
        case NodeType.TEAR:
        case NodeType.AMBER_FLASK:
        case NodeType.AMBER_EMBER:
          node.level = level + ELITE_EXTRA_LEVELS
          break
        case NodeType.RELIQUARY:
          node.level = definition.levelMax + WARDEN_EXTRA_LEVELS + TREASURE_EXTRA_LEVELS
          break
        case NodeType.ABYSS_GATE:
          // Very strong, but under the weakest Seal.
          node.level =
            Math.min(...BIOMES.filter((item) => item.sealId).map((item) => item.levelMax)) + KEY_BOSS_EXTRA_LEVELS - 1
          break
        case NodeType.FINAL_BOSS:
          node.level = getBiomeDefinition(Biome.ABYSS).levelMax
          break
        default:
          // Safe points (start, merchants, chests) have no fight of their own.
          break
      }
    }
  }
}

/**
 * The camp next to which each merchant waits, among the camps with a free dead
 * end hanging off them. In the biome of the starting camp, the boss camp closest
 * to it (the first one the party can open); in the other
 * biomes, the camps that keep the merchants as far apart from each other as
 * possible (the combination with the largest minimum distance between them).
 */
function chooseMerchantCamps(
  nodes: WorldNode[],
  adjacency: Adjacency,
  fromStart: Map<string, number>,
  startBiome: Biome
): Map<Biome, WorldNode> | null {
  const hasRoom = (camp: WorldNode) => deadEndsBeside(camp, nodes, adjacency).length > 0
  const choices = BIOMES.filter((definition) => definition.merchant).map((definition) => {
    const camps = nodes.filter(
      (node) =>
        node.biome === definition.biome &&
        (node.type === NodeType.CAMP_BOSS || (node.type === NodeType.START && definition.biome !== startBiome)) &&
        hasRoom(node)
    )

    if (definition.biome !== startBiome) {
      return camps
    }

    return [...camps].sort((a, b) => fromStart.get(a.id)! - fromStart.get(b.id)!).slice(0, 1)
  })

  if (choices.some((camps) => camps.length === 0)) {
    return null
  }

  let best: WorldNode[] = []
  let bestScore = -Infinity

  const search = (picked: WorldNode[], score: number) => {
    if (score <= bestScore) {
      return
    }

    if (picked.length === choices.length) {
      best = picked
      bestScore = score

      return
    }

    for (const camp of choices[picked.length]) {
      const closest = Math.min(score, ...picked.map((other) => Math.hypot(camp.x - other.x, camp.y - other.y)))

      search([...picked, camp], closest)
    }
  }

  search([], Infinity)

  return new Map(best.map((camp) => [camp.biome, camp]))
}

/** Free dead ends of the same biome hanging right off a camp (their only trail goes to it). */
function deadEndsBeside(camp: WorldNode, nodes: WorldNode[], adjacency: Adjacency): WorldNode[] {
  return adjacency
    .get(camp.id)!
    .map((id) => nodes.find((node) => node.id === id)!)
    .filter(
      (node) => node.type === NodeType.COMBAT && node.biome === camp.biome && adjacency.get(node.id)!.length === 1
    )
    .sort((a, b) => a.id.localeCompare(b.id, 'en', { numeric: true }))
}

function minBy<T>(items: T[], score: (item: T) => number): T {
  return maxBy(items, (item) => -score(item))
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
