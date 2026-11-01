import { CharacterId } from '@/app/(protected)/(engine)/models/CharacterId'

/**
 * Experience the party lost in its last defeat, left at the point where it
 * fell: winning the fight there gives it back to each character.
 */
export interface LostXp {
  /** The point whose enemies defeated the party. */
  nodeId: string
  /** What each character lost (only those that lost something). */
  xp: Partial<Record<CharacterId, number>>
}
