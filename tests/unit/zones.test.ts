import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { BIOMES_ORDER, TERRAINS } from '@/app/(protected)/(engine)/data/terrains'
import { getZoneDefinition, LAIRS, ZONES, ZONES_ORDER } from '@/app/(protected)/(engine)/data/zones'
import { Biome } from '@/app/(protected)/(engine)/models/Biome'
import { BossKind } from '@/app/(protected)/(engine)/models/BossKind'
import type { World } from '@/app/(protected)/(engine)/models/World'
import { Zone } from '@/app/(protected)/(engine)/models/Zone'
import { placeScenery } from '@/app/(protected)/(engine)/utils/scenery'
import { buildTileMap } from '@/app/(protected)/(engine)/utils/tileMap'

const world: World = JSON.parse(readFileSync('public/world/world.json', 'utf8'))
const map = buildTileMap(world)
const forest = BIOMES_ORDER.indexOf(Biome.FOREST)

/** Share of the tiles of the forest in each zone (0 for its plain look). */
function forestShares(): Map<number, number> {
  const counts = new Map<number, number>()
  let total = 0

  map.biomes.forEach((biome, index) => {
    if (biome === forest) {
      counts.set(map.zones[index], (counts.get(map.zones[index]) ?? 0) + 1)
      total++
    }
  })

  return new Map([...counts].map(([zone, count]) => [zone, count / total]))
}

describe('zones of the biomes', () => {
  it('lie only in their own biome', () => {
    map.zones.forEach((zone, index) => {
      if (zone) {
        expect(BIOMES_ORDER[map.biomes[index]]).toBe(ZONES[zone - 1].biome)
      }
    })
  })

  it('split the forest into its plain look and every one of its zones', () => {
    const shares = forestShares()

    expect(shares.get(0)!).toBeGreaterThan(0.15)

    for (const zone of [Zone.AUTUMN, Zone.PINEWOOD, Zone.BLOSSOM, Zone.WITCHWOOD]) {
      expect(shares.get(ZONES_ORDER.indexOf(zone) + 1) ?? 0).toBeGreaterThan(0.03)
    }
  })

  it('surround the captor of the forest with its lair', () => {
    const captor = world.nodes.find((node) => node.biome === Biome.FOREST && node.bossKind === BossKind.CAPTOR)!
    const column = Math.floor(captor.x / map.tileSize)
    const row = Math.floor(captor.y / map.tileSize)

    expect(ZONES_ORDER[map.zones[row * map.columns + column] - 1]).toBe(LAIRS[Biome.FOREST]!.zone)
  })

  it('give their ground to their tiles', () => {
    const autumn = ZONES_ORDER.indexOf(Zone.AUTUMN) + 1
    const leaves = map.terrains.filter(
      (terrain, index) => map.zones[index] === autumn && TERRAINS[terrain] === 'leaves'
    )

    expect(leaves.length).toBeGreaterThan(0)
  })

  it('mark the scenery that grows in them', () => {
    const zoned = placeScenery(world, map).filter((item) => item.zone)

    expect(zoned.length).toBeGreaterThan(0)
    expect(zoned.every((item) => item.biome === getZoneDefinition(item.zone!).biome)).toBe(true)
  })
})
