import { DamageType } from '@/app/(protected)/(engine)/models/DamageType'
import { StatusType } from '@/app/(protected)/(engine)/models/StatusType'
import { TargetType } from '@/app/(protected)/(engine)/models/TargetType'

/** A status a skill can apply. */
export interface SkillStatus {
  type: StatusType
  /** 0..1. */
  chance: number
  turns: number
  /** On the targets (default) or on the user. */
  onSelf?: boolean
}

/** An action of a fighter: its weapon attack or a special. */
export interface Skill {
  id: string
  /** Focus it spends (0 for the weapon attack). */
  cost: number
  target: TargetType
  /** Multiplier of the power; 0 for skills that only apply statuses. */
  power: number
  /** Attribute that gives the power. */
  stat: 'attack' | 'special'
  damageType: DamageType
  /** Heals instead of hurting (allies). */
  heal?: boolean
  statuses?: SkillStatus[]
  /** Extra chance of a critical hit, 0..1. */
  critBonus?: number
  /** Removes the harmful statuses of its targets. */
  cure?: boolean
  /** Brings back a fallen ally (its heal is the health it comes back with). */
  revive?: boolean
  /** Switches the stance of its user (Kael). */
  stance?: boolean
  /** Spends the fury (Brann) or the elemental charges (Ysolde) of its user for more power. */
  consumes?: 'fury' | 'charges'
}
