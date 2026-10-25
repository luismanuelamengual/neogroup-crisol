import { DamageType } from '@/app/(protected)/(engine)/models/DamageType'
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
    }
  | { type: 'heal'; targetId: string; amount: number }
  | { type: 'miss'; targetId: string }
  | { type: 'immune'; targetId: string }
  | { type: 'statusTick'; targetId: string; status: StatusType; amount: number }
  | { type: 'status'; targetId: string; status: StatusType; turns: number }
  | { type: 'statusEnd'; targetId: string; status: StatusType }
  | { type: 'fall'; targetId: string }
  | { type: 'nextBar'; targetId: string; bars: number }
  | { type: 'phase'; phase: number; enemyIds: string[] }
  | { type: 'reserves'; heroIds: string[] }
  | { type: 'end'; outcome: 'victory' | 'defeat' | 'retreat' }
