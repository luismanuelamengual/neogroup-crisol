import { GameState } from '@/app/(protected)/(engine)/models/GameState'

/** The saved game sent to the browser to play it (see /api/loadGame). */
export interface LoadedSave {
  /** Version to send back with the next write (optimistic locking). */
  version: number
  playTimeSeconds: number
  state: GameState
}
