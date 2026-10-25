import { GameState } from '@/app/(protected)/(engine)/models/GameState'
import {
  createInitialGameState,
  isGameState,
  SAVE_VERSION,
  WORLD_VERSION
} from '@/app/(protected)/(engine)/utils/gameState'
import { LoadedSave } from '@/app/(protected)/(saves)/models/LoadedSave'
import { Save } from '@/app/(protected)/(saves)/models/Save'
import { SaveGameInput } from '@/app/(protected)/(saves)/models/SaveGameInput'
import { SaveSummary } from '@/app/(protected)/(saves)/models/SaveSummary'
import { ApiException } from '@/app/models/ApiException'

/**
 * Saved games: one per account. The game is played in the browser, which sends
 * the whole state back; the server only checks its shape and its version, it
 * never simulates the game (single player, no ranking).
 */

function findSave(userId: number): Promise<Save | null> {
  return Save.where('userId', userId).first()
}

function toLoadedSave(save: Save): LoadedSave {
  return { version: save.version, playTimeSeconds: save.playTimeSeconds, state: save.data as GameState }
}

/** Summary of the player's saved game for the main menu, or null when it has none. */
export async function getSaveSummary(userId: number): Promise<SaveSummary | null> {
  const save = await findSave(userId)

  if (!save) {
    return null
  }

  const state = save.data as GameState

  return {
    cycle: save.cycle,
    playTimeSeconds: save.playTimeSeconds,
    topLevel: Math.max(...state.characters.map((character) => character.level)),
    characters: state.characters.length,
    updatedAt: save.updatedAt.toISOString()
  }
}

/** The player's saved game, to continue it. */
export async function loadGame(userId: number): Promise<LoadedSave> {
  const save = await findSave(userId)

  if (!save) {
    throw new ApiException('errors.saveNotFound', 404)
  }

  return toLoadedSave(save)
}

/** Starts a new game, replacing the saved one if there is any (the menu asks first). */
export async function startNewGame(userId: number, now = new Date()): Promise<LoadedSave> {
  const state = createInitialGameState()
  const save = (await findSave(userId)) ?? new Save()

  save.userId = userId
  save.cycle = state.cycle
  save.worldVersion = WORLD_VERSION
  save.saveVersion = SAVE_VERSION
  save.version = (save.version ?? 0) + 1
  save.playTimeSeconds = 0
  save.data = state
  save.createdAt = now
  save.updatedAt = now
  await save.save()

  return toLoadedSave(save)
}

/** Stores the state of the game sent by the browser. Rejects a state sent from an outdated copy of the save. */
export async function saveGame(userId: number, input: SaveGameInput, now = new Date()): Promise<LoadedSave> {
  if (!input || !isGameState(input.state) || !Number.isInteger(input.playTimeSeconds) || input.playTimeSeconds < 0) {
    throw new ApiException('errors.invalidSave')
  }

  const save = await findSave(userId)

  if (!save) {
    throw new ApiException('errors.saveNotFound', 404)
  }

  if (input.version !== save.version) {
    throw new ApiException('errors.saveOutdated', 409)
  }

  save.cycle = input.state.cycle
  save.saveVersion = SAVE_VERSION
  save.version = save.version + 1
  save.playTimeSeconds = Math.max(save.playTimeSeconds, input.playTimeSeconds)
  save.data = input.state
  save.updatedAt = now
  await save.save()

  return toLoadedSave(save)
}
