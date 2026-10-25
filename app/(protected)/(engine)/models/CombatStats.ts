/** Attributes of a fighter (hero or enemy) at its level. */
export interface CombatStats {
  maxHealth: number
  /** Focus (concentración): spent by the specials, partly recovered at the start of each turn. */
  maxFocus: number
  defense: number
  /** Fills the initiative bar: twice as fast, twice as many turns. */
  speed: number
  /** Power of the weapon attacks and the physical specials. */
  attack: number
  /** Power of the magic specials and the heals. */
  special: number
  /** Chance of a critical hit, 0..1. */
  critChance: number
  /** Multiplier of a critical hit. */
  critDamage: number
}
