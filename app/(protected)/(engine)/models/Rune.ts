import { BonusesPart } from '@/app/(protected)/(engine)/models/Bonuses'
import { CombatStats } from '@/app/(protected)/(engine)/models/CombatStats'
import { RuneTier } from '@/app/(protected)/(engine)/models/RuneTier'

/** Attributes a rune can raise: the main one gives it its color. */
export type RuneStat = 'attack' | 'special' | 'defense' | 'speed' | 'maxHealth' | 'maxFocus' | 'critChance'

/**
 * A rune (one per sanctuary, 1..RUNE_COUNT ordered by power). Equipped, it
 * gives its effect and changes some attributes; mastered, its effect alone can
 * be worn as an echo by paying its cost in Echoes.
 */
export interface Rune {
  index: number
  /** Its own id: its name and text are in i18n (runes.<id>) and its art in icons/runes/<id>. */
  id: string
  tier: RuneTier
  effect: BonusesPart
  /** The attribute it raises the most (its color), and the one it lowers, if any. */
  gain: RuneStat
  loss?: RuneStat
  /** Shares added to the attributes while equipped (not as an echo). */
  stats: Partial<Record<keyof CombatStats, number>>
  /** Echoes it costs as an echo. */
  echoCost: number
}
