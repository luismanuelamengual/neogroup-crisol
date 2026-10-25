import { DamageType } from '@/app/(protected)/(engine)/models/DamageType'
import { StatusType } from '@/app/(protected)/(engine)/models/StatusType'

/** A smithing stone: what upgrades the weapons (names in i18n, items.<id>). */
export enum StoneId {
  ROUGH = 'rough-stone',
  TEMPERED = 'tempered-stone',
  ARCANE = 'arcane-stone',
  ABYSSAL = 'abyssal-stone'
}

/** Who a potion or a bomb is used on. */
export type ItemTarget = 'ally' | 'allAllies' | 'fallenAlly' | 'allEnemies'

/** Something of the inventory (name in i18n, items.<id>): a combat consumable or a smithing stone. */
export interface Item {
  id: string
  kind: 'consumable' | 'stone'
  /** Consumables: who it is used on in battle and what it does. */
  target?: ItemTarget
  /** Share of the maximum health it heals (or brings back, for the fallen). */
  heal?: number
  /** Share of the maximum focus it restores. */
  focus?: number
  /** Removes the harmful statuses. */
  cure?: boolean
  /** Bombs: power on the attack of the hero that throws it, and its element. */
  power?: number
  damageType?: DamageType
  status?: { type: StatusType; chance: number; turns: number }
}
