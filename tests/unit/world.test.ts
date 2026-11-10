import { describe, expect, it } from 'vitest'
import { BIOMES } from '@/app/(protected)/(engine)/data/biomes'
import { WORLD_SEED } from '@/app/(protected)/(engine)/data/world'
import { Biome } from '@/app/(protected)/(engine)/models/Biome'
import { BossKind } from '@/app/(protected)/(engine)/models/BossKind'
import { CharacterId } from '@/app/(protected)/(engine)/models/CharacterId'
import { NodeType } from '@/app/(protected)/(engine)/models/NodeType'
import type { World } from '@/app/(protected)/(engine)/models/World'
import { buildAdjacency, DisjointSet, hopDistances } from '@/app/(protected)/(engine)/utils/graph'
import { generateWorld } from '@/app/(protected)/(engine)/utils/worldGenerator'
import { validateWorld } from '@/app/(protected)/(engine)/utils/worldValidation'
import storedWorld from '@/public/world/world.json'

const world = storedWorld as unknown as World

/** Deep copy of the stored world, to break it in a test. */
function cloneWorld(): World {
  return structuredClone(world)
}

describe('graph utils', () => {
  const adjacency = buildAdjacency(
    ['a', 'b', 'c', 'd', 'e'],
    [
      ['a', 'b'],
      ['b', 'c'],
      ['c', 'd']
    ]
  )

  it('builds symmetric adjacency lists', () => {
    expect(adjacency.get('b')).toEqual(['a', 'c'])
    expect(adjacency.get('e')).toEqual([])
  })

  it('counts trail steps from the sources', () => {
    const distances = hopDistances(adjacency, ['a'])

    expect(distances.get('d')).toBe(3)
    expect(distances.has('e')).toBe(false)
  })

  it('does not enter closed nodes', () => {
    const distances = hopDistances(adjacency, ['a'], (id) => id !== 'c')

    expect(distances.has('c')).toBe(false)
    expect(distances.has('d')).toBe(false)
  })

  it('joins sets once', () => {
    const sets = new DisjointSet()

    expect(sets.union('a', 'b')).toBe(true)
    expect(sets.union('b', 'c')).toBe(true)
    expect(sets.union('a', 'c')).toBe(false)
    expect(sets.find('a')).toBe(sets.find('c'))
    expect(sets.find('d')).toBe('d')
  })
})

describe('stored world', () => {
  it('passes every validation', () => {
    expect(validateWorld(world)).toEqual([])
  })

  it('is the world the generator makes from the default seed', () => {
    expect(generateWorld(WORLD_SEED)).toEqual(world)
  })

  it('has more than a thousand points and twenty-nine camps', () => {
    const camps = world.nodes.filter((node) => node.type === NodeType.START || node.type === NodeType.CAMP_BOSS)

    expect(world.nodes.length).toBeGreaterThanOrEqual(1000)
    expect(camps).toHaveLength(29)
  })
})

