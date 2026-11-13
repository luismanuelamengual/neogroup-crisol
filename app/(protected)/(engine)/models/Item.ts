import { DamageType } from '@/app/(protected)/(engine)/models/DamageType'
import { StatusType } from '@/app/(protected)/(engine)/models/StatusType'

/** A smithing stone: what upgrades the weapons (names in i18n, items.<id>). */
export enum StoneId {
  ROUGH = 'rough-stone',
  TEMPERED = 'tempered-stone',
  ARCANE = 'arcane-stone',
  ABYSSAL = 'abyssal-stone'
}

/** Who a consumable is used on. */
export type ItemTarget = 'ally' | 'allAllies' | 'fallenAlly' | 'enemy' | 'allEnemies'

/**
 * The family of a consumable (how the inventory groups it and how its
 * provisional icon is drawn): potions, food, tonics that raise an attribute,
 * weapons to throw at one enemy, bombs for all of them, oils that imbue the
 * weapon, wards against statuses and charms that give shields.
 */
export type ItemCategory = 'potion' | 'food' | 'tonic' | 'throwable' | 'bomb' | 'oil' | 'ward' | 'shield'

/** A status a consumable leaves on whoever it is used on (always lands, unless warded off). */
export interface ItemBuff {
  type: StatusType
  turns: number
}

/** Something of the inventory (name in i18n, items.<id>): a combat consumable or a smithing stone. */
export interface Item {
  id: string
  kind: 'consumable' | 'stone'
  category?: ItemCategory
  /** Consumables: who it is used on in battle and what it does. */
  target?: ItemTarget
  /** Share of the maximum health it heals (or brings back, for the fallen). */
  heal?: number
  /** Share of the maximum focus it restores. */
  focus?: number
  /** Removes the harmful statuses. */
  cure?: boolean
  /** Thrown ones and bombs: power on the attack of the hero that throws it, and its kind of hit. */
  power?: number
  damageType?: DamageType
  /** Thrown ones: how many times it hits (each one with all the power). */
  hits?: number
  /** A status it can leave on the enemies it reaches. */
  status?: { type: StatusType; chance: number; turns: number }
  /** Statuses it leaves on the allies it is used on (tonics, food, oils, wards). */
  buffs?: ItemBuff[]
  /** Shields it gives to the allies it is used on: each one stops a whole hit. */
  shields?: number
}
