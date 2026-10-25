import { CharacterState } from '@/app/(protected)/(engine)/models/CharacterState'

/**
 * Whole state of a saved game: what `saves.data` holds. It only references
 * the world and the catalogs by id (they live in the code), so it stays small.
 * Every change of its shape increases SAVE_VERSION and adds a migration of the
 * older saves.
 */
export interface GameState {
  /** New Game+ cycle: 0 = first playthrough. */
  cycle: number
  /** Node of the world map where the party stands. */
  positionNodeId: string
  /** Camp where the party rested last: where it comes back after a defeat. */
  lastRestCampId: string
  /** Camps the party can rest at and teleport to. */
  openCampIds: string[]
  /** Nodes already cleared in this cycle. */
  clearedNodeIds: string[]
  /** Unlocked characters (Kael is always the first one). */
  characters: CharacterState[]
  gold: number
}
