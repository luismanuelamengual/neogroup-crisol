import { START_NODE_ID } from '@/app/(protected)/(engine)/data/world'
import { CharacterId } from '@/app/(protected)/(engine)/models/CharacterId'
import { GameState } from '@/app/(protected)/(engine)/models/GameState'

/** Version of the shape of GameState (see `saves.saveVersion`). */
export const SAVE_VERSION = 1

/** State of a brand new game: Kael alone, at level 1, in the starting camp. */
export function createInitialGameState(): GameState {
  return {
    cycle: 0,
    positionNodeId: START_NODE_ID,
    lastRestCampId: START_NODE_ID,
    openCampIds: [START_NODE_ID],
    clearedNodeIds: [START_NODE_ID],
    characters: [{ id: CharacterId.KAEL, level: 1, xp: 0 }],
    gold: 0
  }
}

/** Whether a value has the shape of a GameState (what the server checks before storing a save). */
export function isGameState(value: unknown): value is GameState {
  if (!value || typeof value !== 'object') {
    return false
  }

  const state = value as Record<string, unknown>
  const isStringArray = (item: unknown) => Array.isArray(item) && item.every((entry) => typeof entry === 'string')
  const characterIds = Object.values(CharacterId) as string[]

  return (
    Number.isInteger(state.cycle) &&
    (state.cycle as number) >= 0 &&
    typeof state.positionNodeId === 'string' &&
    typeof state.lastRestCampId === 'string' &&
    isStringArray(state.openCampIds) &&
    isStringArray(state.clearedNodeIds) &&
    Number.isInteger(state.gold) &&
    (state.gold as number) >= 0 &&
    Array.isArray(state.characters) &&
    state.characters.length > 0 &&
    state.characters.every((character) => {
      const { id, level, xp } = (character ?? {}) as Record<string, unknown>

      return (
        characterIds.includes(id as string) &&
        Number.isInteger(level) &&
        (level as number) >= 1 &&
        Number.isInteger(xp) &&
        (xp as number) >= 0
      )
    })
  )
}
