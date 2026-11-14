import { GameState } from '@/app/(protected)/(engine)/models/GameState'
import { SaveSummary } from '@/app/(protected)/(saves)/models/SaveSummary'

/** What the main menu shows of a saved game (the same for a database save and a browser one). */
export function toSaveSummary(state: GameState, playTimeSeconds: number, updatedAt: string): SaveSummary {
  return {
    cycle: state.cycle,
    playTimeSeconds,
    topLevel: Math.max(...state.characters.map((character) => character.level)),
    characters: state.characters.length,
    updatedAt
  }
}
