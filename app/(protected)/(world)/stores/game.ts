import { create } from 'zustand'
import { GameState } from '@/app/(protected)/(engine)/models/GameState'
import { LocalSave } from '@/app/(protected)/(saves)/models/LocalSave'

/** Where the game being played is saved. */
export type SyncStatus = 'synced' | 'pending' | 'syncing' | 'offline'

/** Store with the game being played (its local copy) and how it is synced with the server. */
interface GameStore {
  save: LocalSave | null
  sync: SyncStatus
  setSave: (save: LocalSave | null) => void
  /** Replaces the state of the game: the change has to be uploaded. */
  setState: (state: GameState) => void
  addPlayTime: (seconds: number) => void
  setSync: (sync: SyncStatus) => void
}

export const useGameStore = create<GameStore>()((set) => ({
  save: null,
  sync: 'synced',
  setSave: (save) => set({ save, sync: save?.dirty ? 'pending' : 'synced' }),
  setState: (state) => set(({ save }) => (save ? { save: { ...save, state, dirty: true }, sync: 'pending' } : {})),
  addPlayTime: (seconds) =>
    set(({ save }) => (save ? { save: { ...save, playTimeSeconds: save.playTimeSeconds + seconds } } : {})),
  setSync: (sync) => set({ sync })
}))
