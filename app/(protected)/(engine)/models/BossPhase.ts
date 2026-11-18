import { Affinity } from '@/app/(protected)/(engine)/models/Affinity'
import { DamageType } from '@/app/(protected)/(engine)/models/DamageType'
import { StatusType } from '@/app/(protected)/(engine)/models/StatusType'

/**
 * How the rules of a boss change when one of its health bars empties (see
 * data/bossPhases.ts): the battle announces each change over it.
 */
export interface BossPhase {
  /** Reactions that change (Affinity.NORMAL takes one away); the rest stay as they were. */
  affinities?: Partial<Record<DamageType, Affinity>>
  /** It becomes immune to weapon attacks (true) or stops being so (false). */
  weaponImmune?: boolean
  /** It becomes sealed: only its weaknesses hurt it as usual (true), or stops being so (false). */
  sealed?: boolean
  /** Shields it gets. */
  shields?: number
  /** Statuses it gets (a buff, regeneration, a ward...). */
  statuses?: { type: StatusType; turns: number }[]
}

/** One change of a phase as the battle announces it. */
export type BossPhaseChange =
  | { kind: 'affinity'; damageType: DamageType; affinity: Affinity }
  | { kind: 'weaponImmune'; value: boolean }
  | { kind: 'sealed'; value: boolean }
