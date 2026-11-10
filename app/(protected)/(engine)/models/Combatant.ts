import { Affinity } from '@/app/(protected)/(engine)/models/Affinity'
import { Bonuses } from '@/app/(protected)/(engine)/models/Bonuses'
import { CharacterId } from '@/app/(protected)/(engine)/models/CharacterId'
import { CombatStats } from '@/app/(protected)/(engine)/models/CombatStats'
import { DamageType } from '@/app/(protected)/(engine)/models/DamageType'
import { StatusType } from '@/app/(protected)/(engine)/models/StatusType'
import { Trait } from '@/app/(protected)/(engine)/models/Trait'

export interface ActiveStatus {
  type: StatusType
  /** Turns of its bearer left. */
  turns: number
  /** Damage over time: multiplier of its damage (the runes of whoever left it). */
  power?: number
}

/** What the runes of a hero keep count of during a battle (see Perk). */
export interface RuneState {
  /** Turns of its own begun, hits dealt and specials used. */
  turns: number
  hits: number
  specials: number
  /** Specials in a row, without a weapon attack in between. */
  streak: number
  /** It dealt a hit / took a hit / took any damage since its last turn. */
  struck: boolean
  hurt: boolean
  damagedSinceTurn: boolean
  /** Its last hit was critical (and the next one is not yet). */
  afterCrit: boolean
  /** The once per battle effects already used. */
  survived: boolean
  rose: boolean
  sos: boolean
  /** The once per turn effects already used. */
  critFocus: boolean
  statusFocus: boolean
  eclipse: boolean
  /** It acts again right after this turn / this turn is such an extra one. */
  bonus: boolean
  inBonus: boolean
  actAgain: boolean
}

/** A fighter in a battle. */
export interface Combatant {
  id: string
  side: 'hero' | 'enemy'
  /** Heroes. */
  characterId?: CharacterId
  /** Heroes: the weapon they hold (it shows in their figure). */
  weaponId?: string
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
  /** Heroes: their own mechanic and its state. */
  trait?: Trait
  stance?: 'offense' | 'defense'
  /** Sera: marks on each enemy, by id. */
  marks?: Record<string, number>
  /** Brann: 0..100. */
  fury?: number
  /** Ysolde: the elements charged. */
  charges?: DamageType[]
  /** Heroes: what their runes keep count of, and a barrier that stops the next hit. */
  runeState?: RuneState
  barrier?: boolean
}
