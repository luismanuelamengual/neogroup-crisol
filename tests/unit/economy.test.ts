import { describe, expect, it } from 'vitest'
import { getBestiaryLevel } from '@/app/(protected)/(engine)/data/bestiary'
import { MAX_CONSUMABLES, MERCHANT_STOCK, scholarPrice } from '@/app/(protected)/(engine)/data/items'
import { BattleState } from '@/app/(protected)/(engine)/models/BattleState'
import { Biome } from '@/app/(protected)/(engine)/models/Biome'
import { CharacterId } from '@/app/(protected)/(engine)/models/CharacterId'
import { GameState } from '@/app/(protected)/(engine)/models/GameState'
import { MerchantId } from '@/app/(protected)/(engine)/models/MerchantId'
import { NodeType } from '@/app/(protected)/(engine)/models/NodeType'
import { World } from '@/app/(protected)/(engine)/models/World'
import { createBattle } from '@/app/(protected)/(engine)/utils/battle'
import { applyBattleResult } from '@/app/(protected)/(engine)/utils/battleResult'
import { createInitialGameState } from '@/app/(protected)/(engine)/utils/gameState'
import { createCharacter } from '@/app/(protected)/(engine)/utils/heroes'
import { buyEcho, buyItem, canBuyItem } from '@/app/(protected)/(engine)/utils/shop'
import { indexWorld } from '@/app/(protected)/(engine)/utils/worldMap'
import storedWorld from '@/public/world/world.json'

const index = indexWorld(storedWorld as unknown as World)
const merchantNode = (merchant: MerchantId) =>
  index.world.nodes.find((node) => node.type === NodeType.MERCHANT && node.merchant === merchant)!
const combatNode = index.world.nodes.find((node) => node.type === NodeType.COMBAT && node.biome === Biome.MEADOWS)!
const from = index.adjacency.get(combatNode.id)![0]

/** A game standing at a common fight of the Meadows. */
function atFight(extra: Partial<GameState> = {}): GameState {
  const initial = createInitialGameState('test')

  return {
    ...initial,
    positionNodeId: combatNode.id,
    clearedNodeIds: [...initial.clearedNodeIds, from],
    characters: [{ ...createCharacter(CharacterId.KAEL, 5), runes: [3] }],
    runes: [3],
    ...extra
  }
}

/** A finished battle with Kael, from the game. */
function finished(game: GameState, outcome: BattleState['outcome'], extra: Partial<BattleState> = {}): BattleState {
  const battle = createBattle({
    heroes: game.characters,
    phases: [[{ speciesId: 'thorn-boar', level: 5 }]],
    seed: 1,
    biome: Biome.MEADOWS,
    canRetreat: true,
    items: game.inventory
  }).state

  return { ...battle, outcome, ...extra }
}

describe('battle results', () => {
  it('keeps the loot, adds a win to the runes worn and an Echo per level gained', () => {
    const game = atFight({ inventory: { 'health-potion': 4 } })
    const battle = finished(game, 'victory', {
      xp: 5000,
      kills: { 'thorn-boar': 1 },
      loot: { 'rough-stone': 2, 'health-potion': 3 },
      items: { 'health-potion': 3 },
      echoes: 1
    })
    const { state, rewards, levelUps } = applyBattleResult(index, game, battle, from)
    const levels = state.characters[0].level - 5

    expect(levelUps).toHaveLength(1)
    expect(state.echoes).toBe(levels + 1)
    expect(state.runeWins).toEqual({ 3: 1 })
    expect(state.inventory).toEqual({ 'health-potion': MAX_CONSUMABLES, 'rough-stone': 2 })
    expect(rewards).toContainEqual({ type: 'item', itemId: 'rough-stone', count: 2 })
    expect(rewards).toContainEqual({ type: 'echoes', count: 1 })
  })

  it('spends the potions used even on a defeat, and loses the loot', () => {
    const game = atFight({ inventory: { 'health-potion': 2 } })
    const battle = finished(game, 'defeat', { items: { 'health-potion': 0 }, loot: { 'rough-stone': 1 } })
    const { state } = applyBattleResult(index, game, battle, from)

    expect(state.inventory).toEqual({ 'health-potion': 0 })
    expect(state.runeWins).toEqual({})
  })

  it('shows in the bestiary every species met, even if none fell', () => {
    const game = atFight()
    const { state } = applyBattleResult(index, game, finished(game, 'retreat'), from)

    expect(state.kills).toEqual({ 'thorn-boar': 0 })
    expect(getBestiaryLevel('thorn-boar', state.kills)).toBe(0)
    expect(getBestiaryLevel('road-bandit', state.kills)).toBe(-1)
  })
})

describe('bestiary', () => {
  it('unlocks more with more kills: commons ask for many, rare species fewer, bosses for a few victories', () => {
    expect(getBestiaryLevel('thorn-boar', { 'thorn-boar': 9 })).toBe(0)
    expect(getBestiaryLevel('thorn-boar', { 'thorn-boar': 10 })).toBe(1)
    expect(getBestiaryLevel('thorn-boar', { 'thorn-boar': 150 })).toBe(3)
    expect(getBestiaryLevel('scarecrow', { scarecrow: 5 })).toBe(1)
    expect(getBestiaryLevel('giant-toad', { 'giant-toad': 15 })).toBe(2)
    expect(getBestiaryLevel('bandit-chief', { 'bandit-chief': 2 })).toBe(2)
  })
})

describe('merchants', () => {
  const peddler = merchantNode(MerchantId.PEDDLER)
  const scholar = merchantNode(MerchantId.SCHOLAR)

  it('sells its stock where it stands, while there is gold and room', () => {
    const state = { ...createInitialGameState('test'), positionNodeId: peddler.id, gold: 600 }
    const price = MERCHANT_STOCK[MerchantId.PEDDLER][0].price
    const bought = buyItem(index, state, 'health-potion')

    expect(bought.gold).toBe(600 - price)
    expect(bought.inventory['health-potion']).toBe(1)
    expect(canBuyItem(index, state, 'revive-potion')).toBe(false)
    expect(canBuyItem(index, { ...state, inventory: { 'health-potion': 5 } }, 'health-potion')).toBe(false)
    expect(canBuyItem(index, { ...state, positionNodeId: scholar.id }, 'health-potion')).toBe(false)
  })

  it('sells a few Echoes per cycle at the Scholar, each one dearer', () => {
    let state: GameState = { ...createInitialGameState('test'), positionNodeId: scholar.id, gold: 100000 }

    for (let sold = 0; sold < 3; sold++) {
      const gold = state.gold

      state = buyEcho(index, state)
      expect(gold - state.gold).toBe(scholarPrice(sold))
    }

    expect(state.echoes).toBe(3)
    expect(() => buyEcho(index, state)).toThrow()
  })
})
