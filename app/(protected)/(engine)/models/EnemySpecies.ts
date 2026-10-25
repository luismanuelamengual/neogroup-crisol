import { Affinity } from '@/app/(protected)/(engine)/models/Affinity'
import { Archetype } from '@/app/(protected)/(engine)/models/Archetype'
import { Biome } from '@/app/(protected)/(engine)/models/Biome'
import { DamageType } from '@/app/(protected)/(engine)/models/DamageType'

/** A kind of enemy (its name is in i18n, enemies.<id>). Bosses are species too. */
export interface EnemySpecies {
  id: string
  biome: Biome
  archetype: Archetype
  /** Skills it can use (see data/skills.ts); the first one is its basic attack. */
  skills: string[]
  /** Reactions that are not normal. */
  affinities: Partial<Record<DamageType, Affinity>>
  /** Multiplier of the attributes of its archetype (bosses are much stronger). */
  strength: number
  /** Health bars (bosses): when one empties, the next one fills and the boss grows stronger. */
  bars: number
  /** Look of its provisional art. */
  color: number
  size: number
}
