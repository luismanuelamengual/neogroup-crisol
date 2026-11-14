import { describe, expect, it } from 'vitest'
import { getBaseStats } from '@/app/(protected)/(engine)/data/characters'
import { MAX_BASIC_POTIONS, MAX_CONSUMABLES } from '@/app/(protected)/(engine)/data/items'
import { getRune, RUNE_COUNT, RUNE_MASTERY_WINS, RUNES } from '@/app/(protected)/(engine)/data/runes'
import { getSkill } from '@/app/(protected)/(engine)/data/skills'
import { getSkillNode, getSkillTree, getTreeCost, MAX_SKILL_LEVEL } from '@/app/(protected)/(engine)/data/skillTrees'
import {
  getCharacterWeapons,
  getUpgradeCost,
  getWeapon,
  getWeaponEffects,
  WEAPONS
} from '@/app/(protected)/(engine)/data/weapons'
import { CharacterId } from '@/app/(protected)/(engine)/models/CharacterId'
import { GameState } from '@/app/(protected)/(engine)/models/GameState'
import { StoneId } from '@/app/(protected)/(engine)/models/Item'
import { RuneTier } from '@/app/(protected)/(engine)/models/RuneTier'
import { createInitialGameState } from '@/app/(protected)/(engine)/utils/gameState'
import {
  addItems,
  assignEchoes,
  canLearnSkill,
  createCharacter,
  equipEcho,
  equipRune,
  equipSkill,
  equipWeapon,
  getAttributePoints,
  getCharacterSkills,
  getCharacterStats,
  getHeroBonuses,
  getKnownSkills,
  getSkillLearnState,
  getSkillPoints,
  getWeaponLevel,
  isTreeComplete,
  learnSkill,
  moveInFormation,
  SKILL_SLOTS,
  spendAttributePoint,
  spendTear,
  tradeSkillPoint,
  unequipSkill,
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

  it('learns any special joined to a learned one, paying its cost, and leaves every way open', () => {
    const kael = kaelOf(game(10))

    expect(getCharacterSkills(kael)).toEqual(['kael-strike', 'kael-firm-cut'])
    expect(getSkillLearnState(kael, 'kael-whirlwind')).toBe('far')
    expect(getSkillLearnState(kaelOf(game(1)), 'kael-guard')).toBe('points')

    const state = learnSkill(learnSkill(game(10), KAEL, 'kael-sweep'), KAEL, 'kael-guard')
    const sweep = getSkillNode(KAEL, 'kael-sweep')!.cost
    const guard = getSkillNode(KAEL, 'kael-guard')!.cost

    expect(getCharacterSkills(kaelOf(state))).toEqual(expect.arrayContaining(['kael-sweep', 'kael-guard']))
    expect(getSkillPoints(kaelOf(state))).toBe(9 - sweep - guard)
    expect(canLearnSkill(kaelOf(state), 'kael-whirlwind')).toBe(true)
    expect(canLearnSkill(kaelOf(state), 'kael-shield-bash')).toBe(true)
    expect(() => learnSkill(state, KAEL, 'sera-volley')).toThrow()
  })

  it('takes each special up to level 5, paying as many points as the level', () => {
    let state = learnSkill(game(30), KAEL, 'kael-firm-cut')

    expect(kaelOf(state).skillLevels['kael-firm-cut']).toBe(2)
    expect(getSkillPoints(kaelOf(state))).toBe(29 - 2)

    state = learnSkill(
      learnSkill(learnSkill(state, KAEL, 'kael-firm-cut'), KAEL, 'kael-firm-cut'),
      KAEL,
      'kael-firm-cut'
    )

    expect(kaelOf(state).skillLevels['kael-firm-cut']).toBe(MAX_SKILL_LEVEL)
    expect(getSkillPoints(kaelOf(state))).toBe(29 - 2 - 3 - 4 - 5)
    expect(getSkillLearnState(kaelOf(state), 'kael-firm-cut')).toBe('max')
  })

  it('makes the levels stronger, cheaper and longer lasting', () => {
    const kael = { ...kaelOf(game(30)), skillLevels: { 'kael-firm-cut': 5, 'kael-guard': 4 } }
    const bonuses = getHeroBonuses(kael)

    expect(bonuses.upgrades['kael-firm-cut']).toEqual({ power: 1, cost: 4, statusChance: 0, turns: 0 })
    expect(bonuses.upgrades['kael-guard']).toMatchObject({ power: 0, turns: 1 })
    expect(getHeroBonuses(kaelOf(game(30))).upgrades).toEqual({})
  })

  it('takes up to six skills into battle, besides the weapon attack', () => {
    const levels = Object.fromEntries(getSkillTree(KAEL).nodes.map((node) => [node.skillId, 1]))
    const veteran = { ...createCharacter(KAEL, 60), skillLevels: levels, skills: [] }
    let state: GameState = { ...game(1), characters: [veteran] }
    const known = getKnownSkills(veteran)

    expect(known.length).toBeGreaterThan(SKILL_SLOTS)

    for (const skill of known.slice(0, SKILL_SLOTS)) {
      state = equipSkill(state, KAEL, skill)
    }

    expect(getCharacterSkills(kaelOf(state))).toEqual(['kael-strike', ...known.slice(0, SKILL_SLOTS)])
    expect(() => equipSkill(state, KAEL, known[SKILL_SLOTS])).toThrow()
    expect(() => equipSkill(state, KAEL, 'sera-volley')).toThrow()

    state = equipSkill(unequipSkill(state, KAEL, known[0]), KAEL, known[SKILL_SLOTS])

    expect(getCharacterSkills(kaelOf(state))).toEqual(['kael-strike', ...known.slice(1, SKILL_SLOTS + 1)])
  })

  it('puts a special just learned in a free slot, and only then', () => {
    const learned = learnSkill(game(10), KAEL, 'kael-sweep')

    expect(kaelOf(learned).skills).toEqual(['kael-firm-cut', 'kael-sweep'])
    expect(kaelOf(learnSkill(learned, KAEL, 'kael-sweep')).skills).toEqual(['kael-firm-cut', 'kael-sweep'])

    const crowded = { ...game(10), characters: [{ ...kaelOf(game(10)), skills: ['a', 'b', 'c', 'd', 'e', 'f'] }] }

    expect(kaelOf(learnSkill(crowded, KAEL, 'kael-sweep')).skills).toHaveLength(6)
  })

  it('trades skill points for Echoes of the character only with the tree complete', () => {
    expect(() => tradeSkillPoint(game(600), KAEL)).toThrow()

    const levels = Object.fromEntries(getSkillTree(KAEL).nodes.map((node) => [node.skillId, MAX_SKILL_LEVEL]))
    const complete = { ...game(600), characters: [{ ...createCharacter(KAEL, 600), skillLevels: levels }] }
    const traded = tradeSkillPoint(complete, KAEL)

    expect(isTreeComplete(kaelOf(complete))).toBe(true)
    expect(getSkillPoints(kaelOf(complete))).toBe(599 - getTreeCost(KAEL))
    expect(kaelOf(traded).echoCapacity).toBe(2)
    expect(getSkillPoints(kaelOf(traded))).toBe(599 - getTreeCost(KAEL) - 1)
  })

  it('gives every skill point back with a Tear of Oblivion', () => {
    const learned = learnSkill(learnSkill(game(10, { tears: 1 }), KAEL, 'kael-guard'), KAEL, 'kael-firm-cut')
    const wept = spendTear(learned, KAEL)

    expect(kaelOf(wept).skillLevels).toEqual({ 'kael-firm-cut': 1 })
    expect(kaelOf(wept).skills).toEqual(['kael-firm-cut'])
    expect(getSkillPoints(kaelOf(wept))).toBe(9)
    expect(wept.tears).toBe(0)
    expect(() => spendTear(learnSkill(wept, KAEL, 'kael-guard'), KAEL)).toThrow()
  })
})

