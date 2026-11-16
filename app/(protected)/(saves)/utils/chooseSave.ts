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
    updatedAt: server.updatedAt,
    saveVersion: SAVE_VERSION,
    state: server.state,
    dirty: false
  }
}

/** The local copy migrated to the current SAVE_VERSION, or null when it cannot be used. */
export function upToDate(local: LocalSave | null): LocalSave | null {
  if (!local) {
    return null
  }

  const state = local.saveVersion < SAVE_VERSION ? migrateGameState(local.state, local.saveVersion) : local.state

  return isGameState(state) ? { ...local, state, saveVersion: SAVE_VERSION } : null
}

/** Milliseconds of an ISO date, 0 when missing (copies written before `updatedAt` existed lose). */
function timeOf(date: string | undefined): number {
  const time = date ? new Date(date).getTime() : NaN

  return Number.isNaN(time) ? 0 : time
}

/**
 * Chooses between the local copy and the server save (null when the server
 * could not be reached). The local copy is only kept when it has changes the
 * server does not have: on top of the same server version there is nothing to
 * choose, and when both copies moved on since they split (the game was played
 * on another device, or a New game was started there) the one changed the
 * most recently wins.
 */
export function chooseSave(userId: number, localSave: LocalSave | null, server: LoadedSave | null): SaveChoice | null {
  const local = upToDate(localSave)

  if (!server) {
    return local ? { save: local, discarded: null } : null
  }

  const remote = fromServer(userId, server)

  if (!local || !local.dirty) {
    return { save: remote, discarded: null }
  }

  if (local.version === server.version && local.state.gameId === server.state.gameId) {
    return { save: local, discarded: null }
  }

  const localTime = timeOf(local.updatedAt)
  const serverTime = timeOf(server.updatedAt)

  // The same change, already uploaded (e.g. by the menu while this copy was being read).
  if (localTime > 0 && localTime === serverTime) {
    return { save: remote, discarded: null }
  }

  // Both copies moved on: keep the newest, on top of the latest server version (so it can be uploaded).
  return localTime > serverTime
    ? { save: { ...local, version: server.version }, discarded: 'server' }
    : { save: remote, discarded: 'local' }
}

/** Whether a copy was changed after another (ISO dates). */
export function isNewer(date: string | undefined, than: string | undefined): boolean {
  return timeOf(date) > timeOf(than)
}
