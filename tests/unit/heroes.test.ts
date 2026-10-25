import { describe, expect, it } from 'vitest'
import { getBaseStats } from '@/app/(protected)/(engine)/data/characters'
import { MAX_CONSUMABLES } from '@/app/(protected)/(engine)/data/items'
import { getRune, RUNE_MASTERY_WINS, RUNES } from '@/app/(protected)/(engine)/data/runes'
import { getTree, getTreeCost } from '@/app/(protected)/(engine)/data/talents'
import { getUpgradeCost, getWeaponEffects } from '@/app/(protected)/(engine)/data/weapons'
import { CharacterId } from '@/app/(protected)/(engine)/models/CharacterId'
import { GameState } from '@/app/(protected)/(engine)/models/GameState'
import { StoneId } from '@/app/(protected)/(engine)/models/Item'
import { RuneTier } from '@/app/(protected)/(engine)/models/RuneTier'
import { createInitialGameState } from '@/app/(protected)/(engine)/utils/gameState'
import {
  addItems,
  assignEchoes,
  buyTalent,
  canBuyTalent,
  createCharacter,
  equipEcho,
  equipRune,
  getAttributePoints,
  getCharacterSkills,
  getCharacterStats,
  getHeroBonuses,
  getSkillPoints,
  moveInFormation,
  spendAttributePoint,
  spendTear,
  tradeSkillPoint,
  upgradeWeapon
} from '@/app/(protected)/(engine)/utils/heroes'
import { gainExperience } from '@/app/(protected)/(engine)/utils/progression'

const { KAEL, SERA, BRANN } = CharacterId

/** A game at the starting camp with Kael at a level. */
function game(level = 10, extra: Partial<GameState> = {}): GameState {
  return { ...createInitialGameState('test'), characters: [createCharacter(KAEL, level)], ...extra }
}

const kaelOf = (state: GameState) => state.characters.find((character) => character.id === KAEL)!

describe('attribute and skill points', () => {
  it('gives one of each per level gained and spends them', () => {
    const state = spendAttributePoint(game(4), KAEL, 'attack')
    const kael = kaelOf(state)

    expect(getAttributePoints(kael)).toBe(2)
    expect(getCharacterStats(kael).attack).toBe(Math.round(getBaseStats(KAEL, 4).attack + 1))
    expect(getSkillPoints(kael)).toBe(3)
  })

  it('adds the maximum health gained by a point to the current health', () => {
    const before = kaelOf(game(4))
    const after = kaelOf(spendAttributePoint(game(4), KAEL, 'maxHealth'))

    expect(after.health - before.health).toBe(8)
  })

  it('refuses to spend points that are not there', () => {
    expect(() => spendAttributePoint(game(1), KAEL, 'attack')).toThrow()
  })

  it('buys talents in the order of their branch, and a special adds its skill', () => {
    const kael = kaelOf(game(10))

    expect(canBuyTalent(kael, 'kael-sweep')).toBe(false)
    expect(getCharacterSkills(kael)).toEqual(['kael-strike', 'kael-firm-cut'])

    const state = buyTalent(buyTalent(game(10), KAEL, 'kael-sharpness'), KAEL, 'kael-sweep')

    expect(getCharacterSkills(kaelOf(state))).toContain('kael-sweep')
    expect(getSkillPoints(kaelOf(state))).toBe(9 - 1 - 2)
    expect(() => buyTalent(state, KAEL, 'kael-sweep')).toThrow()
  })

  it('trades skill points for Echoes of the character only with the tree complete', () => {
    expect(() => tradeSkillPoint(game(60), KAEL)).toThrow()

    const complete = {
      ...game(60),
      characters: [{ ...createCharacter(KAEL, 60), talents: getTree(KAEL).map((talent) => talent.id) }]
    }
    const traded = tradeSkillPoint(complete, KAEL)

    expect(getSkillPoints(kaelOf(complete))).toBe(59 - getTreeCost(KAEL))
    expect(kaelOf(traded).echoCapacity).toBe(2)
    expect(getSkillPoints(kaelOf(traded))).toBe(59 - getTreeCost(KAEL) - 1)
  })

  it('gives every skill point back with a Tear of Oblivion', () => {
    const bought = buyTalent(game(10, { tears: 1 }), KAEL, 'kael-guard')
    const wept = spendTear(bought, KAEL)

    expect(kaelOf(wept).talents).toEqual([])
    expect(getSkillPoints(kaelOf(wept))).toBe(9)
    expect(wept.tears).toBe(0)
    expect(() => spendTear(buyTalent(wept, KAEL, 'kael-guard'), KAEL)).toThrow()
  })

  it('applies the passives and upgrades of the tree', () => {
    const state = buyTalent(game(10), KAEL, 'kael-sharpness')

    expect(getCharacterStats(kaelOf(state)).attack).toBe(Math.round(getBaseStats(KAEL, 10).attack * 1.06))
    expect(
      getHeroBonuses({ ...kaelOf(state), talents: ['kael-sharpness', 'kael-sweep', 'kael-precision', 'kael-deep-cut'] })
        .upgrades['kael-firm-cut']
    ).toEqual({ power: 0.3, cost: 2, statusChance: 0 })
  })
})

