import { BOSS_SPECIES, FINAL_BOSS_SPECIES, getBiomeSpecies } from '@/app/(protected)/(engine)/data/enemies'
import { WORLD_SEED } from '@/app/(protected)/(engine)/data/world'
import { EnemySpawn } from '@/app/(protected)/(engine)/models/BattleState'
import { Encounter } from '@/app/(protected)/(engine)/models/Encounter'
import { EncounterKind } from '@/app/(protected)/(engine)/models/EncounterKind'
import { WorldNode } from '@/app/(protected)/(engine)/models/WorldNode'
import { createRandom, Random } from '@/app/(protected)/(engine)/utils/random'

/**
 * The enemies of each point: a fixed encounter (the same every time, also
 * after resting) chosen from the node id, with 1 to 3 phases of 1 to 3
 * enemies of its biome. The first points of a biome are gentler.
 */

/** A number from a text (FNV-1a), to seed the encounter of a node. */
export function hashText(text: string): number {
  let hash = 0x811c9dc5

  for (let index = 0; index < text.length; index++) {
    hash ^= text.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }

  return hash >>> 0
}

function weighted<T>(random: Random, options: [T, number][]): T {
  const total = options.reduce((sum, [, weight]) => sum + weight, 0)
  let value = random() * total

  for (const [option, weight] of options) {
    value -= weight

    if (value < 0) {
      return option
    }
  }

  return options[options.length - 1][0]
}

function commonPhase(random: Random, node: WorldNode, level: number, count: number, elite = false): EnemySpawn[] {
  const species = getBiomeSpecies(node.biome)

  return Array.from({ length: count }, (_, index) => ({
    speciesId: species[Math.floor(random() * species.length)].id,
    level: Math.max(1, level - (index > 0 && random() < 0.4 ? 1 : 0)),
    ...(elite && index === 0 ? { elite: true } : {})
  }))
}

/** The species of the boss of a camp: its own one, or a champion of its biome. */
function bossSpecies(random: Random, node: WorldNode): string {
  const own = node.bossId ? BOSS_SPECIES[node.bossId] : undefined

  if (own) {
    return own
  }

  const species = getBiomeSpecies(node.biome)

  return `${species[Math.floor(random() * species.length)].id}-champion`
}

/** The phases of enemies of an encounter. */
export function getEncounterPhases(node: WorldNode, encounter: Encounter): EnemySpawn[][] {
  const random = createRandom(hashText(`${WORLD_SEED}:${node.id}`))
  const level = encounter.level

  switch (encounter.kind) {
    case EncounterKind.COMBAT: {
      const maxPhases = level <= 3 ? 1 : level <= 7 ? 2 : 3
      const phases = Math.min(
        maxPhases,
        weighted(random, [
          [1, 55],
          [2, 35],
          [3, 10]
        ])
      )
      const maxEnemies = level <= 2 ? 2 : 3

      return Array.from({ length: phases }, () =>
        commonPhase(
          random,
          node,
          level,
          Math.min(
            maxEnemies,
            weighted(random, [
              [1, 35],
              [2, 40],
              [3, 25]
            ])
          )
        )
      )
    }

    case EncounterKind.ELITE:
      return [
        commonPhase(random, node, level, 2),
        commonPhase(random, node, level, 2),
        commonPhase(random, node, level, 1, true)
      ]

    case EncounterKind.GUARDIAN: {
      const species = getBiomeSpecies(node.biome)

      return [[{ speciesId: `${species[Math.floor(random() * species.length)].id}-guardian`, level }]]
    }

    case EncounterKind.MINIBOSS: {
      const boss = bossSpecies(random, node)

      return BOSS_SPECIES[node.bossId ?? '']
        ? [[{ speciesId: boss, level }]]
        : [[{ speciesId: boss, level }, ...commonPhase(random, node, level - 2, 1)]]
    }

    case EncounterKind.CAPTOR:
    case EncounterKind.SEAL:
      return [[{ speciesId: bossSpecies(random, node), level }]]
    case EncounterKind.CRISOL:
      return [[{ speciesId: FINAL_BOSS_SPECIES, level }]]
  }
}
