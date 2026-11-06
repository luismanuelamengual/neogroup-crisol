import { LAKES, TERRAINS } from '@/app/(protected)/(engine)/data/terrains'
import { VILLAGES } from '@/app/(protected)/(engine)/data/zones'
import { TileMap } from '@/app/(protected)/(engine)/models/TileMap'
import { Village, VillagePiece, VillagePieceKind } from '@/app/(protected)/(engine)/models/VillagePiece'
import { World } from '@/app/(protected)/(engine)/models/World'
import { WorldNode } from '@/app/(protected)/(engine)/models/WorldNode'
import { createRandom, shuffle } from '@/app/(protected)/(engine)/utils/random'

/**
 * The villages around the merchants (see VILLAGES in data/zones.ts), the same
 * for the same world: a well near the merchant, cottages around it with dirt
 * paths from their doors to the trails, fences beside them, and on the
 * outskirts a windmill, fields of wheat, hay bales, a cart and a sign at the
 * entrance. Everything stands on firm ground (all its foot on one level, off
 * trails, lakes and the faces of cliffs), and nothing hides a trail or a point.
 */

/**
 * Size of each kind of piece on the map (world pixels): half the width of its
 * foot (what must rest on firm ground), half the width of its drawing and its
 * height (what must not hide trails or points).
 */
export const VILLAGE_PIECE_SIZES: Record<VillagePieceKind, { foot: number; half: number; height: number }> = {
  [VillagePieceKind.HOUSE]: { foot: 58, half: 70, height: 136 },
  [VillagePieceKind.WELL]: { foot: 36, half: 44, height: 96 },
  [VillagePieceKind.FENCE]: { foot: 34, half: 36, height: 52 },
  [VillagePieceKind.MILL]: { foot: 50, half: 90, height: 190 },
  [VillagePieceKind.WHEAT]: { foot: 44, half: 46, height: 62 },
  [VillagePieceKind.HAY]: { foot: 28, half: 32, height: 46 },
  [VillagePieceKind.CART]: { foot: 34, half: 42, height: 58 },
  [VillagePieceKind.SIGN]: { foot: 18, half: 34, height: 66 }
}

/** Room under the rim of a plateau where nothing stands (the face of the cliff, as in placeScenery). */
const CLIFF_FACE = 56
/** Room kept between a piece and the trails, and around the points (their marker and the hero). */
const TRAIL_ROOM = 16
const NODE_ROOM = 70
/** Least distance between the bases of two cottages, and between any two pieces (the fields may touch each other). */
const HOUSE_GAP = 165
const PIECE_GAP = 74
/** Ring step of the spots tried, and the room between them on a ring. */
const RING_STEP = 40
const SPOT_GAP = 50
/** How far the yard of a cottage reaches behind and in front of its base. */
const YARD_BEHIND = 50
const YARD_FRONT = 40
/** Longest path from a door to the trails. */
const PATH_LENGTH = 460

export function placeVillages(world: World, map: TileMap): Village[] {
  const villages: Village[] = []

  for (const node of world.nodes) {
    const definition = node.merchant ? VILLAGES[node.biome] : undefined

    if (definition) {
      villages.push(placeVillage(world, map, node, definition.radius, definition.houses))
    }
  }

  return villages
}

