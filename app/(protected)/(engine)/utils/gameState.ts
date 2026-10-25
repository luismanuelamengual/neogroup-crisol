import { getMaxHealth } from '@/app/(protected)/(engine)/data/characters'
import { FLASK_BASE_CHARGES } from '@/app/(protected)/(engine)/data/flask'
import { START_NODE_ID } from '@/app/(protected)/(engine)/data/world'
import { CharacterId } from '@/app/(protected)/(engine)/models/CharacterId'
import { CharacterState } from '@/app/(protected)/(engine)/models/CharacterState'
import { GameState } from '@/app/(protected)/(engine)/models/GameState'

/** Version of the shape of GameState (see `saves.saveVersion`). */
export const SAVE_VERSION = 3

/** A new character at a level, with full health. */
export function createCharacter(id: CharacterId, level = 1): CharacterState {
  return { id, level, xp: 0, health: getMaxHealth({ id, level }) }
}

/** State of a brand new game: Kael alone, at level 1, in the starting camp. */
export function createInitialGameState(gameId: string = crypto.randomUUID()): GameState {
  return {
    gameId,
    cycle: 0,
    positionNodeId: START_NODE_ID,
    lastRestCampId: START_NODE_ID,
    openCampIds: [START_NODE_ID],
    clearedNodeIds: [START_NODE_ID],
    respawnedNodeIds: [],
    flaskCharges: FLASK_BASE_CHARGES,
    characters: [createCharacter(CharacterId.KAEL)],
    gold: 0,
    kills: {}
  }
}

/**
 * Brings a state saved with an older SAVE_VERSION to the current shape. Each
 * step migrates one version, so a very old save goes through all of them.
 */
export function migrateGameState(data: unknown, fromVersion: number): unknown {
  let state = data as Record<string, unknown>

  if (fromVersion < 2) {
    // v2: game id, respawned fights, Amber Flask and the health of the characters.
    state = {
      ...state,
      gameId: 'legacy',
      respawnedNodeIds: [],
      flaskCharges: FLASK_BASE_CHARGES,
      characters: ((state.characters ?? []) as Omit<CharacterState, 'health'>[]).map((character) => ({
        ...character,
        health: getMaxHealth(character)
      }))
    }
  }

  if (fromVersion < 3) {
    // v3: enemies defeated, for the bestiary.
    state = { ...state, kills: {} }
  }

  return state
}

/** Whether a value has the shape of a GameState (what the server checks before storing a save). */
export function isGameState(value: unknown): value is GameState {
  if (!value || typeof value !== 'object') {
    return false
  }

  const state = value as Record<string, unknown>
  const isStringArray = (item: unknown) => Array.isArray(item) && item.every((entry) => typeof entry === 'string')
  const isCount = (item: unknown) => Number.isInteger(item) && (item as number) >= 0
  const characterIds = Object.values(CharacterId) as string[]

  return (
    typeof state.gameId === 'string' &&
    isCount(state.cycle) &&
    typeof state.positionNodeId === 'string' &&
    typeof state.lastRestCampId === 'string' &&
    isStringArray(state.openCampIds) &&
    isStringArray(state.clearedNodeIds) &&
    isStringArray(state.respawnedNodeIds) &&
    isCount(state.flaskCharges) &&
    isCount(state.gold) &&
    !!state.kills &&
    typeof state.kills === 'object' &&
    Object.values(state.kills as Record<string, unknown>).every(isCount) &&
    Array.isArray(state.characters) &&
    state.characters.length > 0 &&
    state.characters.every((character) => {
      const { id, level, xp, health } = (character ?? {}) as Record<string, unknown>

      return (
        characterIds.includes(id as string) &&
        Number.isInteger(level) &&
        (level as number) >= 1 &&
        isCount(xp) &&
        isCount(health)
      )
    })
  )
}
