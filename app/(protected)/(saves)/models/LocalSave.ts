import { GameState } from '@/app/(protected)/(engine)/models/GameState'

/**
 * Copy of the saved game kept in the browser (IndexedDB), so the game is
 * played offline and closing the app never loses an action. It is uploaded
 * with /api/saveGame when there is a network.
 */
export interface LocalSave {
  userId: number
  /** Version of the server save this copy comes from (sent back on the next upload). */
  version: number
  playTimeSeconds: number
  /**
   * When the game last changed on this device, or the `updatedAt` of the server
   * save it comes from (ISO date). Missing in copies written before it existed.
   */
  updatedAt?: string
  /** SAVE_VERSION of `state`. */
  saveVersion: number
  state: GameState
  /** Whether it has changes the server does not have yet. */
  dirty: boolean
}
