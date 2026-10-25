import { CharacterId } from '@/app/(protected)/(engine)/models/CharacterId'
import { CharacterState } from '@/app/(protected)/(engine)/models/CharacterState'
import { CombatStats } from '@/app/(protected)/(engine)/models/CombatStats'

/** Attributes that grow with each level. */
type GrowingStat = 'maxHealth' | 'maxFocus' | 'defense' | 'speed' | 'attack' | 'special'

/**
 * Design of a character: its attributes at level 1, what it gains on each
 * level and its skills (the weapon attack first). For now the attributes grow
 * on their own; the attribute points and skill trees arrive in phase 5.
 */
export interface CharacterDefinition {
  id: CharacterId
  base: CombatStats
  growth: Record<GrowingStat, number>
  skills: string[]
  /** Look of its provisional art. */
  color: number
}

export const CHARACTERS: CharacterDefinition[] = [
  {
    id: CharacterId.KAEL,
    base: {
      maxHealth: 120,
      maxFocus: 40,
      defense: 18,
      speed: 100,
      attack: 20,
      special: 14,
      critChance: 0.05,
      critDamage: 1.5
    },
    growth: { maxHealth: 12, maxFocus: 2, defense: 1.6, speed: 0.6, attack: 2, special: 1.4 },
    skills: ['kael-strike', 'kael-firm-cut', 'kael-flame-edge', 'kael-sweep', 'kael-guard'],
    color: 0x3b82f6
  },
  {
    id: CharacterId.SERA,
    base: {
      maxHealth: 90,
      maxFocus: 45,
      defense: 12,
      speed: 122,
      attack: 19,
      special: 15,
      critChance: 0.12,
      critDamage: 1.75
    },
    growth: { maxHealth: 9, maxFocus: 2.2, defense: 1.2, speed: 0.8, attack: 1.9, special: 1.4 },
    skills: ['sera-shot', 'sera-piercing-arrow', 'sera-volley', 'sera-blinding-arrow'],
    color: 0x22c55e
  },
  {
    id: CharacterId.BRANN,
    base: {
      maxHealth: 160,
      maxFocus: 30,
      defense: 24,
      speed: 84,
      attack: 26,
      special: 8,
      critChance: 0.06,
      critDamage: 1.6
    },
    growth: { maxHealth: 16, maxFocus: 1.5, defense: 2.2, speed: 0.4, attack: 2.6, special: 0.8 },
    skills: ['brann-chop', 'brann-cleave', 'brann-earthsplitter', 'brann-roar'],
    color: 0xb45309
  },
  {
    id: CharacterId.OREN,
    base: {
      maxHealth: 110,
      maxFocus: 60,
      defense: 18,
      speed: 100,
      attack: 12,
      special: 18,
      critChance: 0.05,
      critDamage: 1.5
    },
    growth: { maxHealth: 11, maxFocus: 3, defense: 1.6, speed: 0.6, attack: 1.1, special: 1.8 },
    skills: ['oren-staff', 'oren-mend', 'oren-grove', 'oren-thorns'],
    color: 0x84cc16
  },
  {
    id: CharacterId.YSOLDE,
    base: {
      maxHealth: 75,
      maxFocus: 60,
      defense: 10,
      speed: 106,
      attack: 10,
      special: 28,
      critChance: 0.08,
      critDamage: 1.6
    },
    growth: { maxHealth: 7, maxFocus: 3, defense: 1, speed: 0.7, attack: 0.9, special: 2.8 },
    skills: ['ysolde-rod', 'ysolde-fireball', 'ysolde-frost-lance', 'ysolde-chain-lightning'],
    color: 0xa855f7
  }
]

export function getCharacterDefinition(id: CharacterId): CharacterDefinition {
  return CHARACTERS.find((definition) => definition.id === id)!
}

/** Attributes of a character at its level. */
export function getCharacterStats(character: Pick<CharacterState, 'id' | 'level'>): CombatStats {
  const { base, growth } = getCharacterDefinition(character.id)
  const levels = character.level - 1
  const grow = (stat: GrowingStat) => Math.round(base[stat] + growth[stat] * levels)

  return {
    maxHealth: grow('maxHealth'),
    maxFocus: grow('maxFocus'),
    defense: grow('defense'),
    speed: grow('speed'),
    attack: grow('attack'),
    special: grow('special'),
    critChance: base.critChance,
    critDamage: base.critDamage
  }
}

/** Maximum health of a character at its level. */
export function getMaxHealth(character: Pick<CharacterState, 'id' | 'level'>): number {
  return getCharacterStats(character).maxHealth
}
