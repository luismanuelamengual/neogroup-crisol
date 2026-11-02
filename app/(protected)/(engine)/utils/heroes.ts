import { ATTRIBUTE_POINT, getBaseStats, getCharacterDefinition } from '@/app/(protected)/(engine)/data/characters'
import { maxCarried } from '@/app/(protected)/(engine)/data/items'
import { getRune, RUNE_MASTERY_WINS, RUNE_SLOTS } from '@/app/(protected)/(engine)/data/runes'
import { getSkill } from '@/app/(protected)/(engine)/data/skills'
import {
  getLevelCost,
  getLinkedSkills,
  getSkillLevelUpgrade,
  getSkillNode,
  getSkillTree,
  getSpentOnSkill,
  MAX_SKILL_LEVEL
} from '@/app/(protected)/(engine)/data/skillTrees'
import {
  getStartingWeapon,
  getUpgradeCost,
  getWeapon,
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
 * The weapons are upgraded and the runes and the echoes changed only at an
 * open camp; the weapon held is changed at any cleared point.
 */

/** Echoes a skill point is traded for, once the tree of the character is complete. */
export const TRADE_ECHOES = 2
/** Skills a character takes into a battle, besides the attack of its weapon. */
export const SKILL_SLOTS = 6
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
    skillLevels: { [getSkillTree(id).root]: 1 },
    traded: 0,
    skills: [getSkillTree(id).root],
    weaponId: getStartingWeapon(id).id,
    weapons: { [getStartingWeapon(id).id]: 0 },
    runes: [],
    echoCapacity: 0,
    echoes: []
  }

  return { ...character, health: getMaxHealth(character) }
}

