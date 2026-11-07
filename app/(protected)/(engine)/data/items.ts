import { Biome } from '@/app/(protected)/(engine)/models/Biome'
import { DamageType } from '@/app/(protected)/(engine)/models/DamageType'
import { Item, StoneId } from '@/app/(protected)/(engine)/models/Item'
import { MerchantId } from '@/app/(protected)/(engine)/models/MerchantId'
import { StatusType } from '@/app/(protected)/(engine)/models/StatusType'

/**
 * Items, merchants and drops. Gold is scarce and prices never go down, but the
 * basic health and focus potions are cheap and drop often after a victory.
 */

/** Most units of each consumable the party can carry (stones have no limit). */
export const MAX_CONSUMABLES = 5

/** The basic potions: the party carries more of them and they drop after each victory (see VICTORY_POTION_CHANCES). */
export const BASIC_POTIONS = ['health-potion', 'focus-potion']
export const MAX_BASIC_POTIONS = 10

/**
 * Chance that a victory leaves one of each basic potion, by how many of it the
 * party carries (the last one counts for any number above, up to the maximum).
 */
export const VICTORY_POTION_CHANCES = [0.5, 0.3, 0.2, 0.1]

/** Chance that a victory leaves a basic potion when the party carries `owned` of it. */
export function victoryPotionChance(owned: number): number {
  if (owned >= MAX_BASIC_POTIONS) {
    return 0
  }

  return VICTORY_POTION_CHANCES[Math.min(owned, VICTORY_POTION_CHANCES.length - 1)]
}

export const ITEMS: Item[] = [
  { id: 'health-potion', kind: 'consumable', target: 'ally', heal: 0.35 },
  { id: 'focus-potion', kind: 'consumable', target: 'ally', focus: 0.5 },
  { id: 'antidote', kind: 'consumable', target: 'ally', cure: true },
  { id: 'fire-bomb', kind: 'consumable', target: 'allEnemies', power: 0.9, damageType: DamageType.FIRE },
  { id: 'greater-health-potion', kind: 'consumable', target: 'ally', heal: 0.7 },
  { id: 'greater-focus-potion', kind: 'consumable', target: 'ally', focus: 1 },
  { id: 'revive-potion', kind: 'consumable', target: 'fallenAlly', heal: 0.4 },
  {
    id: 'frost-bomb',
    kind: 'consumable',
    target: 'allEnemies',
    power: 0.9,
    damageType: DamageType.ICE,
    status: { type: StatusType.FREEZE, chance: 0.25, turns: 1 }
  },
  { id: 'elixir', kind: 'consumable', target: 'allAllies', heal: 1, focus: 1, cure: true },
  { id: StoneId.ROUGH, kind: 'stone' },
  { id: StoneId.TEMPERED, kind: 'stone' },
  { id: StoneId.ARCANE, kind: 'stone' },
  { id: StoneId.ABYSSAL, kind: 'stone' }
]

const ITEMS_BY_ID = new Map(ITEMS.map((item) => [item.id, item]))

export function getItem(id: string): Item {
  const item = ITEMS_BY_ID.get(id)

  if (!item) {
    throw new Error(`Unknown item ${id}`)
  }

  return item
}

/** Most units of an item the party can carry (Infinity for stones). */
export function maxCarried(itemId: string): number {
  if (getItem(itemId).kind !== 'consumable') {
    return Infinity
  }

  return BASIC_POTIONS.includes(itemId) ? MAX_BASIC_POTIONS : MAX_CONSUMABLES
}

/** What each merchant sells and its price. The Scholar sells Echoes (see SCHOLAR_*). */
export const MERCHANT_STOCK: Record<MerchantId, { itemId: string; price: number }[]> = {
  [MerchantId.PEDDLER]: [
    { itemId: 'health-potion', price: 125 },
    { itemId: 'focus-potion', price: 100 },
    { itemId: 'antidote', price: 120 },
    { itemId: 'fire-bomb', price: 180 }
  ],
  [MerchantId.ALCHEMIST]: [
    { itemId: 'health-potion', price: 125 },
    { itemId: 'greater-health-potion', price: 700 },
    { itemId: 'greater-focus-potion', price: 550 },
    { itemId: 'revive-potion', price: 900 },
    { itemId: 'frost-bomb', price: 400 }
  ],
  [MerchantId.SMITH]: [
    { itemId: StoneId.ROUGH, price: 300 },
    { itemId: StoneId.TEMPERED, price: 900 },
    { itemId: StoneId.ARCANE, price: 2500 }
  ],
  [MerchantId.SCHOLAR]: [],
  [MerchantId.THRESHOLD]: [
    { itemId: 'greater-health-potion', price: 1000 },
    { itemId: 'revive-potion', price: 1300 },
    { itemId: 'elixir', price: 4000 },
    { itemId: StoneId.ARCANE, price: 3500 },
    { itemId: StoneId.ABYSSAL, price: 6000 }
  ]
}

/** The Scholar sells a few Echoes per cycle, each one dearer than the previous one. */
export const SCHOLAR_STOCK = 3
export const SCHOLAR_BASE_PRICE = 3000
export const SCHOLAR_PRICE_STEP = 2000

export function scholarPrice(sold: number): number {
  return SCHOLAR_BASE_PRICE + SCHOLAR_PRICE_STEP * sold
}

/** The stone that drops in each biome. */
export const BIOME_STONE: Record<Biome, StoneId> = {
  [Biome.MEADOWS]: StoneId.ROUGH,
  [Biome.FOREST]: StoneId.ROUGH,
  [Biome.TROPICAL]: StoneId.TEMPERED,
  [Biome.DESERT]: StoneId.TEMPERED,
  [Biome.MOUNTAINS]: StoneId.TEMPERED,
  [Biome.SNOW]: StoneId.ARCANE,
  [Biome.VOLCANIC]: StoneId.ARCANE,
  [Biome.WASTELANDS]: StoneId.ARCANE,
  [Biome.ABYSS]: StoneId.ABYSSAL
}

/**
 * The potions of each biome: the basic ones first, the strong ones further on.
 * Enemies drop the ones that are not BASIC_POTIONS (those drop after each victory).
 */
export const BIOME_POTIONS: Record<Biome, string[]> = {
  [Biome.MEADOWS]: ['health-potion', 'antidote'],
  [Biome.FOREST]: ['health-potion', 'antidote', 'focus-potion'],
  [Biome.DESERT]: ['health-potion', 'focus-potion', 'antidote'],
  [Biome.TROPICAL]: ['health-potion', 'focus-potion', 'fire-bomb'],
  [Biome.MOUNTAINS]: ['greater-health-potion', 'focus-potion', 'fire-bomb'],
  [Biome.SNOW]: ['greater-health-potion', 'greater-focus-potion', 'frost-bomb'],
  [Biome.VOLCANIC]: ['greater-health-potion', 'greater-focus-potion', 'revive-potion'],
  [Biome.WASTELANDS]: ['greater-health-potion', 'revive-potion', 'frost-bomb'],
  [Biome.ABYSS]: ['greater-health-potion', 'revive-potion', 'elixir']
}

/** Chances of a drop from each enemy defeated (bosses always drop stones). */
export const DROP_CHANCE = {
  stone: 0.06,
  eliteStone: 0.3,
  /** Rough stones (the first biomes) drop less: the early upgrades take time. */
  roughStone: 0.025,
  eliteRoughStone: 0.12,
  potion: 0.04,
  elitePotion: 0.15,
  echo: 0.005
}
/** Stones a boss drops (times its health bars). */
export const BOSS_STONES = 2
