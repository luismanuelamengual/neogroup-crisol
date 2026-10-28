import { getBaseStats } from '@/app/(protected)/(engine)/data/characters'
import { FLASK_BASE_CHARGES } from '@/app/(protected)/(engine)/data/flask'
import { getStartingWeapon, MAX_WEAPON_LEVEL, WEAPONS } from '@/app/(protected)/(engine)/data/weapons'
import { START_NODE_ID } from '@/app/(protected)/(engine)/data/world'
import { CharacterId } from '@/app/(protected)/(engine)/models/CharacterId'
import { CharacterState } from '@/app/(protected)/(engine)/models/CharacterState'
import { GameState } from '@/app/(protected)/(engine)/models/GameState'
import { createCharacter } from '@/app/(protected)/(engine)/utils/heroes'

/** Version of the shape of GameState (see `saves.saveVersion`). */
export const SAVE_VERSION = 6

/** State of a brand new game: Kael alone, at level 1, in the starting camp. */
export function createInitialGameState(gameId: string = crypto.randomUUID()): GameState {
  return {
    gameId,
    cycle: 0,
    positionNodeId: START_NODE_ID,
    lastRestCampId: START_NODE_ID,
    openCampIds: [START_NODE_ID],
    clearedNodeIds: [START_NODE_ID],
    respawnedNodeIds: [],
    flaskCharges: FLASK_BASE_CHARGES,
    characters: [createCharacter(CharacterId.KAEL)],
    gold: 0,
    kills: {},
    inventory: {},
    runes: [],
    runeWins: {},
    tears: 0,
    echoes: 0,
    scholarSold: 0
  }
}

/**
 * Brings a state saved with an older SAVE_VERSION to the current shape. Each
 * step migrates one version, so a very old save goes through all of them.
 */
export function migrateGameState(data: unknown, fromVersion: number): unknown {
  let state = data as Record<string, unknown>

  if (fromVersion < 2) {
    // v2: game id, respawned fights, Amber Flask and the health of the characters.
    state = {
      ...state,
      gameId: 'legacy',
      respawnedNodeIds: [],
      flaskCharges: FLASK_BASE_CHARGES,
      characters: ((state.characters ?? []) as Omit<CharacterState, 'health'>[]).map((character) => ({
        ...character,
        health: Math.round(getBaseStats(character.id, character.level).maxHealth)
      }))
    }
  }

  if (fromVersion < 3) {
    // v3: enemies defeated, for the bestiary.
    state = { ...state, kills: {} }
  }

  if (fromVersion < 4) {
    // v4: builds (points, trees, weapons, runes, echoes), inventory, runes and Echoes. The points and the
    // Echoes of the levels already gained are there to spend.
    const characters = (state.characters ?? []) as Pick<CharacterState, 'id' | 'level' | 'xp' | 'health'>[]

    state = {
      ...state,
      characters: characters.map((character) => ({
        ...character,
        attributes: {},
        talents: [],
        traded: 0,
        weapon: 0,
        runes: [],
        echoCapacity: 0,
        echoes: []
      })),
      inventory: {},
      runes: [],
      runeWins: {},
      tears: 0,
      echoes: characters.reduce((sum, character) => sum + character.level - 1, 0),
      scholarSold: 0
    }
  }

  if (fromVersion < 5) {
    // v5: three weapons per character. The upgrade it had goes to the weapon it starts with, which it holds.
    state = {
      ...state,
      characters: (
        (state.characters ?? []) as (Omit<CharacterState, 'weaponId' | 'weapons'> & { weapon?: number })[]
      ).map(({ weapon, ...character }) => {
        const starting = getStartingWeapon(character.id).id

        return { ...character, weaponId: starting, weapons: { [starting]: weapon ?? 0 } }
      })
    }
  }

  if (fromVersion < 6) {
    // v6: Oren wields sickles and scythes and Ysolde grimoires (the weapons that were staves, scepters and a wand).
    const renamed: Record<string, string> = {
      'grove-staff': 'root-sickle',
      'sun-scepter': 'noon-scythe',
      'crystal-staff': 'trinity-tome',
      'storm-scepter': 'thunder-codex',
      'prism-wand': 'dusk-grimoire'
    }
    const rename = (id: string) => renamed[id] ?? id

    state = {
      ...state,
      characters: ((state.characters ?? []) as CharacterState[]).map((character) => ({
        ...character,
        weaponId: rename(character.weaponId),
        weapons: Object.fromEntries(Object.entries(character.weapons).map(([id, level]) => [rename(id), level]))
      }))
    }
  }

  return state
}

/** Whether a value has the shape of a GameState (what the server checks before storing a save). */
export function isGameState(value: unknown): value is GameState {
  if (!value || typeof value !== 'object') {
    return false
  }

  const state = value as Record<string, unknown>
  const isStringArray = (item: unknown) => Array.isArray(item) && item.every((entry) => typeof entry === 'string')
  const isCount = (item: unknown) => Number.isInteger(item) && (item as number) >= 0
  const isCountMap = (item: unknown) =>
    !!item && typeof item === 'object' && !Array.isArray(item) && Object.values(item).every(isCount)
  const isRuneIndex = (item: unknown) => Number.isInteger(item) && (item as number) >= 1 && (item as number) <= 60
  const characterIds = Object.values(CharacterId) as string[]
  // The weapons of a character: its own, with an upgrade from 0 to the maximum.
  const isWeaponsOf = (id: unknown, item: unknown) =>
    isCountMap(item) &&
    Object.entries(item as Record<string, number>).every(
      ([weaponId, level]) =>
        WEAPONS.some((weapon) => weapon.id === weaponId && weapon.characterId === id) && level <= MAX_WEAPON_LEVEL
    )

  return (
    typeof state.gameId === 'string' &&
    isCount(state.cycle) &&
    typeof state.positionNodeId === 'string' &&
    typeof state.lastRestCampId === 'string' &&
    isStringArray(state.openCampIds) &&
    isStringArray(state.clearedNodeIds) &&
    isStringArray(state.respawnedNodeIds) &&
    isCount(state.flaskCharges) &&
    isCount(state.gold) &&
    isCount(state.tears) &&
    isCount(state.echoes) &&
    isCount(state.scholarSold) &&
    isCountMap(state.inventory) &&
    isCountMap(state.runeWins) &&
    Array.isArray(state.runes) &&
    state.runes.every(isRuneIndex) &&
    isCountMap(state.kills) &&
    Array.isArray(state.characters) &&
    state.characters.length > 0 &&
    state.characters.every((character) => {
      const { id, level, xp, health, attributes, talents, traded, weaponId, weapons, runes, echoCapacity, echoes } =
        (character ?? {}) as Record<string, unknown>

      return (
        characterIds.includes(id as string) &&
        Number.isInteger(level) &&
        (level as number) >= 1 &&
        isCount(xp) &&
        isCount(health) &&
        isCountMap(attributes) &&
        isStringArray(talents) &&
        isCount(traded) &&
        isWeaponsOf(id, weapons) &&
        typeof weaponId === 'string' &&
        weaponId in (weapons as Record<string, number>) &&
        Array.isArray(runes) &&
        runes.length <= 3 &&
        runes.every(isRuneIndex) &&
        isCount(echoCapacity) &&
        Array.isArray(echoes) &&
        echoes.every(isRuneIndex)
      )
    })
  )
}
