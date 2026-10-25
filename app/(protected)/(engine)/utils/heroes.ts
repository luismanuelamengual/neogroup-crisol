import { ATTRIBUTE_POINT, getBaseStats, getCharacterDefinition } from '@/app/(protected)/(engine)/data/characters'
import { getItem } from '@/app/(protected)/(engine)/data/items'
import { getRune, RUNE_MASTERY_WINS, RUNE_SLOTS } from '@/app/(protected)/(engine)/data/runes'
import { getTalent, getTree } from '@/app/(protected)/(engine)/data/talents'
import {
  getUpgradeCost,
  getWeaponEffects,
  MAX_WEAPON_LEVEL,
  WEAPON_POWER_PER_LEVEL
} from '@/app/(protected)/(engine)/data/weapons'
import { addBonuses, Bonuses, emptyBonuses } from '@/app/(protected)/(engine)/models/Bonuses'
import { CharacterId } from '@/app/(protected)/(engine)/models/CharacterId'
import { CharacterState } from '@/app/(protected)/(engine)/models/CharacterState'
import { CombatStats } from '@/app/(protected)/(engine)/models/CombatStats'
import { GameState } from '@/app/(protected)/(engine)/models/GameState'

/**
 * The build of each character: attribute points, skill tree, weapon, runes
 * and echoes, and the attributes and bonuses that come out of them. Pure
 * functions: the actions return a new GameState and throw when not allowed.
 * The weapon, the runes and the echoes are changed only at an open camp.
 */

/** Echoes a skill point is traded for, once the tree of the character is complete. */
export const TRADE_ECHOES = 2
/** Attributes whose bonuses add up as points instead of shares (critical chance and damage). */
const ADDITIVE = new Set<keyof CombatStats>(['critChance', 'critDamage'])

/** A new character at a level, with full health and nothing spent. */
export function createCharacter(id: CharacterId, level = 1): CharacterState {
  const character: CharacterState = {
    id,
    level,
    xp: 0,
    health: 0,
    attributes: {},
    talents: [],
    traded: 0,
    weapon: 0,
    runes: [],
    echoCapacity: 0,
    echoes: []
  }

  return { ...character, health: getMaxHealth(character) }
}

/** The passives of its tree, the effects of its weapon, its runes (with their attribute shifts) and its echoes. */
export function getHeroBonuses(character: CharacterState): Bonuses {
  const bonuses = emptyBonuses()

  for (const id of character.talents) {
    const talent = getTalent(id)

    if (talent.bonuses) {
      addBonuses(bonuses, talent.bonuses)
    }
  }

  for (const effect of getWeaponEffects(character.id, character.weapon)) {
    addBonuses(bonuses, effect)
  }

  for (const index of character.runes) {
    const rune = getRune(index)

    addBonuses(bonuses, rune.effect)
    addBonuses(bonuses, { stats: rune.stats })
  }

  for (const index of character.echoes) {
    addBonuses(bonuses, getRune(index).effect)
  }

  return bonuses
}

/** Attributes of a character: its level, its points, its weapon and the shares of its bonuses. */
export function getCharacterStats(character: CharacterState, bonuses = getHeroBonuses(character)): CombatStats {
  const stats = getBaseStats(character.id, character.level)
  const weapon = 1 + WEAPON_POWER_PER_LEVEL * character.weapon
  const result = {} as CombatStats

  for (const stat of Object.keys(stats) as (keyof CombatStats)[]) {
    const value = stats[stat] + ATTRIBUTE_POINT[stat] * (character.attributes[stat] ?? 0)
    const share = bonuses.stats[stat] ?? 0
    const powered = stat === 'attack' || stat === 'special' ? value * weapon : value

    result[stat] = ADDITIVE.has(stat) ? powered + share : Math.max(1, Math.round(powered * (1 + share)))
  }

  result.critChance = Math.min(1, Math.round(result.critChance * 1000) / 1000)
  result.critDamage = Math.round(result.critDamage * 100) / 100

  return result
}

export function getMaxHealth(character: CharacterState): number {
  return getCharacterStats(character).maxHealth
}

/** The skills of a character: those it starts with and the specials bought in its tree. */
export function getCharacterSkills(character: CharacterState): string[] {
  const bought = getTree(character.id)
    .filter((talent) => talent.skillId && character.talents.includes(talent.id))
    .map((talent) => talent.skillId!)

  return [...getCharacterDefinition(character.id).skills, ...bought]
}

