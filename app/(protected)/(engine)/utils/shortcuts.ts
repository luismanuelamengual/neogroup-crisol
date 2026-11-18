import { Biome } from '@/app/(protected)/(engine)/models/Biome'
import { GameState } from '@/app/(protected)/(engine)/models/GameState'
import { NodeType } from '@/app/(protected)/(engine)/models/NodeType'
import { Shortcut } from '@/app/(protected)/(engine)/models/Shortcut'
import { World } from '@/app/(protected)/(engine)/models/World'
import { WorldNode } from '@/app/(protected)/(engine)/models/WorldNode'
import { buildAdjacency, hopDistances } from '@/app/(protected)/(engine)/utils/graph'

/**
 * The shortcuts of the world: new trails between two points of the same biome
 * that lie close on the map but far apart by trail, one of them near a camp.
 * They are found over the finished world (no point moves and no trail
 * changes), so the generator adds them last. Each one stays shut until the
 * party reaches its deep end; from then on, for the rest of the cycle, it is
 * a trail like any other and the way back to the camp is much shorter.
 */

/** Longest a shortcut can be, in world pixels (the longest trails of the maze are about this long). */
const MAX_LENGTH = 650
/** How far it keeps from every other point, so that it never runs over one. */
const CLEARANCE = 110
/** Trail steps between its ends, at least: a shortcut that saves little is not one. */
const MIN_HOPS = 8
/** Steps to the nearest camp it saves from its deep end, at least. */
const MIN_GAIN = 4
/** Most shortcuts per biome. */
const MAX_PER_BIOME = 4
/** Most trails of a point, shortcuts included (as the generator, see MAX_DEGREE). */
const MAX_TRAILS = 4
/** The first biomes stay a plain maze, and the Abyss keeps its single door. */
const NO_SHORTCUTS = new Set([Biome.MEADOWS, Biome.FOREST, Biome.ABYSS])
/** Points that never hold one end of a shortcut. */
const NO_ENDS = new Set([NodeType.START, NodeType.MERCHANT, NodeType.ABYSS_GATE, NodeType.FINAL_BOSS])

type Point = Pick<WorldNode, 'x' | 'y'>

function orientation(a: Point, b: Point, c: Point): number {
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)
}

/** Whether two segments cross (sharing an end is not crossing). */
function crosses(a: Point, b: Point, c: Point, d: Point): boolean {
  return orientation(a, b, c) * orientation(a, b, d) < 0 && orientation(c, d, a) * orientation(c, d, b) < 0
}

function distanceToSegment(point: Point, a: Point, b: Point): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const t = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / (dx * dx + dy * dy)))

  return Math.hypot(point.x - (a.x + t * dx), point.y - (a.y + t * dy))
}

/** Trail steps from one point to another, up to a limit (Infinity when farther). */
function hopsWithin(adjacency: Map<string, string[]>, from: string, to: string, limit: number): number {
  let frontier = [from]
  const seen = new Set(frontier)

  for (let hops = 1; hops <= limit; hops++) {
    const next: string[] = []

    for (const id of frontier) {
      for (const other of adjacency.get(id) ?? []) {
        if (other === to) {
          return hops
        }

        if (!seen.has(other)) {
          seen.add(other)
          next.push(other)
        }
      }
    }

    frontier = next
  }

  return Infinity
}

