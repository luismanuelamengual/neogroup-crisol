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
  | { type: 'weapon'; weaponId: string; characterId: CharacterId }
  | { type: 'gold'; amount: number }
  | { type: 'item'; itemId: string; count: number }
  | { type: 'echoes'; count: number }
  /** A shortcut opened from its deep end (see utils/shortcuts.ts). */
  | { type: 'shortcut'; fromNodeId: string; toNodeId: string }
  | { type: 'abyssOpen' }
  | { type: 'crisolDefeated' }