function placeVillage(world: World, map: TileMap, center: WorldNode, radius: number, houses: number): Village {
  const random = createRandom(world.seed ^ 0x5111 ^ hashId(center.id))
  const { columns, rows, tileSize, terrains, heights, paved } = map
  const lakes = TERRAINS.map((terrain) => LAKES.has(terrain))
  const biome = map.biomes[indexAt(map, center.x, center.y)]
  const near = world.nodes.filter((node) => Math.hypot(node.x - center.x, node.y - center.y) < radius + 400)
  const pieces: VillagePiece[] = []

  const free = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= columns * tileSize || y >= rows * tileSize) {
      return false
    }

    return !paved[indexAt(map, x, y)]
  }

  // Whether a piece of this kind fits there: its foot on firm ground, its drawing over no trail or point, room around.
  const fits = (kind: VillagePieceKind, x: number, y: number, gap = PIECE_GAP) => {
    const { foot, half, height } = VILLAGE_PIECE_SIZES[kind]

    if (x - half < 0 || x + half >= columns * tileSize || y - height < 0 || y + 20 >= rows * tileSize) {
      return false
    }

    const level = heights[indexAt(map, x, y)]

    for (const dx of [-foot, -foot / 2, 0, foot / 2, foot]) {
      for (const dy of [-14, 0, 8]) {
        const index = indexAt(map, x + dx, y + dy)

        if (
          heights[index] !== level ||
          lakes[terrains[index]] ||
          map.biomes[index] !== biome ||
          heights[indexAt(map, x + dx, y + dy - CLIFF_FACE)] > level
        ) {
          return false
        }
      }
    }

    // Nothing paved under the drawing (it would hide the trail) nor right around its foot.
    for (let dy = -height; dy <= TRAIL_ROOM; dy += 24) {
      for (let dx = -half - TRAIL_ROOM; dx <= half + TRAIL_ROOM; dx += 24) {
        if (!free(x + dx, y + dy)) {
          return false
        }
      }
    }

    if (
      near.some(
        (node) => Math.abs(node.x - x) < half + NODE_ROOM && node.y > y - height - NODE_ROOM && node.y < y + NODE_ROOM
      )
    ) {
      return false
    }

    return pieces.every((other) => {
      const otherSize = VILLAGE_PIECE_SIZES[other.kind]
      const both = kind === VillagePieceKind.HOUSE && other.kind === VillagePieceKind.HOUSE
      const room = both ? HOUSE_GAP : Math.max(gap, (otherSize.foot + foot) * 0.9)

      // The bases spread over the width more than over the depth.
      return Math.hypot((other.x - x) * 0.8, (other.y - y) * 1.4) >= room
    })
  }

  const place = (kind: VillagePieceKind, x: number, y: number): VillagePiece => {
    const piece = { kind, x, y, pick: random(), flip: random() < 0.5 }

    pieces.push(piece)

    return piece
  }

  // Spots on rings around the merchant, closest first, each ring turned at random.
  const spots = (from: number, to: number): [number, number][] => {
    const result: [number, number][] = []

    for (let distance = from; distance <= to; distance += RING_STEP) {
      const count = Math.max(6, Math.floor((Math.PI * 2 * distance) / SPOT_GAP))
      const turn = random() * Math.PI * 2

      for (let index = 0; index < count; index++) {
        const angle = turn + (index / count) * Math.PI * 2
        const wobble = (random() - 0.5) * RING_STEP

        // The ring a little flattened: the ground is seen from above and to the front.
        result.push([
          center.x + Math.cos(angle) * (distance + wobble),
          center.y + Math.sin(angle) * (distance + wobble) * 0.8
        ])
      }
    }

    return result
  }

  const placeFirst = (kind: VillagePieceKind, candidates: [number, number][], most: number, gap?: number) => {
    const placed: VillagePiece[] = []

    for (const [x, y] of candidates) {
      if (placed.length >= most) {
        break
      }

      if (fits(kind, x, y, gap)) {
        placed.push(place(kind, x, y))
      }
    }

    return placed
  }

  placeFirst(VillagePieceKind.WELL, spots(150, 340), 1)

  const cottages = placeFirst(VillagePieceKind.HOUSE, spots(190, radius * 0.92), houses)

  // A fence beside some cottages, on one side or the other.
  for (const house of cottages) {
    if (random() < 0.7) {
      const side = random() < 0.5 ? -1 : 1
      const reach = VILLAGE_PIECE_SIZES[VillagePieceKind.HOUSE].half + 40

      placeFirst(
        VillagePieceKind.FENCE,
        [
          [house.x + side * reach, house.y + 14],
          [house.x - side * reach, house.y + 14],
          [house.x + side * reach, house.y - 30]
        ],
        1,
        60
      )
    }
  }

  // The outskirts: a windmill, fields (side by side when they can), hay bales and a cart.
  const outskirts = spots(radius * 0.55, radius * 1.05)

  placeFirst(VillagePieceKind.MILL, outskirts, 1, 150)

  for (const field of placeFirst(VillagePieceKind.WHEAT, shuffle(random, outskirts), 2, 120)) {
    const step = VILLAGE_PIECE_SIZES[VillagePieceKind.WHEAT].half * 2 + 6

    placeFirst(
      VillagePieceKind.WHEAT,
      [
        [field.x + step, field.y],
        [field.x - step, field.y],
        [field.x, field.y + 70]
      ],
      1,
      80
    )
  }

  placeFirst(VillagePieceKind.HAY, shuffle(random, spots(220, radius)), 4, 90)
  placeFirst(VillagePieceKind.CART, shuffle(random, spots(260, radius)), 1, 90)

  // A sign beside the trail into the village, a little before it reaches the merchant.
  const entrance = entranceOf(world, center)

  if (entrance) {
    const [ax, ay] = entrance
    const signs: [number, number][] = []

    for (const distance of [230, 280, 330, 190, 380]) {
      for (const side of [1, -1]) {
        for (const off of [110, 140, 90]) {
          signs.push([center.x + ax * distance - ay * off * side, center.y + ay * distance + ax * off * side])
        }
      }
    }

    placeFirst(VillagePieceKind.SIGN, signs, 1, 60)
  }

  return { nodeId: center.id, pieces, paths: pathsOf(map, center, cottages, pieces) }
}