describe('difficulty and passes of the biomes', () => {
  const byId = new Map(world.nodes.map((node) => [node.id, node]))

  const pass = (first: Biome, second: Biome) => {
    const [a, b] = world.edges.find(
      ([one, other]) => [byId.get(one)!.biome, byId.get(other)!.biome].sort().join() === [first, second].sort().join()
    )!

    return [byId.get(a)!, byId.get(b)!].sort((one) => (one.biome === first ? -1 : 1))
  }

  const members = (biome: Biome) => world.nodes.filter((node) => node.biome === biome)

  it('goes up in levels from biome to biome, each one starting before the previous one ends', () => {
    expect(BIOMES.map(({ biome }) => biome)).toEqual([
      Biome.MEADOWS,
      Biome.FOREST,
      Biome.DESERT,
      Biome.TROPICAL,
      Biome.MOUNTAINS,
      Biome.WASTELANDS,
      Biome.SNOW,
      Biome.VOLCANIC,
      Biome.ABYSS
    ])

    BIOMES.slice(1).forEach((definition, position) => {
      expect(definition.levelMin).toBeGreaterThan(BIOMES[position].levelMin)
      expect(definition.levelMin).toBeLessThan(BIOMES[position].levelMax)
    })
  })

  it('holds Oren in the tropics and Ysolde, the hardest to free, in the mountains', () => {
    const captors = world.nodes.filter((node) => node.bossKind === BossKind.CAPTOR)
    const holding = (captive: CharacterId) => captors.find((node) => node.captive === captive)!

    expect(holding(CharacterId.OREN).biome).toBe(Biome.TROPICAL)
    expect(holding(CharacterId.YSOLDE).biome).toBe(Biome.MOUNTAINS)
    expect(Math.max(...captors.map((node) => node.level!))).toBe(holding(CharacterId.YSOLDE).level)
  })

  it('leaves the Meadows for the Desert by the trail set for it and for the Tropics by their north', () => {
    const meadows = members(Biome.MEADOWS).map((node) => node.y)
    const [meadow, desert] = pass(Biome.MEADOWS, Biome.DESERT)

    expect([meadow.x, meadow.y]).toEqual([8925, 10666])
    expect([desert.x, desert.y]).toEqual([9428, 10427])
    expect(pass(Biome.MEADOWS, Biome.TROPICAL)[0].y).toBeLessThan(Math.min(...meadows) + 1000)
  })

  it('has a camp in the middle of the north of the Meadows and two towards the south', () => {
    const start = world.nodes.find((node) => node.type === NodeType.START)!
    const camps = members(Biome.MEADOWS).filter((node) => node.type === NodeType.CAMP_BOSS)
    const north = camps.filter((node) => node.y < start.y)
    const south = camps.filter((node) => node.y > start.y)

    expect(north).toHaveLength(1)
    expect(south).toHaveLength(2)
    expect(Math.abs(north[0].x - 8000)).toBeLessThan(500)
    expect(south[0].x < 8000).not.toBe(south[1].x < 8000)
  })

  it('ends every dead end in a prize', () => {
    const adjacency = buildAdjacency(
      world.nodes.map((node) => node.id),
      world.edges
    )

    expect(world.nodes.filter((node) => adjacency.get(node.id)!.length === 1 && node.type === NodeType.COMBAT)).toEqual(
      []
    )
  })

  it('does not join the Desert and the Tropics any more', () => {
    expect(
      world.edges
        .filter(([one, other]) =>
          [byId.get(one)!.biome, byId.get(other)!.biome].every((biome) =>
            [Biome.DESERT, Biome.TROPICAL].includes(biome)
          )
        )
        .filter(([one, other]) => byId.get(one)!.biome !== byId.get(other)!.biome)
    ).toEqual([])
  })
})

describe('world generator', () => {
  it('is deterministic', () => {
    expect(generateWorld(77)).toEqual(generateWorld(77))
  })

  it('makes valid worlds from other seeds', () => {
    for (const seed of [1, 2, 3]) {
      expect(validateWorld(generateWorld(seed))).toEqual([])
    }
  })
})

describe('world validation', () => {
  it('detects a disconnected world', () => {
    const broken = cloneWorld()
    const leaf = broken.nodes.find((node) => node.type === NodeType.SANCTUARY)!

    broken.edges = broken.edges.filter(([a, b]) => a !== leaf.id && b !== leaf.id)

    expect(validateWorld(broken).length).toBeGreaterThan(0)
  })

  it('detects trails to unknown points', () => {
    const broken = cloneWorld()

    broken.edges.push([broken.startNodeId, 'missing'])

    expect(validateWorld(broken).length).toBeGreaterThan(0)
  })

  it('detects points with too many trails', () => {
    const broken = cloneWorld()
    const hub = broken.nodes.find((node) => node.type === NodeType.COMBAT)!
    const others = broken.nodes.filter((node) => node.biome === hub.biome && node.id !== hub.id).slice(0, 5)

    for (const other of others) {
      broken.edges.push([hub.id, other.id])
    }

    expect(validateWorld(broken).length).toBeGreaterThan(0)
  })

  it('detects a second way into the Abyss', () => {
    const broken = cloneWorld()
    const abyss = broken.nodes.find((node) => node.biome === Biome.ABYSS && node.type === NodeType.COMBAT)!
    const outside = broken.nodes.find((node) => node.biome !== Biome.ABYSS && node.type === NodeType.COMBAT)!

    broken.edges.push([abyss.id, outside.id])

    expect(validateWorld(broken).length).toBeGreaterThan(0)
  })

  it('detects a dead end without a prize', () => {
    const broken = cloneWorld()
    const chest = broken.nodes.find((node) => node.guarded)!

    chest.type = NodeType.COMBAT
    delete chest.guarded

    expect(validateWorld(broken).length).toBeGreaterThan(0)
  })

  it('detects a missing rune', () => {
    const broken = cloneWorld()
    const sanctuary = broken.nodes.find((node) => node.type === NodeType.SANCTUARY)!

    sanctuary.type = NodeType.COMBAT
    delete sanctuary.runeIndex

    expect(validateWorld(broken).length).toBeGreaterThan(0)
  })
})
