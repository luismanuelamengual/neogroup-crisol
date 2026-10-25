import { Affinity } from '@/app/(protected)/(engine)/models/Affinity'
import { Bonuses } from '@/app/(protected)/(engine)/models/Bonuses'
import { CharacterId } from '@/app/(protected)/(engine)/models/CharacterId'
import { CombatStats } from '@/app/(protected)/(engine)/models/CombatStats'
import { DamageType } from '@/app/(protected)/(engine)/models/DamageType'
import { StatusType } from '@/app/(protected)/(engine)/models/StatusType'

export interface ActiveStatus {
  type: StatusType
  /** Turns of its bearer left. */
  turns: number
}

/** A fighter in a battle. */
export interface Combatant {
  id: string
  side: 'hero' | 'enemy'
  /** Heroes. */
  characterId?: CharacterId
  /** Enemies: their species (bosses included) and whether they are the elite variant. */
  speciesId?: string
  elite?: boolean
  level: number
  stats: CombatStats
  health: number
  focus: number
  /** 0..100: acts on reaching 100. */
  initiative: number
  statuses: ActiveStatus[]
  skills: string[]
  affinities: Partial<Record<DamageType, Affinity>>
  /** Health bars left, this one included. */
  bars: number
  /** Heroes waiting in reserve: they enter when the three active ones fall. */
  reserve: boolean
  /** Took part in the battle (earns experience). */
  fought: boolean
  /** Heroes: their passives, weapon, runes and echoes. */
  bonuses?: Bonuses
  /** Heroes: the runes they wear (they count a win towards mastering them). */
  runes?: number[]
}