export function getAttributePoints(character: CharacterState): number {
  const spent = Object.values(character.attributes).reduce((sum, points) => sum + (points ?? 0), 0)

  return character.level - 1 - spent
}

export function getSkillPoints(character: CharacterState): number {
  const spent = character.talents.reduce((sum, id) => sum + getTalent(id).cost, 0)

  return character.level - 1 - spent - character.traded
}

export function isTreeComplete(character: CharacterState): boolean {
  return character.talents.length === getTree(character.id).length
}

/** Whether a talent can be bought now: not bought, the one it requires bought and enough points. */
export function canBuyTalent(character: CharacterState, talentId: string): boolean {
  const talent = getTalent(talentId)

  return (
    talent.characterId === character.id &&
    !character.talents.includes(talentId) &&
    (!talent.requires || character.talents.includes(talent.requires)) &&
    getSkillPoints(character) >= talent.cost
  )
}

export function isRuneMastered(state: GameState, index: number): boolean {
  return (state.runeWins[index] ?? 0) >= RUNE_MASTERY_WINS
}

/** Echoes the echoes of a character cost now. */
export function getEchoLoad(character: CharacterState): number {
  return character.echoes.reduce((sum, index) => sum + getRune(index).echoCost, 0)
}

function isAtCamp(state: GameState): boolean {
  return state.openCampIds.includes(state.positionNodeId)
}

function getCharacter(state: GameState, id: CharacterId): CharacterState {
  const character = state.characters.find((candidate) => candidate.id === id)

  if (!character) {
    throw new Error(`${id} is not in the party`)
  }

  return character
}

/** Replaces a character (keeping its health within its new maximum). */
function withCharacter(state: GameState, id: CharacterId, change: (character: CharacterState) => CharacterState) {
  return {
    ...state,
    characters: state.characters.map((character) => {
      if (character.id !== id) {
        return character
      }

      const changed = change(character)

      return { ...changed, health: Math.min(changed.health, getMaxHealth(changed)) }
    })
  }
}

function requireCamp(state: GameState): void {
  if (!isAtCamp(state)) {
    throw new Error('Only at an open camp')
  }
}

export function spendAttributePoint(state: GameState, id: CharacterId, stat: keyof CombatStats): GameState {
  if (getAttributePoints(getCharacter(state, id)) <= 0) {
    throw new Error('No attribute points left')
  }

  return withCharacter(state, id, (character) => {
    const before = getMaxHealth(character)
    const changed = {
      ...character,
      attributes: { ...character.attributes, [stat]: (character.attributes[stat] ?? 0) + 1 }
    }

    // The health gained comes filled.
    return { ...changed, health: character.health + getMaxHealth(changed) - before }
  })
}

export function buyTalent(state: GameState, id: CharacterId, talentId: string): GameState {
  if (!canBuyTalent(getCharacter(state, id), talentId)) {
    throw new Error(`${id} cannot buy ${talentId}`)
  }

  return withCharacter(state, id, (character) => ({ ...character, talents: [...character.talents, talentId] }))
}

/** Trades a free skill point for Echoes of that character (only with its tree complete). */
export function tradeSkillPoint(state: GameState, id: CharacterId): GameState {
  const character = getCharacter(state, id)

  if (!isTreeComplete(character) || getSkillPoints(character) <= 0) {
    throw new Error('Nothing to trade')
  }

  return withCharacter(state, id, (current) => ({
    ...current,
    traded: current.traded + 1,
    echoCapacity: current.echoCapacity + TRADE_ECHOES
  }))
}

/** A Tear of Oblivion gives back every skill point of a character, to spend them again. */
export function spendTear(state: GameState, id: CharacterId): GameState {
  if (state.tears <= 0 || getCharacter(state, id).talents.length === 0) {
    throw new Error('Cannot use a tear')
  }

  return { ...withCharacter(state, id, (character) => ({ ...character, talents: [] })), tears: state.tears - 1 }
}