describe('weapons', () => {
  it('costs more and better stones every five levels', () => {
    expect(getUpgradeCost(1)).toEqual({ stoneId: StoneId.ROUGH, stones: 2, gold: 60 })
    expect(getUpgradeCost(5)).toMatchObject({ stoneId: StoneId.ROUGH, stones: 10 })
    expect(getUpgradeCost(6)).toMatchObject({ stoneId: StoneId.TEMPERED, stones: 2 })
    expect(getUpgradeCost(20)).toMatchObject({ stoneId: StoneId.ABYSSAL, stones: 10 })
  })

  it('upgrades at a camp paying stones and gold, with an effect every five levels', () => {
    const state = game(10, { gold: 1000, inventory: { [StoneId.ROUGH]: 3 } })
    const upgraded = upgradeWeapon(state, KAEL)

    expect(getWeaponLevel(kaelOf(upgraded))).toBe(1)
    expect(upgraded.gold).toBe(940)
    expect(upgraded.inventory[StoneId.ROUGH]).toBe(2)
    expect(getCharacterStats(kaelOf(upgraded)).attack).toBeGreaterThan(getCharacterStats(kaelOf(state)).attack)
    expect(getWeaponEffects('oath-sword', 4)).toHaveLength(0)
    expect(getWeaponEffects('oath-sword', 5)).toHaveLength(1)
    expect(() => upgradeWeapon({ ...state, positionNodeId: 'elsewhere' }, KAEL)).toThrow()
    expect(() => upgradeWeapon({ ...state, gold: 0 }, KAEL)).toThrow()
  })

  it('gives every character three weapons with different attacks, two of them in reliquaries', () => {
    for (const id of Object.values(CharacterId)) {
      const weapons = getCharacterWeapons(id)
      const attacks = weapons.map((weapon) => getSkill(weapon.attack))

      expect(weapons).toHaveLength(3)
      expect(weapons[0].biome).toBeUndefined()
      expect(weapons.slice(1).every((weapon) => weapon.biome && weapon.warden)).toBe(true)
      // Different, not better: each one hits in its own way.
      expect(
        new Set(attacks.map((skill) => `${skill.damageType}:${skill.target}:${skill.stat}:${skill.power}`)).size
      ).toBe(3)
      expect(attacks.every((skill) => skill.cost === 0)).toBe(true)
    }

    expect(new Set(WEAPONS.map((weapon) => weapon.id)).size).toBe(WEAPONS.length)
  })

  it('upgrades each weapon on its own and swaps them at any cleared point', () => {
    const owned: GameState = {
      ...game(10, { gold: 1000, inventory: { [StoneId.ROUGH]: 3 } }),
      characters: [{ ...createCharacter(KAEL, 10), weapons: { 'oath-sword': 4, dawnbrand: 0 } }]
    }
    const upgraded = upgradeWeapon(owned, KAEL, 'dawnbrand')

    expect(kaelOf(upgraded).weapons).toEqual({ 'oath-sword': 4, dawnbrand: 1 })
    expect(() => upgradeWeapon(owned, KAEL, 'bulwark-mace')).toThrow()

    const away = { ...upgraded, positionNodeId: 'n1', clearedNodeIds: [...upgraded.clearedNodeIds, 'n1'] }
    const swapped = equipWeapon(away, KAEL, 'dawnbrand')

    expect(kaelOf(swapped).weaponId).toBe('dawnbrand')
    expect(getCharacterSkills(kaelOf(swapped))[0]).toBe(getWeapon('dawnbrand').attack)
    expect(getCharacterSkills(kaelOf(swapped)).slice(1)).toEqual(getCharacterSkills(kaelOf(away)).slice(1))
    expect(getWeaponLevel(kaelOf(swapped))).toBe(1)
    expect(getCharacterStats(kaelOf(swapped)).special).toBeGreaterThan(getCharacterStats(kaelOf(away)).special)
    expect(() => equipWeapon(away, KAEL, 'bulwark-mace')).toThrow()
    expect(() => equipWeapon({ ...away, positionNodeId: 'n2' }, KAEL, 'dawnbrand')).toThrow()
    expect(() => equipWeapon({ ...away, respawnedNodeIds: ['n1'] }, KAEL, 'dawnbrand')).toThrow()
  })
})

