import { GameState } from '@/app/(protected)/(engine)/models/GameState'

/** The saved game sent to the browser to play it (see /api/loadGame). */
export interface LoadedSave {
  /** Version to send back with the next write (optimistic locking). */
  version: number
  playTimeSeconds: number
  /** When the game last changed (ISO date): the newest copy wins a conflict (see chooseSave). */
  updatedAt: string
  state: GameState
}
