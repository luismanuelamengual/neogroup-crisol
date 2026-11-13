import { Biome } from '@/app/(protected)/(engine)/models/Biome'
import { DamageType } from '@/app/(protected)/(engine)/models/DamageType'
import { Item, ItemBuff, StoneId } from '@/app/(protected)/(engine)/models/Item'
import { MerchantId } from '@/app/(protected)/(engine)/models/MerchantId'
import { StatusType } from '@/app/(protected)/(engine)/models/StatusType'

/**
 * Items, merchants and drops. Gold is scarce and prices never go down, but the
 * basic health and focus potions are cheap, and any enemy can leave them (a
 * little more often than some food).
 */

/** Most units of each consumable the party can carry (stones have no limit). */
export const MAX_CONSUMABLES = 5

/** The basic potions: the party carries more of them and any enemy can leave them (see BASIC_POTION_CHANCE). */
export const BASIC_POTIONS = ['health-potion', 'focus-potion']
export const MAX_BASIC_POTIONS = 10

/**
 * Chance that each enemy defeated leaves each basic potion (elites and bosses
 * more), none once the party carries the maximum. A little above the chance
 * of leaving some food (DROP_CHANCE.item shared among the BIOME_DROPS).
 */
export const BASIC_POTION_CHANCE = { normal: 0.05, elite: 0.15 }

const { SLASH, PIERCE, BLUNT, FIRE, ICE, LIGHTNING, EARTH, LIGHT, DARKNESS } = DamageType

/** A status a consumable leaves on its allies, for some turns. */
function buff(type: StatusType, turns: number): ItemBuff {
  return { type, turns }
}

/** A status a thrown weapon or a bomb can leave on the enemies. */
function hex(type: StatusType, chance: number, turns: number): Item['status'] {
  return { type, chance, turns }
}

/** The oils: the weapon attacks of an ally hit with an element for some turns (see IMBUES in utils/battle.ts). */
const OIL_TURNS = 4

