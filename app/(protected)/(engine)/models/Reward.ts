import { CharacterId } from '@/app/(protected)/(engine)/models/CharacterId'
import { RuneTier } from '@/app/(protected)/(engine)/models/RuneTier'

/** Something the party gained at a point of the map, to tell the player. */
export type Reward =
  | { type: 'camp'; nodeId: string }
  | { type: 'character'; characterId: CharacterId; level: number }
  | { type: 'flaskCharge'; maxCharges: number }
  | { type: 'flaskPotency'; potency: number }
  | { type: 'rune'; runeIndex: number; tier: RuneTier }
  | { type: 'tear' }
  | { type: 'gold'; amount: number }
  | { type: 'abyssOpen' }
  | { type: 'crisolDefeated' }
