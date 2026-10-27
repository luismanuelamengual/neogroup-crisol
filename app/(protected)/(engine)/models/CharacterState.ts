import { CharacterId } from '@/app/(protected)/(engine)/models/CharacterId'
import { CombatStats } from '@/app/(protected)/(engine)/models/CombatStats'

/** Progress of one unlocked character. It is kept between New Game+ cycles. */
export interface CharacterState {
  id: CharacterId
  /** No level cap. */
  level: number
  /** Experience gathered towards the next level. */
  xp: number
  /** Current health (0 when fallen; the maximum depends on the build). */
  health: number
  /** Attribute points spent on each attribute (one point per level). */
  attributes: Partial<Record<keyof CombatStats, number>>
  /** Nodes of its skill tree bought (one skill point per level). */
  talents: string[]
  /** Skill points traded for Echoes once its tree was complete. */
  traded: number
  /** The weapon it holds (data/weapons.ts). */
  weaponId: string
  /** The weapons it owns, with their upgrade (0..20): the one it starts with and those taken from the reliquaries. */
  weapons: Record<string, number>
  /** Runes equipped (up to 3, by index). */
  runes: number[]
  /** Echoes assigned to it for good: the budget of its echoes. */
  echoCapacity: number
  /** Mastered runes worn as echoes (by index): their costs add up to the capacity at most. */
  echoes: number[]
}
