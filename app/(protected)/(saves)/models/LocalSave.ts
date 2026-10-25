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
  /** SAVE_VERSION of `state`. */
  saveVersion: number
  state: GameState
  /** Whether it has changes the server does not have yet. */
  dirty: boolean
}
