import { getItem } from '@/app/(protected)/(engine)/data/items'
import { Item } from '@/app/(protected)/(engine)/models/Item'

/** The families the inventory and the merchants group the items by (see inventory.tabs). */
export type ItemFamily = 'potions' | 'food' | 'throwables' | 'oils' | 'charms' | 'stones'

export const ITEM_FAMILIES: ItemFamily[] = ['potions', 'food', 'throwables', 'oils', 'charms', 'stones']

/** The family of each category of consumables. */
const CATEGORY_FAMILIES: Record<NonNullable<Item['category']>, ItemFamily> = {
  potion: 'potions',
  tonic: 'potions',
  food: 'food',
  throwable: 'throwables',
  bomb: 'throwables',
  oil: 'oils',
  ward: 'charms',
  shield: 'charms'
}

export function itemFamily(item: Item | string): ItemFamily {
  const { kind, category } = typeof item === 'string' ? getItem(item) : item

  return kind === 'stone' ? 'stones' : CATEGORY_FAMILIES[category ?? 'potion']
}
