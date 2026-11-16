import { GameState } from '@/app/(protected)/(engine)/models/GameState'
import { SaveSummary } from '@/app/(protected)/(saves)/models/SaveSummary'

/** What the main menu shows of a game (the server save or the copy in the browser). */
export function summarizeSave(state: GameState, playTimeSeconds: number, updatedAt: string): SaveSummary {
  return {
    cycle: state.cycle,
    playTimeSeconds,
    topLevel: Math.max(...state.characters.map((character) => character.level)),
    characters: state.characters.length,
    updatedAt
  }
}
