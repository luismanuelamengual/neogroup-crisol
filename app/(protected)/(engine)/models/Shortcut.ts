/**
 * A shortcut of the world map (see utils/shortcuts.ts): a trail that stays
 * shut from its `from` side, near a camp, until the party reaches its `to`
 * side, deep in the biome, and opens it from there, as in Dark Souls.
 */
export interface Shortcut {
  /** The end near a camp: the shut side. */
  from: string
  /** The deep end: reaching it (winning its fight, if it has one) opens the shortcut for the rest of the cycle. */
  to: string
}
