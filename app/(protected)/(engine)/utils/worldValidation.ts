import { BIOME_LINKS, BIOMES } from '@/app/(protected)/(engine)/data/biomes'
import { WEAPONS } from '@/app/(protected)/(engine)/data/weapons'
import { Biome } from '@/app/(protected)/(engine)/models/Biome'
import { BossKind } from '@/app/(protected)/(engine)/models/BossKind'
import { NodeType } from '@/app/(protected)/(engine)/models/NodeType'
import { RuneTier } from '@/app/(protected)/(engine)/models/RuneTier'
import { World } from '@/app/(protected)/(engine)/models/World'
import { buildAdjacency, hopDistances } from '@/app/(protected)/(engine)/utils/graph'

/** Minimum number of points of the world. */
export const MIN_NODES = 1000

/** Camps of the world: the starting one plus one per camp boss. */
export const TOTAL_CAMPS = 30

/** No point is farther than this many trail steps from a camp (or from the boss that opens one). */
export const MAX_STEPS_TO_CAMP = 40

const TOTAL_SANCTUARIES = 60
const TOTAL_GUARDIANS = 12
const TOTAL_MERCHANTS = 5
const TOTAL_TEARS = 5
const TIER_ORDER = [RuneTier.LESSER, RuneTier.GREATER, RuneTier.ANCESTRAL, RuneTier.ABYSSAL]

/**
 * Checks the rules of the world design. Returns the broken ones (empty: the
 * world is valid). Used by the generator to discard attempts and by the tests
 * on the stored world.
 */
