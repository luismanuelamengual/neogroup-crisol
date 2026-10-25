'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { GameState } from '@/app/(protected)/(engine)/models/GameState'
import { useSaves } from '@/app/(protected)/(saves)/hooks/useSaves'
import { LoadedSave } from '@/app/(protected)/(saves)/models/LoadedSave'
import { chooseSave } from '@/app/(protected)/(saves)/utils/chooseSave'
import { deleteLocalSave, readLocalSave, writeLocalSave } from '@/app/(protected)/(saves)/utils/localSaves'
import { useGameStore } from '@/app/(protected)/(world)/stores/game'
import { useUserStore } from '@/app/(protected)/stores/users'
import { useNotifications } from '@/app/hooks/useNotifications'
import { useT } from '@/app/i18n/I18nProvider'
import type { ApiError } from '@/app/models/ApiError'

/** Uploads pending changes this often while playing (and also when resting and when the app goes to the background). */
const UPLOAD_INTERVAL_MS = 2 * 60 * 1000
/** The local copy is rewritten this often only to keep the play time (every change of the state is written at once). */
const PLAY_TIME_WRITE_SECONDS = 10

export type SessionStatus = 'loading' | 'ready' | 'missing' | 'offline'

/**
 * Loads the game to play (the local copy or the server save, see chooseSave),
 * writes every change to the local copy at once, counts the play time and
 * uploads the changes to the server. Returns `update` to change the state and
 * `upload` to push it to the server right away (e.g. after resting).
 */
export function useGameSession() {
  const t = useT()
  const userId = useUserStore((state) => state.user?.id)
  const { loadGame, saveGame } = useSaves()
  const { showWarningMessage } = useNotifications()
  const [status, setStatus] = useState<SessionStatus>('loading')
  const uploading = useRef(false)
  const persist = useCallback(() => {
    const { save } = useGameStore.getState()

    if (save) {
      void writeLocalSave(save)
    }
  }, [])
  const fetchServerSave = useCallback(async (): Promise<LoadedSave | null | 'missing'> => {
    try {
      return await loadGame(false)
    } catch (error) {
      return (error as ApiError).key === 'errors.saveNotFound' ? 'missing' : null
    }
  }, [loadGame])
  /** Adopts the chosen copy between the local one and a fresh server save; false when there is no game. */
  const reconcile = useCallback(
    async (server: LoadedSave | null | 'missing'): Promise<boolean> => {
      if (!userId) {
        return false
      }

      if (server === 'missing') {
        await deleteLocalSave(userId)
        useGameStore.getState().setSave(null)

        return false
      }

      const choice = chooseSave(userId, useGameStore.getState().save ?? (await readLocalSave(userId)), server)

      if (!choice) {
        return false
      }

      if (choice.discarded === 'local') {
        showWarningMessage(t('world.sync.localDiscarded'), 8000)
      } else if (choice.discarded === 'server') {
        showWarningMessage(t('world.sync.serverDiscarded'), 8000)
      }

      useGameStore.getState().setSave(choice.save)
      persist()

      return true
    },
    [persist, showWarningMessage, t, userId]
  )
  const upload = useCallback(async () => {
    const { save, setSync } = useGameStore.getState()

    if (!save?.dirty || uploading.current) {
      return
    }

    uploading.current = true
    setSync('syncing')

    try {
      const result = await saveGame(
        { version: save.version, playTimeSeconds: save.playTimeSeconds, state: save.state },
        false
      )
      const current = useGameStore.getState().save!

      // Changes made while uploading stay pending.
      useGameStore.getState().setSave({ ...current, version: result.version, dirty: current.state !== save.state })
      persist()
    } catch (error) {
      if ((error as ApiError).key === 'errors.saveOutdated') {
        // The game moved on in another device.
        if (await reconcile(await fetchServerSave())) {
          useGameStore.getState().setSync(useGameStore.getState().save?.dirty ? 'pending' : 'synced')
        } else {
          setStatus('missing')
        }
      } else {
        setSync('offline')
      }
    } finally {
      uploading.current = false
    }
  }, [fetchServerSave, persist, reconcile, saveGame])

  // Loading.
  useEffect(() => {
    if (!userId) {
      return
    }

    let cancelled = false

    ;(async () => {
      useGameStore.getState().setSave(null)

      const server = await fetchServerSave()
      const found = await reconcile(server)

      if (!cancelled) {
        setStatus(found ? 'ready' : server === 'missing' ? 'missing' : 'offline')

        if (found && server === null) {
          useGameStore.getState().setSync('offline')
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [fetchServerSave, reconcile, userId])

  // Play time, periodic uploads, and uploads when the app goes to the background or the network comes back.
  useEffect(() => {
    if (status !== 'ready') {
      return
    }

    let seconds = 0
    const clock = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        useGameStore.getState().addPlayTime(1)

        if (++seconds % PLAY_TIME_WRITE_SECONDS === 0) {
          persist()
        }
      }
    }, 1000)
    const uploader = window.setInterval(() => void upload(), UPLOAD_INTERVAL_MS)

    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        persist()
        void upload()
      }
    }

    const handleOnline = () => void upload()

    document.addEventListener('visibilitychange', handleVisibility)
    window.addEventListener('online', handleOnline)

    return () => {
      window.clearInterval(clock)
      window.clearInterval(uploader)
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('online', handleOnline)
      persist()
      void upload()
    }
  }, [persist, status, upload])

  /** Changes the state of the game: written to the local copy at once, uploaded later. */
  const update = useCallback(
    (state: GameState) => {
      useGameStore.getState().setState(state)
      persist()
    },
    [persist]
  )

  return { status, update, upload }
}
