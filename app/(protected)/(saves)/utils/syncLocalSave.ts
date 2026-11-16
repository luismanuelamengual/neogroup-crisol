import { LoadedSave } from '@/app/(protected)/(saves)/models/LoadedSave'
import { LocalSave } from '@/app/(protected)/(saves)/models/LocalSave'
import { SaveGameInput } from '@/app/(protected)/(saves)/models/SaveGameInput'
import { chooseSave, SaveChoice, upToDate } from '@/app/(protected)/(saves)/utils/chooseSave'
import { deleteLocalSave, readLocalSave, writeLocalSave } from '@/app/(protected)/(saves)/utils/localSaves'
import type { ApiError } from '@/app/models/ApiError'

/** The requests syncLocalSave makes (see useSaves). */
export interface SaveRequests {
  loadGame: (notifyError?: boolean) => Promise<LoadedSave>
  saveGame: (input: SaveGameInput, notifyError?: boolean) => Promise<LoadedSave>
}

/** The local copy after syncing it (null when there is none) and the copy dropped by a conflict, if any. */
export interface LocalSync {
  save: LocalSave | null
  discarded: SaveChoice['discarded']
}

/**
 * Uploads the changes of the local copy that the server does not have yet
 * (the game was played offline). When the server save moved on meanwhile, the
 * copy changed the most recently wins (see chooseSave). Without network the
 * copy just stays pending. Used outside the world (the main menu), where the
 * game is not loaded in the game store.
 */
export async function syncLocalSave(userId: number, requests: SaveRequests): Promise<LocalSync> {
  let save = upToDate(await readLocalSave(userId))
  let discarded: SaveChoice['discarded'] = null

  // A second round uploads the local copy when it wins a conflict.
  for (let round = 0; save?.dirty && round < 2; round++) {
    const sent: LocalSave = save

    try {
      const result = await requests.saveGame(
        { version: sent.version, playTimeSeconds: sent.playTimeSeconds, updatedAt: sent.updatedAt, state: sent.state },
        false
      )

      save = { ...sent, version: result.version, updatedAt: result.updatedAt, dirty: false }
      await writeLocalSave(save)
    } catch (error) {
      const key = (error as ApiError).key

      if (key === 'errors.saveNotFound') {
        await deleteLocalSave(userId)

        return { save: null, discarded }
      }

      if (key !== 'errors.saveOutdated') {
        // Offline (or the server failed): it is uploaded later.
        break
      }

      let server: LoadedSave

      try {
        server = await requests.loadGame(false)
      } catch {
        break
      }

      const choice = chooseSave(userId, sent, server)!

      discarded = choice.discarded
      save = choice.save
      await writeLocalSave(save)
    }
  }

  return { save, discarded }
}