/** The direction (unit vector) of the trail leaving the merchant toward the camp beside it. */
function entranceOf(world: World, center: WorldNode): [number, number] | null {
  const edge = world.edges.find(([a, b]) => a === center.id || b === center.id)
  const other = edge && world.nodes.find((node) => node.id === (edge[0] === center.id ? edge[1] : edge[0]))

  if (!other) {
    return null
  }

  const length = Math.hypot(other.x - center.x, other.y - center.y) || 1

  return [(other.x - center.x) / length, (other.y - center.y) / length]
}

/**
 * The dirt path from the door of each cottage to the closest trail, straight
 * toward the merchant (left out where it would cross a lake, a change of
 * level or another piece, or run too long), and the yard under each cottage.
 */
function pathsOf(map: TileMap, center: WorldNode, cottages: VillagePiece[], pieces: VillagePiece[]): number[] {
  const lakes = TERRAINS.map((terrain) => LAKES.has(terrain))
  const tiles = new Set<number>()

  for (const house of cottages) {
    const level = map.heights[indexAt(map, house.x, house.y)]
    const startX = house.x
    const startY = house.y + 20
    const length = Math.hypot(center.x - startX, center.y - startY)
    const path = new Set<number>()
    let reached = false

    for (let step = 0; step <= Math.min(length, PATH_LENGTH); step += 16) {
      const x = startX + ((center.x - startX) * step) / length
      const y = startY + ((center.y - startY) * step) / length
      const index = indexAt(map, x, y)

      if (map.paved[index]) {
        reached = true
        break
      }

      const blocked = pieces.some(
        (piece) =>
          piece !== house &&
          Math.abs(piece.x - x) < VILLAGE_PIECE_SIZES[piece.kind].foot + 20 &&
          Math.abs(piece.y - y) < 36
      )

      if (map.heights[index] !== level || lakes[map.terrains[index]] || blocked) {
        break
      }

      path.add(index)
    }

    if (reached) {
      path.forEach((index) => tiles.add(index))
    }

    // A yard of trodden earth under the cottage and in front of its door, so that it sits on the ground.
    const { half } = VILLAGE_PIECE_SIZES[VillagePieceKind.HOUSE]

    for (let y = house.y - YARD_BEHIND; y <= house.y + YARD_FRONT; y += map.tileSize / 2) {
      for (let x = house.x - half * 0.8; x <= house.x + half * 0.8; x += map.tileSize / 2) {
        const index = indexAt(map, x, y)

        if (map.heights[index] === level && !map.paved[index] && !lakes[map.terrains[index]]) {
          tiles.add(index)
        }
      }
    }
  }

  return [...tiles].sort((a, b) => a - b)
}

function indexAt({ columns, rows, tileSize }: TileMap, x: number, y: number): number {
  return (
    Math.min(rows - 1, Math.max(0, Math.floor(y / tileSize))) * columns +
    Math.min(columns - 1, Math.max(0, Math.floor(x / tileSize)))
  )
}

function hashId(id: string): number {
  let hash = 0

  for (const char of id) {
    hash = Math.imul(hash ^ char.charCodeAt(0), 0x01000193)
  }

  return hash >>> 0
}
