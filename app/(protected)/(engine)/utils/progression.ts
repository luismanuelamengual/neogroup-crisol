import { CharacterState } from '@/app/(protected)/(engine)/models/CharacterState'
import { getMaxHealth } from '@/app/(protected)/(engine)/utils/heroes'

/**
 * Experience and levels (no level cap). Each level grows the attributes a
 * bit on its own and gives an attribute point, a skill point and an Echo for
 * the common pool (see utils/heroes.ts).
 */

/** Experience needed to go from a level to the next one: it always grows, but never stops. */
export function xpToNextLevel(level: number): number {
  return Math.round(18 * Math.pow(level, 1.5))
}

/** A character gains experience: it can go up several levels, and gains the health of each one. */
export function gainExperience(character: CharacterState, xp: number): CharacterState {
  let { level } = character
  let pending = character.xp + xp

  while (pending >= xpToNextLevel(level)) {
    pending -= xpToNextLevel(level)
    level++
  }

  const gainedHealth = getMaxHealth({ ...character, level }) - getMaxHealth(character)

  return { ...character, level, xp: pending, health: character.health + gainedHealth }
}

/** Loses a share of the experience gathered in the current level (it never goes down a level). */
export function loseExperience(character: CharacterState, share: number): CharacterState {
  return { ...character, xp: character.xp - Math.floor(character.xp * share) }
}
