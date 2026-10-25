/** What the main menu shows of the saved game (null in the API when there is none). */
export interface SaveSummary {
  cycle: number
  playTimeSeconds: number
  /** Level of the highest character. */
  topLevel: number
  /** Unlocked characters. */
  characters: number
  updatedAt: string
}
