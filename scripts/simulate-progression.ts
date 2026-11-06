/* eslint-disable no-console */
/**
 * Pace of the levels: clears every fight of the world once, biome after biome
 * (in the order of the game), and prints the level a hero reaches at the end
 * of each biome next to the levels of its enemies. Every hero of the party
 * gets all the experience of a battle (see utils/battleResult.ts).
 *
 * Usage: yarn progression
 */
import { BIOMES } from '@/app/(protected)/(engine)/data/biomes'
import { getEnemyRewards } from '@/app/(protected)/(engine)/data/enemies'
import { World } from '@/app/(protected)/(engine)/models/World'
import { getEncounterPhases } from '@/app/(protected)/(engine)/utils/encounters'
import { createInitialGameState } from '@/app/(protected)/(engine)/utils/gameState'
import { xpToNextLevel } from '@/app/(protected)/(engine)/utils/progression'
import { getEncounter, indexWorld } from '@/app/(protected)/(engine)/utils/worldMap'
import storedWorld from '@/public/world/world.json'

const index = indexWorld(storedWorld as unknown as World)
const fresh = { ...createInitialGameState('simulation'), clearedNodeIds: [] }
let level = 1
let xp = 0

console.log('biome        enemies   fights      xp   hero level at the end')

for (const definition of BIOMES) {
  let gained = 0
  let fights = 0

  for (const node of index.world.nodes.filter((item) => item.biome === definition.biome)) {
    const encounter = getEncounter(index, fresh, node.id)

    if (!encounter) {
      continue
    }

    fights++

    for (const spawn of getEncounterPhases(node, encounter).flat()) {
      gained += getEnemyRewards(spawn.speciesId, spawn.level, spawn.elite).xp
    }
  }

  xp += gained

  while (xp >= xpToNextLevel(level)) {
    xp -= xpToNextLevel(level)
    level++
  }

  console.log(
    `${definition.biome.padEnd(12)} ${`${definition.levelMin}-${definition.levelMax}`.padStart(7)} ${String(fights).padStart(8)} ${String(gained).padStart(7)}   ${level}`
  )
}