/** The levels of its specials, the effects of its weapon, its runes (with their attribute shifts) and its echoes. */
export function getHeroBonuses(character: CharacterState): Bonuses {
  const bonuses = emptyBonuses()

  for (const [skillId, level] of Object.entries(character.skillLevels)) {
    if (level > 1) {
      addBonuses(bonuses, { upgrades: { [skillId]: getSkillLevelUpgrade(skillId, level) } })
    }
  }

  addBonuses(bonuses, getWeapon(character.weaponId).traits)

  for (const effect of getWeaponEffects(character.weaponId, getWeaponLevel(character))) {
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
  const weapon = 1 + WEAPON_POWER_PER_LEVEL * getWeaponLevel(character)
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

/** The upgrade of a weapon of a character (the one it holds by default). */
export function getWeaponLevel(character: CharacterState, weaponId = character.weaponId): number {
  return character.weapons[weaponId] ?? 0
}

/**
 * The skills a character knows besides its weapon attack and its secondary
 * actions: the specials of its tree it learned (its root from the start), in
 * the order of the tree.
 */
export function getKnownSkills(character: Pick<CharacterState, 'id' | 'skillLevels'>): string[] {
  return getSkillTree(character.id)
    .nodes.map((node) => node.skillId)
    .filter((skill) => (character.skillLevels[skill] ?? 0) > 0)
}

/** The level of a special for a character (0 when it did not learn it). */
export function getSkillLevel(character: Pick<CharacterState, 'skillLevels'>, skillId: string): number {
  return character.skillLevels[skillId] ?? 0
}

/** Skill points it costs a character to learn a special or take it to its next level. */
export function getNextSkillCost(character: Pick<CharacterState, 'id' | 'skillLevels'>, skillId: string): number {
  const level = getSkillLevel(character, skillId)

  return level === 0 ? (getSkillNode(character.id, skillId)?.cost ?? 0) : getLevelCost(level + 1)
}

/** Why a special can or cannot be learned or go up a level now. */
export type SkillLearnState =
  /** It can be learned or go up a level now. */
  | 'ready'
  /** Not enough skill points. */
  | 'points'
  /** None of the specials joined to it was learned yet. */
  | 'far'
  /** It is at its best. */
  | 'max'

export function getSkillLearnState(character: CharacterState, skillId: string): SkillLearnState {
  const level = getSkillLevel(character, skillId)

  if (!getSkillNode(character.id, skillId)) {
    throw new Error(`${skillId} is not in the tree of ${character.id}`)
  }

  if (level >= MAX_SKILL_LEVEL) {
    return 'max'
  }

  if (level === 0 && !getLinkedSkills(character.id, skillId).some((linked) => getSkillLevel(character, linked) > 0)) {
    return 'far'
  }

  return getSkillPoints(character) >= getNextSkillCost(character, skillId) ? 'ready' : 'points'
}

export function canLearnSkill(character: CharacterState, skillId: string): boolean {
  return getSkillLearnState(character, skillId) === 'ready'
}

/** Its secondary actions: always at hand, outside the six slots (Kael's change of stance). */
export function getSecondaryActions(characterId: CharacterId): string[] {
  return getCharacterDefinition(characterId).skills.filter((skill) => getSkill(skill).stance)
}

/** The skills a character takes into a battle: the attack of its weapon, the ones it equipped (up to six) and its secondary actions. */
export function getCharacterSkills(character: CharacterState): string[] {
  const known = getKnownSkills(character)

  return [
    getWeapon(character.weaponId).attack,
    ...character.skills.filter((skill) => known.includes(skill)),
    ...getSecondaryActions(character.id)
  ]
}

/** Equips a known skill in a free slot (at any time out of battle). */
export function equipSkill(state: GameState, id: CharacterId, skillId: string): GameState {
  const character = getCharacter(state, id)

  if (!getKnownSkills(character).includes(skillId) || character.skills.includes(skillId)) {
    throw new Error(`${id} cannot equip ${skillId}`)
  }

  if (character.skills.length >= SKILL_SLOTS) {
    throw new Error('No free skill slot')
  }

  return withCharacter(state, id, (current) => ({ ...current, skills: [...current.skills, skillId] }))
}

export function unequipSkill(state: GameState, id: CharacterId, skillId: string): GameState {
  return withCharacter(state, id, (character) => ({
    ...character,
    skills: character.skills.filter((skill) => skill !== skillId)
  }))
}

export function getAttributePoints(character: CharacterState): number {
  const spent = Object.values(character.attributes).reduce((sum, points) => sum + (points ?? 0), 0)

  return character.level - 1 - spent
}

/** Skill points spent on the tree of a character. */
export function getSpentSkillPoints(character: Pick<CharacterState, 'id' | 'skillLevels'>): number {
  return Object.entries(character.skillLevels).reduce(
    (sum, [skillId, level]) => sum + getSpentOnSkill(character.id, skillId, level),
    0
  )
}

export function getSkillPoints(character: CharacterState): number {
  return character.level - 1 - getSpentSkillPoints(character) - character.traded
}

/** Whether the tree of a character is at its best: every special learned and at level 5. */
export function isTreeComplete(character: CharacterState): boolean {
  return getSkillTree(character.id).nodes.every((node) => getSkillLevel(character, node.skillId) >= MAX_SKILL_LEVEL)
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

/** Learns a special of the tree joined to one already learned, or takes it one level up, paying skill points. */
export function learnSkill(state: GameState, id: CharacterId, skillId: string): GameState {
  if (!canLearnSkill(getCharacter(state, id), skillId)) {
    throw new Error(`${id} cannot learn ${skillId}`)
  }

  return withCharacter(state, id, (character) => {
    const level = getSkillLevel(character, skillId)

    return {
      ...character,
      skillLevels: { ...character.skillLevels, [skillId]: level + 1 },
      // A special just learned goes to a free slot, if there is one.
      skills:
        level === 0 && character.skills.length < SKILL_SLOTS && !character.skills.includes(skillId)
          ? [...character.skills, skillId]
          : character.skills
    }
  })
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

/** Whether a Tear of Oblivion would give something back to a character: any skill point spent. */
export function canForgetSkills(character: CharacterState): boolean {
  return getSpentSkillPoints(character) > 0
}

/** A Tear of Oblivion gives back every skill point of a character, to spend them again on another way through its tree. */
export function spendTear(state: GameState, id: CharacterId): GameState {
  if (state.tears <= 0 || !canForgetSkills(getCharacter(state, id))) {
    throw new Error('Cannot use a tear')
  }

  return {
    ...withCharacter(state, id, (character) => {
      const reset = { ...character, skillLevels: { [getSkillTree(id).root]: 1 } }
      const known = getKnownSkills(reset)

      // The specials forgotten leave their slots.
      return { ...reset, skills: character.skills.filter((skill) => known.includes(skill)) }
    }),
    tears: state.tears - 1
  }
}

/** Upgrades one weapon of a character (the one it holds by default) one level, paying stones and gold. */
export function upgradeWeapon(state: GameState, id: CharacterId, weaponId?: string): GameState {
  requireCamp(state)

  const character = getCharacter(state, id)
  const weapon = weaponId ?? character.weaponId

  if (!(weapon in character.weapons)) {
    throw new Error(`${id} does not own ${weapon}`)
  }

  if (getWeaponLevel(character, weapon) >= MAX_WEAPON_LEVEL) {
    throw new Error('The weapon is at its best')
  }

  const cost = getUpgradeCost(getWeaponLevel(character, weapon) + 1)

  if ((state.inventory[cost.stoneId] ?? 0) < cost.stones || state.gold < cost.gold) {
    throw new Error('Not enough stones or gold')
  }

  return {
    ...withCharacter(state, id, (current) => ({
      ...current,
      weapons: { ...current.weapons, [weapon]: getWeaponLevel(current, weapon) + 1 }
    })),
    gold: state.gold - cost.gold,
    inventory: { ...state.inventory, [cost.stoneId]: state.inventory[cost.stoneId] - cost.stones }
  }
}

/** Whether an upgrade of a weapon of a character (the one it holds by default) can be paid now. */
export function canUpgradeWeapon(state: GameState, character: CharacterState, weaponId = character.weaponId): boolean {
  if (!(weaponId in character.weapons) || getWeaponLevel(character, weaponId) >= MAX_WEAPON_LEVEL) {
    return false
  }

  const cost = getUpgradeCost(getWeaponLevel(character, weaponId) + 1)

  return (state.inventory[cost.stoneId] ?? 0) >= cost.stones && state.gold >= cost.gold
}

/** Whether the party stands on a cleared point (not one whose enemies came back): the weapons can be swapped. */
export function canSwapWeapons(state: GameState): boolean {
  return state.clearedNodeIds.includes(state.positionNodeId) && !state.respawnedNodeIds.includes(state.positionNodeId)
}

/** Gives a character another of its weapons to hold (at any cleared point). */
export function equipWeapon(state: GameState, id: CharacterId, weaponId: string): GameState {
  if (!canSwapWeapons(state)) {
    throw new Error('Only at a cleared point')
  }

  if (!(weaponId in getCharacter(state, id).weapons)) {
    throw new Error(`${id} does not own ${weaponId}`)
  }

  return withCharacter(state, id, (character) => {
    const before = getMaxHealth(character)
    const changed = { ...character, weaponId }
    // The health keeps its share of the maximum (a weapon can add or take some); a fallen hero stays fallen.
    const health =
      character.health > 0 ? Math.max(1, Math.round((character.health / before) * getMaxHealth(changed))) : 0

    return { ...changed, health }
  })
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
  items: Record<string, number>
): { state: GameState; kept: Record<string, number> } {
  const inventory = { ...state.inventory }
  const kept: Record<string, number> = {}

  for (const [itemId, count] of Object.entries(items)) {
    const owned = inventory[itemId] ?? 0
    const room = Math.max(0, maxCarried(itemId) - owned)
    const added = Math.min(room, count)

    if (added > 0) {
      inventory[itemId] = owned + added
      kept[itemId] = added
    }
  }

  return { state: { ...state, inventory }, kept }
}
