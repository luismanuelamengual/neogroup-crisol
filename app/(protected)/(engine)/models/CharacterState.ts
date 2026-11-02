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
  /** Concentración kept between battles: it only comes back with weapon attacks and potions, and resting (or a defeat) empties it (half the maximum when missing). */
  focus?: number
  /** Attribute points spent on each attribute (one point per level). */
  attributes: Partial<Record<keyof CombatStats, number>>
  /** Specials of its skill tree learned, with their level (1..5): its root and at most one per row (one skill point per level of the character). */
  skillLevels: Record<string, number>
  /** Skill points traded for Echoes once its tree was complete. */
  traded: number
  /** The skills it takes into battle (up to six, besides its weapon attack), in the order they are shown. */
  skills: string[]
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
