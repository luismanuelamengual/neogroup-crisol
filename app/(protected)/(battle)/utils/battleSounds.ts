import { SfxId } from '@/app/(protected)/(art)/data/audio'
import { BattleEvent } from '@/app/(protected)/(engine)/models/BattleEvent'
import { StatusType } from '@/app/(protected)/(engine)/models/StatusType'

const HARMFUL = [
  StatusType.POISON,
  StatusType.BURN,
  StatusType.BLEED,
  StatusType.FREEZE,
  StatusType.STUN,
  StatusType.BLIND,
  StatusType.ATTACK_DOWN,
  StatusType.DEFENSE_DOWN,
  StatusType.SPEED_DOWN
]

/** The sound effects of a battle event (none, one, or a hit and the hero's pain). */
export function soundOf(event: BattleEvent, side: 'hero' | 'enemy' | null): SfxId[] {
  switch (event.type) {
    case 'damage':
      return [event.critical ? 'critical' : event.damageType, ...(side === 'hero' ? (['hurt'] as const) : [])]
    case 'miss':
      return ['miss']
    case 'immune':
      return ['block']
    case 'shields':
      return [event.change < 0 ? 'block' : 'shield']
    case 'heal':
      return ['heal']
    case 'revive':
      return ['revive']
    case 'focus':
      return ['focus']
    case 'item':
      return ['flask']
    case 'skip':
      return event.status === StatusType.FREEZE ? ['ice'] : ['stun']
    case 'status':
      return event.status === StatusType.STUN ? ['stun'] : HARMFUL.includes(event.status) ? ['debuff'] : ['buff']

    case 'statusTick':
      switch (event.status) {
        case StatusType.POISON:
        case StatusType.BLEED:
          return ['poison']
        case StatusType.BURN:
          return ['fire']
        case StatusType.REGEN:
          return ['heal']
        default:
          return []
      }

    case 'stance':
      return ['stance']
    case 'fall':
      return side === 'enemy' ? ['enemy-fall'] : ['hurt']
    case 'nextBar':
      return ['boss-bar']
    case 'phase':
      return ['phase', 'boss-roar']
    case 'end':
      return event.outcome === 'victory' ? ['victory-sting'] : event.outcome === 'defeat' ? ['defeat-sting'] : []
    default:
      return []
  }
}
