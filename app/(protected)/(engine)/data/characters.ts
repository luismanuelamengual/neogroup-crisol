import { CharacterId } from '@/app/(protected)/(engine)/models/CharacterId'
import { CombatStats } from '@/app/(protected)/(engine)/models/CombatStats'
import { Trait } from '@/app/(protected)/(engine)/models/Trait'

/** Attributes that grow with each level. */
type GrowingStat = 'maxHealth' | 'maxFocus' | 'defense' | 'speed' | 'attack' | 'special'

/**
 * Design of a character: its attributes at level 1, what they grow on their
 * own with each level (on top of the attribute point the player spends) and
 * the skills it starts with: the weapon attack and one special. The rest come
 * from its skill tree (data/talents.ts).
 */
export interface CharacterDefinition {
  id: CharacterId
  base: CombatStats
  growth: Record<GrowingStat, number>
  skills: string[]
  /** Its own mechanic in battle. */
  trait: Trait
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
    skills: ['kael-strike', 'kael-firm-cut', 'kael-stance'],
    trait: Trait.STANCE,
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
    skills: ['sera-shot', 'sera-piercing-arrow'],
    trait: Trait.MARKS,
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
    skills: ['brann-chop', 'brann-cleave'],
    trait: Trait.FURY,
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
    skills: ['oren-staff', 'oren-mend'],
    trait: Trait.SAP,
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
    skills: ['ysolde-rod', 'ysolde-fireball'],
    trait: Trait.CHARGES,
    color: 0xa855f7
  }
]

export function getCharacterDefinition(id: CharacterId): CharacterDefinition {
  return CHARACTERS.find((definition) => definition.id === id)!
}

/** What one attribute point adds to each attribute. */
export const ATTRIBUTE_POINT: Record<keyof CombatStats, number> = {
  maxHealth: 8,
  maxFocus: 2,
  defense: 1,
  speed: 0.8,
  attack: 1,
  special: 1,
  critChance: 0.005,
  critDamage: 0.02
}

/** Attributes of a character at a level, before its points, weapon, runes and tree (see utils/heroes.ts). */
export function getBaseStats(id: CharacterId, level: number): CombatStats {
  const { base, growth } = getCharacterDefinition(id)
  const grow = (stat: GrowingStat) => base[stat] + growth[stat] * (level - 1)

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
