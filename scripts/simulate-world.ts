/* eslint-disable no-console */
/**
 * Balance check of the world: plays a sample of the encounters of each biome
 * many times with the party a player has there (the heroes rescued by then)
 * at the level of the enemies, and at two and four levels more (built as a
 * player would: points, talents and weapon), and prints the share of victories.
 *
 * Usage: yarn battles [biome]
 */
import { Biome } from '@/app/(protected)/(engine)/models/Biome'
import { CharacterId } from '@/app/(protected)/(engine)/models/CharacterId'
import { EncounterKind } from '@/app/(protected)/(engine)/models/EncounterKind'
import { World } from '@/app/(protected)/(engine)/models/World'
import { getEncounterPhases } from '@/app/(protected)/(engine)/utils/encounters'
import { createInitialGameState } from '@/app/(protected)/(engine)/utils/gameState'
import { getEncounter, indexWorld } from '@/app/(protected)/(engine)/utils/worldMap'
import storedWorld from '@/public/world/world.json'
import { winRate } from '@/tests/support/battleSimulator'
import { buildCharacter } from '@/tests/support/builds'

const RUNS = 30
/** Encounters of each kind tried per biome. */
const SAMPLE = 6
const { KAEL, SERA, BRANN, OREN, YSOLDE } = CharacterId
/** The heroes a player has in each biome (each captor frees one). */
const PARTIES: Record<Biome, CharacterId[]> = {
  [Biome.MEADOWS]: [KAEL],
  [Biome.FOREST]: [KAEL],
  [Biome.TROPICAL]: [KAEL, SERA],
  [Biome.DESERT]: [KAEL, SERA],
  [Biome.MOUNTAINS]: [KAEL, SERA, BRANN],
  [Biome.SNOW]: [KAEL, SERA, BRANN],
  [Biome.VOLCANIC]: [KAEL, SERA, BRANN, OREN],
  [Biome.WASTELANDS]: [KAEL, SERA, BRANN, OREN, YSOLDE],
  [Biome.ABYSS]: [KAEL, SERA, BRANN, OREN, YSOLDE]
}
const only = process.argv[2] as Biome | undefined
const index = indexWorld(storedWorld as unknown as World)
const fresh = { ...createInitialGameState('simulation'), clearedNodeIds: [] }

console.log('biome       encounter                     count    +0    +2    +4')

for (const biome of Object.values(Biome).filter((candidate) => !only || candidate === only)) {
  const rows = new Map<string, number[][]>()
  const nodes = index.world.nodes.filter((node) => node.biome === biome)

  for (const node of nodes) {
    const encounter = getEncounter(index, fresh, node.id)

    if (!encounter) {
      continue
    }

    const phases = getEncounterPhases(node, encounter)
    // DETAIL=1 lists each boss on its own.
    const key =
      process.env.DETAIL && encounter.kind !== EncounterKind.COMBAT && encounter.kind !== EncounterKind.ELITE
        ? `${encounter.kind}:${phases[0][0].speciesId}`
        : encounter.kind
    const seen = rows.get(key) ?? []

    if (seen.length >= SAMPLE && encounter.kind === EncounterKind.COMBAT) {
      continue
    }

    const rates = [0, 2, 4].map((extra) => {
      const level = encounter.level + extra

      return winRate(
        {
          heroes: (process.env.SOLO ? [KAEL] : PARTIES[biome]).map((id) =>
            buildCharacter(id, level, Math.min(20, Math.floor(level / 3)))
          ),
          phases,
          biome,
          canRetreat: encounter.kind === EncounterKind.COMBAT
        },
        RUNS
      )
    })

    rows.set(key, [...seen, rates])
  }

  for (const [key, all] of [...rows.entries()].sort()) {
    const average = [0, 1, 2].map((column) => all.reduce((sum, rates) => sum + rates[column], 0) / all.length)

    console.log(
      `${biome.padEnd(12)}${key.padEnd(30)}${String(all.length).padStart(5)} ${average.map((rate) => `${Math.round(rate * 100)}%`.padStart(5)).join(' ')}`
    )
  }
}