export function validateWorld(world: World): string[] {
  const errors: string[] = []

  const check = (condition: boolean, message: string) => {
    if (!condition) {
      errors.push(message)
    }
  }

  const byId = new Map(world.nodes.map((node) => [node.id, node]))
  const ids = world.nodes.map((node) => node.id)

  check(byId.size === world.nodes.length, 'node ids are not unique')
  check(world.nodes.length >= MIN_NODES, `only ${world.nodes.length} points`)

  // Trails.
  const seen = new Set<string>()

  for (const [a, b] of world.edges) {
    const key = [a, b].sort().join('|')

    check(byId.has(a) && byId.has(b), `trail ${a}–${b} to an unknown point`)
    check(a !== b, `trail from ${a} to itself`)
    check(!seen.has(key), `trail ${a}–${b} repeated`)
    seen.add(key)
  }

  if (errors.length > 0) {
    return errors
  }

  const adjacency = buildAdjacency(ids, world.edges)

  for (const node of world.nodes) {
    check(adjacency.get(node.id)!.length <= 4, `${node.id} has more than 4 trails`)
    check(adjacency.get(node.id)!.length >= 1, `${node.id} has no trails`)
  }

  const startTrails = adjacency.get(world.startNodeId)?.length ?? 0

  check(startTrails >= 3 && startTrails <= 4, `the starting camp has ${startTrails} trails`)
  check(hopDistances(adjacency, [world.startNodeId]).size === world.nodes.length, 'the world is not connected')

  // Biomes: each one is joined inside, and only linked biomes share trails.
  const links = new Map(BIOME_LINKS.map(([a, b]) => [[a, b].sort().join('|'), 0]))

  for (const [a, b] of world.edges) {
    const first = byId.get(a)!.biome
    const second = byId.get(b)!.biome

    if (first !== second) {
      const key = [first, second].sort().join('|')

      check(links.has(key), `trail between ${first} and ${second}, which are not linked`)
      links.set(key, (links.get(key) ?? 0) + 1)
    }
  }

  for (const [key, count] of links) {
    check(count >= 1 && count <= 2, `${count} border trails between ${key.replace('|', ' and ')}`)
  }

  check(links.get([Biome.ABYSS, Biome.WASTELANDS].sort().join('|')) === 1, 'the Abyss has more than one entrance')

  for (const definition of BIOMES) {
    const members = world.nodes.filter((node) => node.biome === definition.biome)
    const inside = hopDistances(adjacency, [members[0].id], (id) => byId.get(id)!.biome === definition.biome)

    check(members.length === definition.nodes, `${definition.biome} has ${members.length} points`)
    check(inside.size === members.length, `${definition.biome} is split`)
  }

  // The door of the Abyss and Crisol.
  const gate = byId.get(world.gateNodeId)
  const finalBoss = byId.get(world.finalBossNodeId)

  check(gate?.type === NodeType.ABYSS_GATE && gate.biome === Biome.ABYSS, 'the door of the Abyss is misplaced')
  check(finalBoss?.type === NodeType.FINAL_BOSS && finalBoss.biome === Biome.ABYSS, 'Crisol is misplaced')

  const beforeGate = hopDistances(adjacency, [world.startNodeId], (id) => id !== world.gateNodeId)

  check(
    world.nodes.every((node) => node.biome !== Biome.ABYSS || node.id === world.gateNodeId || !beforeGate.has(node.id)),
    'the Abyss can be entered without the door'
  )

  // Camps.
  const camps = world.nodes.filter((node) => node.type === NodeType.START || node.type === NodeType.CAMP_BOSS)
  const bosses = world.nodes.filter((node) => node.type === NodeType.CAMP_BOSS)
  const captors = bosses.filter((node) => node.bossKind === BossKind.CAPTOR)
  const seals = bosses.filter((node) => node.bossKind === BossKind.SEAL)

  check(camps.length === TOTAL_CAMPS, `${camps.length} camps`)
  check(world.nodes.filter((node) => node.type === NodeType.START).length === 1, 'not exactly one starting camp')
  check(new Set(captors.map((node) => node.captive)).size === 4 && captors.length === 4, 'not four captors')
  check(seals.length === 3, `${seals.length} Seals`)

  for (const definition of BIOMES) {
    const expected = definition.minibossCamps + (definition.captor ? 1 : 0) + (definition.sealId ? 1 : 0)
    const found = bosses.filter((node) => node.biome === definition.biome).length

    check(found === expected, `${definition.biome} has ${found} camp bosses instead of ${expected}`)
  }

  for (const node of [...captors, ...seals]) {
    check(beforeGate.has(node.id), `${node.bossId} can not be reached before the Abyss`)
  }

  const toCamp = hopDistances(
    adjacency,
    camps.map((node) => node.id)
  )
  const farthest = Math.max(...world.nodes.map((node) => toCamp.get(node.id) ?? Infinity))

  check(farthest <= MAX_STEPS_TO_CAMP, `a point is ${farthest} steps away from the closest camp`)

  // Sanctuaries and runes.
  const sanctuaries = world.nodes
    .filter((node) => node.type === NodeType.SANCTUARY)
    .sort((a, b) => a.runeIndex! - b.runeIndex!)

  check(sanctuaries.length === TOTAL_SANCTUARIES, `${sanctuaries.length} sanctuaries`)
  check(
    sanctuaries.every((node, position) => node.runeIndex === position + 1),
    'the runes are not numbered 1..60'
  )
  check(sanctuaries.filter((node) => node.guardian).length === TOTAL_GUARDIANS, 'not 12 sanctuary guardians')
  check(
    sanctuaries.every(
      (node, position) =>
        position === 0 || TIER_ORDER.indexOf(node.runeTier!) >= TIER_ORDER.indexOf(sanctuaries[position - 1].runeTier!)
    ),
    'a rune is weaker than the previous one'
  )

  for (const definition of BIOMES) {
    const found = sanctuaries.filter((node) => node.biome === definition.biome)

    check(found.length === definition.sanctuaries, `${definition.biome} has ${found.length} sanctuaries`)
    check(
      found.every((node) => node.runeTier === definition.runeTier),
      `a rune of ${definition.biome} has the wrong tier`
    )
  }

  // Dead ends: sanctuaries, Tears and chests are never on the way through.
  for (const node of world.nodes) {
    if ([NodeType.SANCTUARY, NodeType.TEAR, NodeType.CHEST, NodeType.RELIQUARY].includes(node.type)) {
      check(adjacency.get(node.id)!.length === 1, `${node.id} (${node.type}) is not in a dead end`)
    }
  }

  // Reliquaries: one per weapon to find, in its biome.
  const reliquaries = world.nodes.filter((node) => node.type === NodeType.RELIQUARY)

  for (const weapon of WEAPONS.filter((item) => item.biome)) {
    const found = reliquaries.filter((node) => node.weaponId === weapon.id)

    check(found.length === 1 && found[0].biome === weapon.biome, `the reliquary of ${weapon.id} is misplaced`)
  }

  check(reliquaries.length === WEAPONS.filter((item) => item.biome).length, `${reliquaries.length} reliquaries`)
  // Merchants and Tears.
  const merchants = world.nodes.filter((node) => node.type === NodeType.MERCHANT)

  check(new Set(merchants.map((node) => node.merchant)).size === TOTAL_MERCHANTS, 'not five different merchants')
  check(
    merchants.every((node) => beforeGate.has(node.id)),
    'a merchant can not be reached before the Abyss'
  )
  check(world.nodes.filter((node) => node.type === NodeType.TEAR).length === TOTAL_TEARS, 'not five Tears')

  // Levels.
  for (const node of world.nodes) {
    const definition = BIOMES.find((item) => item.biome === node.biome)!

    if (node.type === NodeType.COMBAT) {
      check(
        node.level !== undefined && node.level >= definition.levelMin && node.level <= definition.levelMax,
        `${node.id} has level ${node.level} outside ${definition.biome}`
      )
    }
  }

  return errors
}
