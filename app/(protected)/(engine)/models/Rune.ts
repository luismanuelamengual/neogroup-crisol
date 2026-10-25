import { BonusesPart } from '@/app/(protected)/(engine)/models/Bonuses'
import { CombatStats } from '@/app/(protected)/(engine)/models/CombatStats'
import { RuneTier } from '@/app/(protected)/(engine)/models/RuneTier'

/**
 * A rune (one per sanctuary, 1..60 ordered by power). Equipped, it gives its
 * effect and changes some attributes; mastered, its effect alone can be worn
 * as an echo by paying its cost in Echoes.
 */
export interface Rune {
  index: number
  tier: RuneTier
  /** Its family (the name is in i18n, runes.<family>) and rank within it (I..V). */
  family: string
  rank: number
  effect: BonusesPart
  /** Shares added to the attributes while equipped (not as an echo). */
  stats: Partial<Record<keyof CombatStats, number>>
  /** Echoes it costs as an echo. */
  echoCost: number
}