describe('weapons', () => {
  it('costs more and better stones every five levels', () => {
    expect(getUpgradeCost(1)).toEqual({ stoneId: StoneId.ROUGH, stones: 1, gold: 60 })
    expect(getUpgradeCost(5)).toMatchObject({ stoneId: StoneId.ROUGH, stones: 5 })
    expect(getUpgradeCost(6)).toMatchObject({ stoneId: StoneId.TEMPERED, stones: 1 })
    expect(getUpgradeCost(20)).toMatchObject({ stoneId: StoneId.ABYSSAL, stones: 5 })
  })

  it('upgrades at a camp paying stones and gold, with an effect every five levels', () => {
    const state = game(10, { gold: 1000, inventory: { [StoneId.ROUGH]: 3 } })
    const upgraded = upgradeWeapon(state, KAEL)

    expect(kaelOf(upgraded).weapon).toBe(1)
    expect(upgraded.gold).toBe(940)
    expect(upgraded.inventory[StoneId.ROUGH]).toBe(2)
    expect(getCharacterStats(kaelOf(upgraded)).attack).toBeGreaterThan(getCharacterStats(kaelOf(state)).attack)
    expect(getWeaponEffects(KAEL, 4)).toHaveLength(0)
    expect(getWeaponEffects(KAEL, 5)).toHaveLength(1)
    expect(() => upgradeWeapon({ ...state, positionNodeId: 'elsewhere' }, KAEL)).toThrow()
    expect(() => upgradeWeapon({ ...state, gold: 0 }, KAEL)).toThrow()
  })
})

describe('runes and echoes', () => {
  it('has 60 runes with echo costs within the range of their tier', () => {
    const ranges = { lesser: [1, 8], greater: [6, 20], ancestral: [15, 35], abyssal: [30, 50] }

    expect(RUNES).toHaveLength(60)

    for (const rune of RUNES) {
      const [min, max] = ranges[rune.tier]

      expect(rune.echoCost).toBeGreaterThanOrEqual(min)
      expect(rune.echoCost).toBeLessThanOrEqual(max)
    }

    expect(getRune(1)).toMatchObject({ tier: RuneTier.LESSER, echoCost: 1 })
    expect(getRune(60)).toMatchObject({ tier: RuneTier.ABYSSAL, echoCost: 50 })
  })

  it('wears up to three runes, never the same one on two characters', () => {
    let state = game(10, { runes: [1, 2, 3, 4] })

    state = { ...state, characters: [...state.characters, createCharacter(SERA, 5)] }
    state = equipRune(equipRune(equipRune(state, KAEL, 1), KAEL, 2), KAEL, 3)

    expect(() => equipRune(state, KAEL, 4)).toThrow()
    expect(() => equipRune(state, KAEL, 5)).toThrow()

    const moved = equipRune(state, SERA, 1)

    expect(kaelOf(moved).runes).toEqual([2, 3])
    expect(moved.characters[1].runes).toEqual([1])
  })

  it('wears the echoes of mastered runes within the Echoes assigned to the character', () => {
    const rune = getRune(9)
    let state = game(10, { runes: [9], echoes: rune.echoCost + 1, runeWins: { 9: RUNE_MASTERY_WINS - 1 } })

    expect(() => equipEcho(state, KAEL, 9)).toThrow()

    state = { ...state, runeWins: { 9: RUNE_MASTERY_WINS } }

    expect(() => equipEcho(state, KAEL, 9)).toThrow()

    state = assignEchoes(state, KAEL, rune.echoCost)

    expect(state.echoes).toBe(1)
    expect(kaelOf(equipEcho(state, KAEL, 9)).echoes).toEqual([9])
    expect(() => assignEchoes(state, KAEL, 2)).toThrow()
  })
})

describe('party', () => {
  it('reorders the formation', () => {
    const state = {
      ...game(5),
      characters: [createCharacter(KAEL, 5), createCharacter(SERA, 5), createCharacter(BRANN, 5)]
    }

    expect(moveInFormation(state, BRANN, 0).characters.map((character) => character.id)).toEqual([BRANN, KAEL, SERA])
    expect(moveInFormation(state, KAEL, 9).characters.map((character) => character.id)).toEqual([SERA, BRANN, KAEL])
  })

  it('carries at most five of each consumable, and any number of stones', () => {
    const { state, kept } = addItems(
      game(5, { inventory: { 'health-potion': 4 } }),
      { 'health-potion': 3, [StoneId.ROUGH]: 12 },
      MAX_CONSUMABLES
    )

    expect(state.inventory).toEqual({ 'health-potion': 5, [StoneId.ROUGH]: 12 })
    expect(kept).toEqual({ 'health-potion': 1, [StoneId.ROUGH]: 12 })
  })

  it('keeps the health gained with a level', () => {
    const kael = createCharacter(KAEL, 1)
    const grown = gainExperience(kael, 1000)

    expect(grown.level).toBeGreaterThan(1)
    expect(grown.health).toBe(getCharacterStats(grown).maxHealth)
  })
})