export const ITEMS: Item[] = [
  // Potions.
  { id: 'health-potion', kind: 'consumable', category: 'potion', target: 'ally', heal: 0.35 },
  { id: 'focus-potion', kind: 'consumable', category: 'potion', target: 'ally', focus: 0.5 },
  { id: 'antidote', kind: 'consumable', category: 'potion', target: 'ally', cure: true },
  { id: 'greater-health-potion', kind: 'consumable', category: 'potion', target: 'ally', heal: 0.7 },
  { id: 'greater-focus-potion', kind: 'consumable', category: 'potion', target: 'ally', focus: 1 },
  { id: 'revive-potion', kind: 'consumable', category: 'potion', target: 'fallenAlly', heal: 0.4 },
  { id: 'elixir', kind: 'consumable', category: 'potion', target: 'allAllies', heal: 1, focus: 1, cure: true },
  // Food: a little health or focus, some of it over the next turns.
  { id: 'crusty-bread', kind: 'consumable', category: 'food', target: 'ally', heal: 0.2 },
  { id: 'red-apple', kind: 'consumable', category: 'food', target: 'ally', heal: 0.12, focus: 0.15 },
  {
    id: 'wild-berries',
    kind: 'consumable',
    category: 'food',
    target: 'ally',
    heal: 0.08,
    buffs: [buff(StatusType.REGEN, 3)]
  },
  { id: 'honey-cake', kind: 'consumable', category: 'food', target: 'ally', focus: 0.35 },
  {
    id: 'mushroom-skewer',
    kind: 'consumable',
    category: 'food',
    target: 'ally',
    heal: 0.15,
    buffs: [buff(StatusType.REGEN, 3)]
  },
  { id: 'roast-meat', kind: 'consumable', category: 'food', target: 'ally', heal: 0.4 },
  { id: 'fish-stew', kind: 'consumable', category: 'food', target: 'ally', heal: 0.3, focus: 0.2 },
  {
    id: 'spicy-sausage',
    kind: 'consumable',
    category: 'food',
    target: 'ally',
    heal: 0.2,
    buffs: [buff(StatusType.ATTACK_UP, 2)]
  },
  {
    id: 'traveler-feast',
    kind: 'consumable',
    category: 'food',
    target: 'allAllies',
    heal: 0.25,
    buffs: [buff(StatusType.REGEN, 3)]
  },
  { id: 'golden-pear', kind: 'consumable', category: 'food', target: 'ally', heal: 0.5, focus: 0.5 },
  // Tonics: an attribute goes up for some turns.
  { id: 'might-tonic', kind: 'consumable', category: 'tonic', target: 'ally', buffs: [buff(StatusType.ATTACK_UP, 3)] },
  { id: 'iron-tonic', kind: 'consumable', category: 'tonic', target: 'ally', buffs: [buff(StatusType.DEFENSE_UP, 3)] },
  { id: 'swift-tonic', kind: 'consumable', category: 'tonic', target: 'ally', buffs: [buff(StatusType.SPEED_UP, 3)] },
  { id: 'keen-tonic', kind: 'consumable', category: 'tonic', target: 'ally', buffs: [buff(StatusType.CRIT_UP, 3)] },
  { id: 'troll-blood', kind: 'consumable', category: 'tonic', target: 'ally', buffs: [buff(StatusType.REGEN, 4)] },
  {
    id: 'giant-draught',
    kind: 'consumable',
    category: 'tonic',
    target: 'ally',
    buffs: [buff(StatusType.ATTACK_UP, 3), buff(StatusType.DEFENSE_UP, 3)]
  },
  {
    id: 'war-elixir',
    kind: 'consumable',
    category: 'tonic',
    target: 'allAllies',
    buffs: [buff(StatusType.ATTACK_UP, 2), buff(StatusType.SPEED_UP, 2)]
  },
  // Thrown at one enemy.
  { id: 'throwing-knife', kind: 'consumable', category: 'throwable', target: 'enemy', power: 1.2, damageType: SLASH },
  {
    id: 'serrated-knife',
    kind: 'consumable',
    category: 'throwable',
    target: 'enemy',
    power: 1,
    damageType: SLASH,
    status: hex(StatusType.BLEED, 0.6, 3)
  },
  {
    id: 'poison-dart',
    kind: 'consumable',
    category: 'throwable',
    target: 'enemy',
    power: 0.6,
    damageType: PIERCE,
    status: hex(StatusType.POISON, 0.8, 3)
  },
  {
    id: 'stun-dart',
    kind: 'consumable',
    category: 'throwable',
    target: 'enemy',
    power: 0.5,
    damageType: PIERCE,
    status: hex(StatusType.STUN, 0.45, 1)
  },
  {
    id: 'shuriken',
    kind: 'consumable',
    category: 'throwable',
    target: 'enemy',
    power: 0.55,
    hits: 3,
    damageType: SLASH
  },
  { id: 'javelin', kind: 'consumable', category: 'throwable', target: 'enemy', power: 1.8, damageType: PIERCE },
  {
    id: 'throwing-axe',
    kind: 'consumable',
    category: 'throwable',
    target: 'enemy',
    power: 1.5,
    damageType: SLASH,
    status: hex(StatusType.DEFENSE_DOWN, 0.3, 2)
  },
  {
    id: 'sling-stone',
    kind: 'consumable',
    category: 'throwable',
    target: 'enemy',
    power: 1.3,
    damageType: BLUNT,
    status: hex(StatusType.STUN, 0.15, 1)
  },
  {
    id: 'pepper-pouch',
    kind: 'consumable',
    category: 'throwable',
    target: 'enemy',
    damageType: EARTH,
    status: hex(StatusType.BLIND, 0.8, 2)
  },
  {
    id: 'flame-dagger',
    kind: 'consumable',
    category: 'throwable',
    target: 'enemy',
    power: 1.3,
    damageType: FIRE,
    status: hex(StatusType.BURN, 0.4, 2)
  },
  {
    id: 'frost-dagger',
    kind: 'consumable',
    category: 'throwable',
    target: 'enemy',
    power: 1.3,
    damageType: ICE,
    status: hex(StatusType.FREEZE, 0.2, 1)
  },
  {
    id: 'storm-kunai',
    kind: 'consumable',
    category: 'throwable',
    target: 'enemy',
    power: 1.3,
    damageType: LIGHTNING,
    status: hex(StatusType.STUN, 0.2, 1)
  },
  {
    id: 'holy-water',
    kind: 'consumable',
    category: 'throwable',
    target: 'enemy',
    power: 1.4,
    damageType: LIGHT,
    status: hex(StatusType.BLIND, 0.3, 2)
  },
  {
    id: 'shadow-needle',
    kind: 'consumable',
    category: 'throwable',
    target: 'enemy',
    power: 1.4,
    damageType: DARKNESS,
    status: hex(StatusType.ATTACK_DOWN, 0.4, 2)
  },
  // Bombs: all the enemies.
  { id: 'fire-bomb', kind: 'consumable', category: 'bomb', target: 'allEnemies', power: 0.9, damageType: FIRE },
  {
    id: 'frost-bomb',
    kind: 'consumable',
    category: 'bomb',
    target: 'allEnemies',
    power: 0.9,
    damageType: ICE,
    status: hex(StatusType.FREEZE, 0.25, 1)
  },
  {
    id: 'thunder-bomb',
    kind: 'consumable',
    category: 'bomb',
    target: 'allEnemies',
    power: 0.9,
    damageType: LIGHTNING,
    status: hex(StatusType.STUN, 0.2, 1)
  },
  {
    id: 'acid-flask',
    kind: 'consumable',
    category: 'bomb',
    target: 'allEnemies',
    power: 0.5,
    damageType: EARTH,
    status: hex(StatusType.DEFENSE_DOWN, 0.7, 3)
  },
  {
    id: 'smoke-bomb',
    kind: 'consumable',
    category: 'bomb',
    target: 'allEnemies',
    damageType: DARKNESS,
    status: hex(StatusType.BLIND, 0.6, 2)
  },
  {
    id: 'spore-bomb',
    kind: 'consumable',
    category: 'bomb',
    target: 'allEnemies',
    power: 0.4,
    damageType: EARTH,
    status: hex(StatusType.POISON, 0.7, 3)
  },
  {
    id: 'shrapnel-bomb',
    kind: 'consumable',
    category: 'bomb',
    target: 'allEnemies',
    power: 0.9,
    damageType: PIERCE,
    status: hex(StatusType.BLEED, 0.4, 3)
  },
  { id: 'radiant-orb', kind: 'consumable', category: 'bomb', target: 'allEnemies', power: 1.1, damageType: LIGHT },
  {
    id: 'void-bomb',
    kind: 'consumable',
    category: 'bomb',
    target: 'allEnemies',
    power: 1,
    damageType: DARKNESS,
    status: hex(StatusType.ATTACK_DOWN, 0.4, 2)
  },
  // Oils: they imbue the weapon of an ally.
  {
    id: 'fire-oil',
    kind: 'consumable',
    category: 'oil',
    target: 'ally',
    buffs: [buff(StatusType.IMBUE_FIRE, OIL_TURNS)]
  },
  {
    id: 'frost-oil',
    kind: 'consumable',
    category: 'oil',
    target: 'ally',
    buffs: [buff(StatusType.IMBUE_ICE, OIL_TURNS)]
  },
  {
    id: 'storm-oil',
    kind: 'consumable',
    category: 'oil',
    target: 'ally',
    buffs: [buff(StatusType.IMBUE_LIGHTNING, OIL_TURNS)]
  },
  {
    id: 'earth-oil',
    kind: 'consumable',
    category: 'oil',
    target: 'ally',
    buffs: [buff(StatusType.IMBUE_EARTH, OIL_TURNS)]
  },
  {
    id: 'holy-oil',
    kind: 'consumable',
    category: 'oil',
    target: 'ally',
    buffs: [buff(StatusType.IMBUE_LIGHT, OIL_TURNS)]
  },
  {
    id: 'shadow-oil',
    kind: 'consumable',
    category: 'oil',
    target: 'ally',
    buffs: [buff(StatusType.IMBUE_DARKNESS, OIL_TURNS)]
  },
  {
    id: 'venom-oil',
    kind: 'consumable',
    category: 'oil',
    target: 'ally',
    buffs: [buff(StatusType.IMBUE_VENOM, OIL_TURNS)]
  },
  // Wards: no harmful status reaches the ally for some turns.
  { id: 'ward-charm', kind: 'consumable', category: 'ward', target: 'ally', buffs: [buff(StatusType.WARD, 3)] },
  {
    id: 'purifying-incense',
    kind: 'consumable',
    category: 'ward',
    target: 'allAllies',
    cure: true,
    buffs: [buff(StatusType.WARD, 2)]
  },
  {
    id: 'saint-amulet',
    kind: 'consumable',
    category: 'ward',
    target: 'ally',
    cure: true,
    buffs: [buff(StatusType.WARD, 5)]
  },
  // Shields: each one stops a whole hit.
  { id: 'guard-seal', kind: 'consumable', category: 'shield', target: 'ally', shields: 1 },
  { id: 'bulwark-crystal', kind: 'consumable', category: 'shield', target: 'ally', shields: 2 },
  { id: 'aegis-relic', kind: 'consumable', category: 'shield', target: 'ally', shields: 3 },
  { id: 'shield-scroll', kind: 'consumable', category: 'shield', target: 'allAllies', shields: 1 },
  // Smithing stones.
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
    { itemId: 'crusty-bread', price: 80 },
    { itemId: 'throwing-knife', price: 150 },
    { itemId: 'fire-bomb', price: 180 },
    { itemId: 'guard-seal', price: 350 }
  ],
  [MerchantId.ALCHEMIST]: [
    { itemId: 'health-potion', price: 125 },
    { itemId: 'greater-health-potion', price: 700 },
    { itemId: 'greater-focus-potion', price: 550 },
    { itemId: 'revive-potion', price: 900 },
    { itemId: 'frost-bomb', price: 400 },
    { itemId: 'might-tonic', price: 450 },
    { itemId: 'iron-tonic', price: 450 },
    { itemId: 'swift-tonic', price: 450 },
    { itemId: 'ward-charm', price: 600 }
  ],
  [MerchantId.SMITH]: [
    { itemId: StoneId.ROUGH, price: 300 },
    { itemId: StoneId.TEMPERED, price: 900 },
    { itemId: StoneId.ARCANE, price: 2500 },
    { itemId: 'fire-oil', price: 500 },
    { itemId: 'frost-oil', price: 500 },
    { itemId: 'storm-oil', price: 500 }
  ],
  [MerchantId.SCHOLAR]: [],
  [MerchantId.THRESHOLD]: [
    { itemId: 'greater-health-potion', price: 1000 },
    { itemId: 'revive-potion', price: 1300 },
    { itemId: 'elixir', price: 4000 },
    { itemId: 'aegis-relic', price: 2500 },
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

/** The potions of each biome, for its chests: the basic ones first, the strong ones further on. */
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

/**
 * What the enemies of each biome can leave (besides its stone): food, tonics,
 * things to throw, bombs, oils, wards and shields, the stronger ones further
 * on, and the strong potions of the biome. The basic potions are not here
 * (any enemy can leave them, see BASIC_POTION_CHANCE).
 */
export const BIOME_DROPS: Record<Biome, string[]> = {
  [Biome.MEADOWS]: [
    'antidote',
    'crusty-bread',
    'red-apple',
    'wild-berries',
    'honey-cake',
    'throwing-knife',
    'poison-dart',
    'pepper-pouch',
    'sling-stone',
    'might-tonic',
    'iron-tonic',
    'venom-oil',
    'guard-seal'
  ],
  [Biome.FOREST]: [
    'antidote',
    'wild-berries',
    'mushroom-skewer',
    'honey-cake',
    'throwing-knife',
    'serrated-knife',
    'poison-dart',
    'spore-bomb',
    'swift-tonic',
    'earth-oil',
    'venom-oil',
    'ward-charm',
    'guard-seal'
  ],
  [Biome.DESERT]: [
    'antidote',
    'crusty-bread',
    'spicy-sausage',
    'shuriken',
    'throwing-axe',
    'stun-dart',
    'smoke-bomb',
    'acid-flask',
    'keen-tonic',
    'swift-tonic',
    'fire-oil',
    'earth-oil',
    'guard-seal'
  ],
  [Biome.TROPICAL]: [
    'fire-bomb',
    'fish-stew',
    'wild-berries',
    'poison-dart',
    'javelin',
    'storm-kunai',
    'spore-bomb',
    'troll-blood',
    'keen-tonic',
    'storm-oil',
    'venom-oil',
    'ward-charm',
    'bulwark-crystal'
  ],
  [Biome.MOUNTAINS]: [
    'greater-health-potion',
    'fire-bomb',
    'roast-meat',
    'honey-cake',
    'throwing-axe',
    'javelin',
    'sling-stone',
    'thunder-bomb',
    'shrapnel-bomb',
    'giant-draught',
    'iron-tonic',
    'earth-oil',
    'bulwark-crystal',
    'shield-scroll'
  ],
  [Biome.SNOW]: [
    'greater-health-potion',
    'greater-focus-potion',
    'frost-bomb',
    'fish-stew',
    'roast-meat',
    'frost-dagger',
    'shuriken',
    'thunder-bomb',
    'troll-blood',
    'keen-tonic',
    'frost-oil',
    'purifying-incense',
    'bulwark-crystal'
  ],
  [Biome.VOLCANIC]: [
    'greater-health-potion',
    'greater-focus-potion',
    'revive-potion',
    'roast-meat',
    'spicy-sausage',
    'flame-dagger',
    'shrapnel-bomb',
    'giant-draught',
    'war-elixir',
    'fire-oil',
    'purifying-incense',
    'aegis-relic',
    'shield-scroll'
  ],
  [Biome.WASTELANDS]: [
    'greater-health-potion',
    'revive-potion',
    'frost-bomb',
    'traveler-feast',
    'golden-pear',
    'shadow-needle',
    'storm-kunai',
    'acid-flask',
    'void-bomb',
    'war-elixir',
    'shadow-oil',
    'saint-amulet',
    'aegis-relic'
  ],
  [Biome.ABYSS]: [
    'greater-health-potion',
    'revive-potion',
    'elixir',
    'traveler-feast',
    'golden-pear',
    'holy-water',
    'radiant-orb',
    'void-bomb',
    'war-elixir',
    'holy-oil',
    'shadow-oil',
    'saint-amulet',
    'aegis-relic',
    'shield-scroll'
  ]
}

/** Chances of a drop from each enemy defeated (bosses always drop stones and BOSS_ITEMS). */
export const DROP_CHANCE = {
  stone: 0.06,
  eliteStone: 0.3,
  /** Rough stones (the first biomes) drop less: the early upgrades take time. */
  roughStone: 0.025,
  eliteRoughStone: 0.12,
  /** Something of BIOME_DROPS. */
  item: 0.15,
  eliteItem: 0.45,
  echo: 0.005
}
/** Stones a boss drops (times its health bars). */
export const BOSS_STONES = 2
/** Things of BIOME_DROPS a boss leaves. */
export const BOSS_ITEMS = 2
