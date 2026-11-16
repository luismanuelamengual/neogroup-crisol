import { GameState } from '@/app/(protected)/(engine)/models/GameState'

/** Payload of /api/saveGame. */
export interface SaveGameInput {
  /** Version of the save the browser has (the one /api/loadGame or the previous /api/saveGame returned). */
  version: number
  playTimeSeconds: number
  /** When the state changed in the browser (ISO date; it can be long before the upload when played offline). */
  updatedAt?: string
  state: GameState
}
