import { describe, expect, it } from 'vitest'
import type { World } from '@/app/(protected)/(engine)/models/World'
import { isGameState } from '@/app/(protected)/(engine)/utils/gameState'
import { getMaxHealth } from '@/app/(protected)/(engine)/utils/heroes'
import { createTestGameState, TEST_GAMES } from '@/app/(protected)/(engine)/utils/testGames'
import { getEncounter, getReachableNodeIds, indexWorld } from '@/app/(protected)/(engine)/utils/worldMap'
import storedWorld from '@/public/world/world.json'

const index = indexWorld(storedWorld as unknown as World)

describe('test games (/dev/progressN)', () => {
  for (const number of Object.keys(TEST_GAMES).map(Number)) {
    it(`builds test game ${number} at its camp with its heroes`, () => {
      const game = TEST_GAMES[number]
      const state = createTestGameState(index, number)

      expect(isGameState(state)).toBe(true)
      expect(state.positionNodeId).toBe(game.campId)
      expect(index.nodes.get(game.campId)!.biome).toBe(game.biomes[game.biomes.length - 1])
      expect(state.characters.map((character) => [character.id, character.level])).toEqual(Object.entries(game.levels))
      expect(state.characters.every((character) => character.health === getMaxHealth(character))).toBe(true)
      expect(getEncounter(index, state, state.positionNodeId)).toBeNull()
      // There is somewhere new to go.
      expect([...getReachableNodeIds(index, state)].some((id) => !state.clearedNodeIds.includes(id))).toBe(true)
    })
  }
})