describe('runes and echoes', () => {
  it('has one rune per sanctuary with echo costs within the range of their tier', () => {
    const ranges = { lesser: [1, 8], greater: [6, 20], ancestral: [15, 35], abyssal: [30, 50] }

    expect(RUNES).toHaveLength(70)

    for (const rune of RUNES) {
      const [min, max] = ranges[rune.tier]

      expect(rune.echoCost).toBeGreaterThanOrEqual(min)
      expect(rune.echoCost).toBeLessThanOrEqual(max)
    }

    expect(getRune(1)).toMatchObject({ tier: RuneTier.LESSER, echoCost: 1 })
    expect(getRune(RUNE_COUNT)).toMatchObject({ tier: RuneTier.ABYSSAL, echoCost: 50 })
  })

  it('only raises attributes, never lowers them', () => {
    for (const rune of RUNES) {
      const shifts = Object.values(rune.stats)

      expect(shifts).toHaveLength(1)
      expect(shifts.every((share) => share! > 0)).toBe(true)
    }
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

  it('carries at most five of each consumable, ten basic potions and any number of stones', () => {
    const { state, kept } = addItems(game(5, { inventory: { antidote: 4, 'health-potion': 8 } }), {
      antidote: 3,
      'health-potion': 3,
      'focus-potion': 12,
      [StoneId.ROUGH]: 12
    })

    expect(state.inventory).toEqual({
      antidote: MAX_CONSUMABLES,
      'health-potion': MAX_BASIC_POTIONS,
      'focus-potion': MAX_BASIC_POTIONS,
      [StoneId.ROUGH]: 12
    })
    expect(kept).toEqual({ antidote: 1, 'health-potion': 2, 'focus-potion': 10, [StoneId.ROUGH]: 12 })
  })

  it('keeps the health gained with a level', () => {
    const kael = createCharacter(KAEL, 1)
    const grown = gainExperience(kael, 1000)

    expect(grown.level).toBeGreaterThan(1)
    expect(grown.health).toBe(getCharacterStats(grown).maxHealth)
  })
})
