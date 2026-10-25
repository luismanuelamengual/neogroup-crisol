/* eslint-disable no-console */
/**
 * Balance check of the Meadows (the vertical slice): plays every encounter of
 * the biome many times with Kael alone at the level of the enemies, and at two
 * and four levels more (built as a player would: points, talents and weapon),
 * and prints the share of victories.
 *
 * Usage: yarn battles:meadows
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

const RUNS = 40
const index = indexWorld(storedWorld as unknown as World)
const fresh = { ...createInitialGameState('simulation'), clearedNodeIds: [] }
const rows = new Map<string, number[][]>()

for (const node of index.world.nodes.filter((candidate) => candidate.biome === Biome.MEADOWS)) {
  const encounter = getEncounter(index, fresh, node.id)

  if (!encounter) {
    continue
  }

  const phases = getEncounterPhases(node, encounter)
  const key = `${encounter.kind} L${String(encounter.level).padStart(2, '0')}`
  const rates = [0, 2, 4].map((extra) =>
    winRate(
      {
        heroes: [buildCharacter(CharacterId.KAEL, encounter.level + extra)],
        phases,
        biome: Biome.MEADOWS,
        canRetreat: encounter.kind === EncounterKind.COMBAT
      },
      RUNS
    )
  )

  rows.set(key, [...(rows.get(key) ?? []), rates])
}

console.log('encounter     count   Kael +0   +2   +4')

for (const [key, all] of [...rows.entries()].sort()) {
  const average = [0, 1, 2].map((column) => all.reduce((sum, rates) => sum + rates[column], 0) / all.length)

  console.log(
    `${key.padEnd(14)}${String(all.length).padStart(5)}   ${average.map((rate) => `${Math.round(rate * 100)}%`.padStart(5)).join(' ')}`
  )
}
