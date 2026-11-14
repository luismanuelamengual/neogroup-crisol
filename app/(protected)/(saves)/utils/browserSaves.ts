import { createInitialGameState, SAVE_VERSION } from '@/app/(protected)/(engine)/utils/gameState'
import { LocalSave } from '@/app/(protected)/(saves)/models/LocalSave'
import { chooseSave } from '@/app/(protected)/(saves)/utils/chooseSave'
import { readLocalSave } from '@/app/(protected)/(saves)/utils/localSaves'

/**
 * The saved game when SAVE_STORAGE is `local`: one per account, in
 * localStorage, and nowhere else (see saveStorage.ts). It keeps the shape of
 * LocalSave so it goes through the same migrations (saveVersion) as the
 * database saves.
 */

const KEY_PREFIX = 'crisol.save.'

function keyOf(userId: number): string {
  return `${KEY_PREFIX}${userId}`
}

function storage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage
  } catch {
    // Blocked by the browser (e.g. cookies disabled).
    return null
  }
}

function isStoredSave(value: unknown, userId: number): value is LocalSave {
  const save = value as LocalSave | null

  return (
    !!save &&
    typeof save === 'object' &&
    save.userId === userId &&
    Number.isInteger(save.saveVersion) &&
    Number.isFinite(save.playTimeSeconds) &&
    !!save.state &&
    typeof save.state === 'object'
  )
}

/** The game stored in this browser, as it was written (not migrated), or null. */
export function readBrowserSave(userId: number): LocalSave | null {
  try {
    const raw = storage()?.getItem(keyOf(userId))
    const save: unknown = raw ? JSON.parse(raw) : null

    return isStoredSave(save, userId) ? save : null
  } catch {
    return null
  }
}

/** Writes the game to this browser; false when it could not be written (no localStorage, or it is full). */
export function writeBrowserSave(save: LocalSave, now = new Date()): boolean {
  const target = storage()

  if (!target) {
    return false
  }

  try {
    target.setItem(keyOf(save.userId), JSON.stringify({ ...save, dirty: false, updatedAt: now.toISOString() }))

    return true
  } catch {
    return false
  }
}

export function deleteBrowserSave(userId: number): void {
  try {
    storage()?.removeItem(keyOf(userId))
  } catch {
    // Nothing to delete.
  }
}

/**
 * The game to play, migrated to the current SAVE_VERSION (and written back
 * when it was migrated), or null when there is none or it cannot be used.
 * Without a game in localStorage it adopts the copy left in IndexedDB by the
 * `db` mode, so switching to `local` keeps the game being played.
 */
export async function loadBrowserGame(userId: number): Promise<LocalSave | null> {
  let stored = readBrowserSave(userId)

  if (!stored) {
    const previous = await readLocalSave(userId)

    if (previous) {
      stored = previous
      writeBrowserSave(previous)
    }
  }

  const save = chooseSave(userId, stored, null)?.save ?? null

  if (save && stored && stored.saveVersion !== save.saveVersion) {
    writeBrowserSave(save, stored.updatedAt ? new Date(stored.updatedAt) : undefined)
  }

  return save ? { ...save, dirty: false } : null
}

/** Starts a new game in this browser, replacing the one there (the menu asks first). */
export function startBrowserGame(userId: number): LocalSave | null {
  const save: LocalSave = {
    userId,
    version: 0,
    playTimeSeconds: 0,
    saveVersion: SAVE_VERSION,
    state: createInitialGameState(),
    dirty: false
  }

  return writeBrowserSave(save) ? save : null
}
