import { CharacterState } from '@/app/(protected)/(engine)/models/CharacterState'

/**
 * Whole state of a saved game: what `saves.data` holds. It only references
 * the world and the catalogs by id (they live in the code), so it stays small.
 * Every change of its shape increases SAVE_VERSION and adds a migration of the
 * older saves (utils/gameState.ts).
 */
export interface GameState {
  /** Random id of the game, set when it starts: tells a new game apart from an older copy of the previous one. */
  gameId: string
  /** New Game+ cycle: 0 = first playthrough. */
  cycle: number
  /** Node of the world map where the party stands. */
  positionNodeId: string
  /** Camp where the party rested last: where it comes back after a defeat. */
  lastRestCampId: string
  /** Camps the party can rest at and teleport to. */
  openCampIds: string[]
  /**
   * Nodes already cleared in this cycle: their fight was won (or they had none).
   * The party walks freely through them and the fog is lifted around them.
   */
  clearedNodeIds: string[]
  /** Cleared common fights whose enemies came back when resting: fought again only by stopping there. */
  respawnedNodeIds: string[]
  /** Charges left in the Amber Flask (its maximum and potency come from the bosses defeated). */
  flaskCharges: number
  /** Unlocked characters, in the order of the formation: the first three fight, the rest wait in reserve. */
  characters: CharacterState[]
  gold: number
  /** Consumables and smithing stones, by item id. */
  inventory: Record<string, number>
  /** Runes obtained (by index); they are kept between cycles. */
  runes: number[]
  /** Battles won with each rune equipped by an active hero (by index): 4 master it. */
  runeWins: Record<string, number>
  /** Tears of Oblivion not used yet. */
  tears: number
  /** Echoes not assigned to any character yet. */
  echoes: number
  /** Echoes the Scholar sold in this cycle (each one costs more). */
  scholarSold: number
  /** Enemies defeated by species, ever (the bestiary unlocks with them; they are kept between cycles). */
  kills: Record<string, number>
}
