import { isGameState, migrateGameState, SAVE_VERSION } from '@/app/(protected)/(engine)/utils/gameState'
import { LoadedSave } from '@/app/(protected)/(saves)/models/LoadedSave'
import { LocalSave } from '@/app/(protected)/(saves)/models/LocalSave'

/** Which copy of the game to play: the one in this browser or the one in the server. */
export interface SaveChoice {
  save: LocalSave
  /** The other copy had changes that were dropped (the player is told). */
  discarded: 'local' | 'server' | null
}

/** A server save as a local copy with nothing to upload. */
export function fromServer(userId: number, server: LoadedSave): LocalSave {
  return {
    userId,
    version: server.version,
    playTimeSeconds: server.playTimeSeconds,
    saveVersion: SAVE_VERSION,
    state: server.state,
    dirty: false
  }
}

/** The local copy migrated to the current SAVE_VERSION, or null when it cannot be used. */
function upToDate(local: LocalSave | null): LocalSave | null {
  if (!local) {
    return null
  }

  const state = local.saveVersion < SAVE_VERSION ? migrateGameState(local.state, local.saveVersion) : local.state

  return isGameState(state) ? { ...local, state, saveVersion: SAVE_VERSION } : null
}

/**
 * Chooses between the local copy and the server save (null when the server
 * could not be reached). A copy of another game (a New game started on
 * another device) always loses; between two copies of the same game, the one
 * with unsent changes and more play time wins, as the plan says.
 */
export function chooseSave(userId: number, localSave: LocalSave | null, server: LoadedSave | null): SaveChoice | null {
  const local = upToDate(localSave)

  if (!server) {
    return local ? { save: local, discarded: null } : null
  }

  const remote = fromServer(userId, server)

  if (!local || local.state.gameId !== server.state.gameId || !local.dirty) {
    return { save: remote, discarded: null }
  }

  if (local.version === server.version) {
    return { save: local, discarded: null }
  }

  // Both copies moved on since they split: keep the one played the longest, on top of the latest server version.
  return local.playTimeSeconds > server.playTimeSeconds
    ? { save: { ...local, version: server.version }, discarded: 'server' }
    : { save: remote, discarded: 'local' }
}
