import { Biome } from '@/app/(protected)/(engine)/models/Biome'
import { BossKind } from '@/app/(protected)/(engine)/models/BossKind'
import { CharacterId } from '@/app/(protected)/(engine)/models/CharacterId'
import { MerchantId } from '@/app/(protected)/(engine)/models/MerchantId'
import { NodeType } from '@/app/(protected)/(engine)/models/NodeType'
import { RuneTier } from '@/app/(protected)/(engine)/models/RuneTier'

/** A point of the world map. Only the fields of its type are set. */
export interface WorldNode {
  id: string
  /** Position in world pixels. */
  x: number
  y: number
  biome: Biome
  type: NodeType
  /** Level of its enemies in the first cycle (none for the safe points). */
  level?: number
  /** CAMP_BOSS: the kind of boss and its id (e.g. 'morgrath', 'forest-miniboss-2'). */
  bossKind?: BossKind
  bossId?: string
  /** CAMP_BOSS of kind CAPTOR: the character it holds. */
  captive?: CharacterId
  /** SANCTUARY: the rune (1..60, ordered by power) and whether a mini boss guards it (an elite fight otherwise). */
  runeIndex?: number
  runeTier?: RuneTier
  guardian?: boolean
  /** RELIQUARY: the weapon it keeps (data/weapons.ts). */
  weaponId?: string
  /** MERCHANT. */
  merchant?: MerchantId
}
