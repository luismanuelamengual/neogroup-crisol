import { BossPhaseChange } from '@/app/(protected)/(engine)/models/BossPhase'
import { DamageType } from '@/app/(protected)/(engine)/models/DamageType'
import { EliteAffix } from '@/app/(protected)/(engine)/models/EliteAffix'
import { Perk } from '@/app/(protected)/(engine)/models/Perk'
import { Stance } from '@/app/(protected)/(engine)/models/Stance'
import { StatusType } from '@/app/(protected)/(engine)/models/StatusType'

/** What happened in a step of a battle: the scene animates them in order. */
export type BattleEvent =
  | { type: 'turn'; actorId: string }
  | { type: 'skip'; actorId: string; status: StatusType }
  | { type: 'action'; actorId: string; skillId: string; targetIds: string[] }
  | {
      type: 'damage'
      targetId: string
      amount: number
      damageType: DamageType
      critical: boolean
      weak: boolean
      resisted: boolean
      /** The target is sealed and the hit was not on a weakness: it barely scratched it. */
      sealed?: boolean
    }
  | { type: 'item'; actorId: string; itemId: string; targetIds: string[] }
  | { type: 'heal'; targetId: string; amount: number }
  | { type: 'revive'; targetId: string; amount: number }
  | { type: 'focus'; targetId: string; amount: number }
  | { type: 'miss'; targetId: string }
  /** Nothing happened to it: an immunity (`weapon`: to weapon attacks) or a ward. */
  | { type: 'immune'; targetId: string; weapon?: boolean }
  /** A trait of an elite acted (its name floats over it). */
  | { type: 'affix'; targetId: string; affix: EliteAffix }
  /** A boss changed its rules on emptying a bar (right after its `nextBar`). */
  | { type: 'bossPhase'; targetId: string; changes: BossPhaseChange[] }
  | { type: 'statusTick'; targetId: string; status: StatusType; amount: number }
  | { type: 'status'; targetId: string; status: StatusType; turns: number }
  | { type: 'statusEnd'; targetId: string; status: StatusType }
  | { type: 'stance'; targetId: string; stance: Stance }
  /** Its shields changed: `change` is how many it got (or -1, a shield that stopped a hit), `shields` how many are left. */
  | { type: 'shields'; targetId: string; change: number; shields: number }
  | { type: 'fall'; targetId: string }
  | { type: 'nextBar'; targetId: string; bars: number }
  | { type: 'phase'; phase: number; enemyIds: string[] }
  | { type: 'reserves'; heroIds: string[] }
  | { type: 'end'; outcome: 'victory' | 'defeat' | 'retreat' }
  /** The effect of a rune of a fighter acted (its name floats over it). */
  | { type: 'perk'; targetId: string; perk: Perk }
