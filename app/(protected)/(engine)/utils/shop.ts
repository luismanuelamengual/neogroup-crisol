import {
  getItem,
  MAX_CONSUMABLES,
  MERCHANT_STOCK,
  SCHOLAR_STOCK,
  scholarPrice
} from '@/app/(protected)/(engine)/data/items'
import { GameState } from '@/app/(protected)/(engine)/models/GameState'
import { MerchantId } from '@/app/(protected)/(engine)/models/MerchantId'
import { WorldIndex } from '@/app/(protected)/(engine)/utils/worldMap'

/**
 * The merchants: each one sells at its point of the map, and the party has to
 * stand there. Prices never go down; runes, Tears of Oblivion and the bestiary
 * are never for sale.
 */

/** The merchant where the party stands, or null. */
export function getMerchantHere(index: WorldIndex, state: GameState): MerchantId | null {
  return index.nodes.get(state.positionNodeId)?.merchant ?? null
}

/** Whether the party can buy one more of an item here: in stock, enough gold and room to carry it. */
export function canBuyItem(index: WorldIndex, state: GameState, itemId: string): boolean {
  const merchant = getMerchantHere(index, state)
  const offer = merchant ? MERCHANT_STOCK[merchant].find((entry) => entry.itemId === itemId) : null

  if (!offer || state.gold < offer.price) {
    return false
  }

  return getItem(itemId).kind !== 'consumable' || (state.inventory[itemId] ?? 0) < MAX_CONSUMABLES
}

export function buyItem(index: WorldIndex, state: GameState, itemId: string): GameState {
  if (!canBuyItem(index, state, itemId)) {
    throw new Error(`Cannot buy ${itemId}`)
  }

  const price = MERCHANT_STOCK[getMerchantHere(index, state)!].find((entry) => entry.itemId === itemId)!.price

  return {
    ...state,
    gold: state.gold - price,
    inventory: { ...state.inventory, [itemId]: (state.inventory[itemId] ?? 0) + 1 }
  }
}

/** The Scholar's next Echo: its price, or null when there are none left this cycle. */
export function getScholarOffer(state: GameState): number | null {
  return state.scholarSold < SCHOLAR_STOCK ? scholarPrice(state.scholarSold) : null
}

/** Buys an Echo from the Scholar (it goes to the common pool). */
export function buyEcho(index: WorldIndex, state: GameState): GameState {
  const price = getScholarOffer(state)

  if (getMerchantHere(index, state) !== MerchantId.SCHOLAR || price === null || state.gold < price) {
    throw new Error('Cannot buy an Echo')
  }

  return { ...state, gold: state.gold - price, echoes: state.echoes + 1, scholarSold: state.scholarSold + 1 }
}
