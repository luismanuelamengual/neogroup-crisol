import { BonusesPart } from '@/app/(protected)/(engine)/models/Bonuses'
import { CharacterId } from '@/app/(protected)/(engine)/models/CharacterId'

/**
 * A node of the skill tree of a character (its name is in i18n,
 * talents.<id>, except for the specials, named after their skill). It gives a
 * new special, a passive or an upgrade of a special.
 */
export interface Talent {
  id: string
  characterId: CharacterId
  /** Branch of the tree, 0..2. */
  branch: number
  /** Skill points it costs, 1..5. */
  cost: number
  /** Talent that must be bought first. */
  requires?: string
  /** A new special. */
  skillId?: string
  /** Passives and upgrades of specials. */
  bonuses?: BonusesPart
}