/** Finds the shortcuts of a finished world (deterministic: the same world always gives the same ones). */
export function findShortcuts(world: World): Shortcut[] {
  const adjacency = buildAdjacency(
    world.nodes.map((node) => node.id),
    world.edges
  )
  const byId = new Map(world.nodes.map((node) => [node.id, node]))
  const camps = world.nodes
    .filter((node) => node.type === NodeType.CAMP_BOSS || node.type === NodeType.START)
    .map((node) => node.id)
  const toCamp = hopDistances(adjacency, camps)
  // A grid of cells as big as the longest shortcut: the ends of one are in neighbouring cells.
  const cellOf = (node: Point) => `${Math.floor(node.x / MAX_LENGTH)},${Math.floor(node.y / MAX_LENGTH)}`
  const grid = new Map<string, WorldNode[]>()

  for (const node of world.nodes) {
    grid.set(cellOf(node), [...(grid.get(cellOf(node)) ?? []), node])
  }

  const near = (node: Point) => {
    const column = Math.floor(node.x / MAX_LENGTH)
    const row = Math.floor(node.y / MAX_LENGTH)

    return [-1, 0, 1].flatMap((dy) => [-1, 0, 1].flatMap((dx) => grid.get(`${column + dx},${row + dy}`) ?? []))
  }

  const candidates: { from: WorldNode; to: WorldNode; gain: number }[] = []

  for (const a of world.nodes) {
    for (const b of near(a)) {
      if (
        a.id >= b.id ||
        a.biome !== b.biome ||
        NO_SHORTCUTS.has(a.biome) ||
        NO_ENDS.has(a.type) ||
        NO_ENDS.has(b.type) ||
        adjacency.get(a.id)!.length >= MAX_TRAILS ||
        adjacency.get(b.id)!.length >= MAX_TRAILS ||
        adjacency.get(a.id)!.includes(b.id) ||
        Math.hypot(a.x - b.x, a.y - b.y) > MAX_LENGTH
      ) {
        continue
      }

      const [from, to] = toCamp.get(a.id)! <= toCamp.get(b.id)! ? [a, b] : [b, a]
      const gain = toCamp.get(to.id)! - (toCamp.get(from.id)! + 1)

      if (
        gain < MIN_GAIN ||
        near(a).some((other) => other !== a && other !== b && distanceToSegment(other, a, b) < CLEARANCE) ||
        world.edges.some(
          ([c, d]) => c !== a.id && c !== b.id && d !== a.id && d !== b.id && crosses(a, b, byId.get(c)!, byId.get(d)!)
        ) ||
        hopsWithin(adjacency, a.id, b.id, MIN_HOPS - 1) < MIN_HOPS
      ) {
        continue
      }

      candidates.push({ from, to, gain })
    }
  }

  // The ones that save the most first; each point holds one end at most and they never cross each other.
  candidates.sort((x, y) => y.gain - x.gain || x.from.id.localeCompare(y.from.id) || x.to.id.localeCompare(y.to.id))

  const chosen: Shortcut[] = []
  const used = new Set<string>()
  const perBiome = new Map<Biome, number>()

  for (const { from, to } of candidates) {
    const crossesChosen = chosen.some(
      (other) =>
        crosses(from, to, byId.get(other.from)!, byId.get(other.to)!) ||
        [other.from, other.to].some((id) => distanceToSegment(byId.get(id)!, from, to) < CLEARANCE)
    )

    if (used.has(from.id) || used.has(to.id) || (perBiome.get(from.biome) ?? 0) >= MAX_PER_BIOME || crossesChosen) {
      continue
    }

    chosen.push({ from: from.id, to: to.id })
    used.add(from.id)
    used.add(to.id)
    perBiome.set(from.biome, (perBiome.get(from.biome) ?? 0) + 1)
  }

  return chosen
}

/** Whether a shortcut is open: the party reached its deep end in this cycle. */
export function isShortcutOpen(state: Pick<GameState, 'clearedNodeIds'>, shortcut: Shortcut): boolean {
  return state.clearedNodeIds.includes(shortcut.to)
}

/** The shortcuts the party opened in this cycle. */
export function getOpenShortcuts(world: World, state: Pick<GameState, 'clearedNodeIds'>): Shortcut[] {
  return (world.shortcuts ?? []).filter((shortcut) => isShortcutOpen(state, shortcut))
}

/** Every trail of the world, the shortcuts included, open or shut (for the ground, which carves them all). */
export function getAllTrails(world: World): [string, string][] {
  return [...world.edges, ...(world.shortcuts ?? []).map((shortcut): [string, string] => [shortcut.from, shortcut.to])]
}