/** Upgrades the weapon of a character one level, paying stones and gold. */
export function upgradeWeapon(state: GameState, id: CharacterId): GameState {
  requireCamp(state)

  const character = getCharacter(state, id)

  if (character.weapon >= MAX_WEAPON_LEVEL) {
    throw new Error('The weapon is at its best')
  }

  const cost = getUpgradeCost(character.weapon + 1)

  if ((state.inventory[cost.stoneId] ?? 0) < cost.stones || state.gold < cost.gold) {
    throw new Error('Not enough stones or gold')
  }

  return {
    ...withCharacter(state, id, (current) => ({ ...current, weapon: current.weapon + 1 })),
    gold: state.gold - cost.gold,
    inventory: { ...state.inventory, [cost.stoneId]: state.inventory[cost.stoneId] - cost.stones }
  }
}

/** Whether a weapon upgrade can be paid now. */
export function canUpgradeWeapon(state: GameState, character: CharacterState): boolean {
  if (character.weapon >= MAX_WEAPON_LEVEL) {
    return false
  }

  const cost = getUpgradeCost(character.weapon + 1)

  return (state.inventory[cost.stoneId] ?? 0) >= cost.stones && state.gold >= cost.gold
}

/** Equips a rune the party owns on a character (taking it off whoever wore it). */
export function equipRune(state: GameState, id: CharacterId, index: number): GameState {
  requireCamp(state)

  const character = getCharacter(state, id)

  if (!state.runes.includes(index) || character.runes.includes(index) || character.runes.length >= RUNE_SLOTS) {
    throw new Error(`Cannot equip rune ${index}`)
  }

  const freed = {
    ...state,
    characters: state.characters.map((other) => ({ ...other, runes: other.runes.filter((rune) => rune !== index) }))
  }

  // A rune and its own echo do not stack.
  return withCharacter(freed, id, (current) => ({
    ...current,
    runes: [...current.runes, index],
    echoes: current.echoes.filter((echo) => echo !== index)
  }))
}

export function unequipRune(state: GameState, id: CharacterId, index: number): GameState {
  requireCamp(state)

  return withCharacter(state, id, (character) => ({
    ...character,
    runes: character.runes.filter((rune) => rune !== index)
  }))
}

/** Whether a character can wear the echo of a rune now. */
export function canEquipEcho(state: GameState, character: CharacterState, index: number): boolean {
  return (
    isRuneMastered(state, index) &&
    !character.echoes.includes(index) &&
    !character.runes.includes(index) &&
    getEchoLoad(character) + getRune(index).echoCost <= character.echoCapacity
  )
}

export function equipEcho(state: GameState, id: CharacterId, index: number): GameState {
  requireCamp(state)

  if (!canEquipEcho(state, getCharacter(state, id), index)) {
    throw new Error(`Cannot equip the echo of rune ${index}`)
  }

  return withCharacter(state, id, (character) => ({ ...character, echoes: [...character.echoes, index] }))
}

export function unequipEcho(state: GameState, id: CharacterId, index: number): GameState {
  requireCamp(state)

  return withCharacter(state, id, (character) => ({
    ...character,
    echoes: character.echoes.filter((echo) => echo !== index)
  }))
}

/** Assigns Echoes of the common pool to a character, for good. */
export function assignEchoes(state: GameState, id: CharacterId, count: number): GameState {
  if (!Number.isInteger(count) || count <= 0 || count > state.echoes) {
    throw new Error('Not enough Echoes')
  }

  return {
    ...withCharacter(state, id, (character) => ({ ...character, echoCapacity: character.echoCapacity + count })),
    echoes: state.echoes - count
  }
}

/** Moves a character to another place of the formation (the first three fight). */
export function moveInFormation(state: GameState, id: CharacterId, position: number): GameState {
  const character = getCharacter(state, id)
  const others = state.characters.filter((other) => other.id !== id)
  const clamped = Math.max(0, Math.min(others.length, position))

  return { ...state, characters: [...others.slice(0, clamped), character, ...others.slice(clamped)] }
}

/** Gives items to the party (consumables stop at their maximum). Returns the state and what was kept. */
export function addItems(
  state: GameState,
  items: Record<string, number>,
  maxConsumables: number
): { state: GameState; kept: Record<string, number> } {
  const inventory = { ...state.inventory }
  const kept: Record<string, number> = {}

  for (const [itemId, count] of Object.entries(items)) {
    const owned = inventory[itemId] ?? 0
    const room = getItem(itemId).kind === 'consumable' ? Math.max(0, maxConsumables - owned) : count
    const added = Math.min(room, count)

    if (added > 0) {
      inventory[itemId] = owned + added
      kept[itemId] = added
    }
  }

  return { state: { ...state, inventory }, kept }
}
