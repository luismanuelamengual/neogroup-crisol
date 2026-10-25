import { CharacterId } from '@/app/(protected)/(engine)/models/CharacterId'
import { CharacterState } from '@/app/(protected)/(engine)/models/CharacterState'

/** Design of a character. For now only its health: the other attributes arrive with the combat and the progression. */
export interface CharacterDefinition {
  id: CharacterId
  /** Health at level 1. */
  baseHealth: number
  /** Health gained on each level up. */
  healthPerLevel: number
}

export const CHARACTERS: CharacterDefinition[] = [
  { id: CharacterId.KAEL, baseHealth: 120, healthPerLevel: 12 },
  { id: CharacterId.SERA, baseHealth: 90, healthPerLevel: 9 },
  { id: CharacterId.BRANN, baseHealth: 160, healthPerLevel: 16 },
  { id: CharacterId.OREN, baseHealth: 110, healthPerLevel: 11 },
  { id: CharacterId.YSOLDE, baseHealth: 75, healthPerLevel: 7 }
]

export function getCharacterDefinition(id: CharacterId): CharacterDefinition {
  return CHARACTERS.find((definition) => definition.id === id)!
}

/** Maximum health of a character at its level. */
export function getMaxHealth(character: Pick<CharacterState, 'id' | 'level'>): number {
  const definition = getCharacterDefinition(character.id)

  return definition.baseHealth + definition.healthPerLevel * (character.level - 1)
}
