import { SfxId } from '@/app/(protected)/(art)/data/audio'
import { BattleEvent } from '@/app/(protected)/(engine)/models/BattleEvent'
import { StatusType } from '@/app/(protected)/(engine)/models/StatusType'

const BUFFS = [StatusType.ATTACK_UP, StatusType.DEFENSE_UP, StatusType.SPEED_UP]
const DAMAGE_OVER_TIME = [StatusType.POISON, StatusType.BURN, StatusType.BLEED]

/** The sound effect of a battle event, if it has one. */
export function soundOf(event: BattleEvent, side: 'hero' | 'enemy' | null): SfxId | null {
  switch (event.type) {
    case 'damage':
      return event.critical ? 'critical' : event.damageType
    case 'miss':
      return 'miss'
    case 'immune':
      return 'block'
    case 'heal':
      return 'heal'
    case 'revive':
      return 'revive'
    case 'status':
      return BUFFS.includes(event.status) ? 'buff' : 'debuff'
    case 'statusTick':
      return DAMAGE_OVER_TIME.includes(event.status) ? 'poison' : null
    case 'stance':
      return 'stance'
    case 'fall':
      return side === 'enemy' ? 'enemy-fall' : null
    case 'nextBar':
      return 'boss-bar'
    case 'phase':
      return 'phase'
    case 'end':
      return event.outcome === 'victory' ? 'victory-sting' : event.outcome === 'defeat' ? 'defeat-sting' : null
    default:
      return null
  }
}
