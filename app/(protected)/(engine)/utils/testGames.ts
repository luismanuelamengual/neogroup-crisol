import { RUNE_SLOTS } from '@/app/(protected)/(engine)/data/runes'
import { getSkill } from '@/app/(protected)/(engine)/data/skills'
import { getSkillTree } from '@/app/(protected)/(engine)/data/skillTrees'
import { MAX_WEAPON_LEVEL } from '@/app/(protected)/(engine)/data/weapons'
import { Biome } from '@/app/(protected)/(engine)/models/Biome'
import { CharacterId } from '@/app/(protected)/(engine)/models/CharacterId'
import { CharacterState } from '@/app/(protected)/(engine)/models/CharacterState'
import { CombatStats } from '@/app/(protected)/(engine)/models/CombatStats'
import { GameState } from '@/app/(protected)/(engine)/models/GameState'
import { NodeType } from '@/app/(protected)/(engine)/models/NodeType'
import { getEncounterPhases } from '@/app/(protected)/(engine)/utils/encounters'
import { createInitialGameState } from '@/app/(protected)/(engine)/utils/gameState'
import {
  canLearnSkill,
  equipRune,
  getMaxHealth,
  getNextSkillCost,
  getSkillLevel,
  SKILL_SLOTS
} from '@/app/(protected)/(engine)/utils/heroes'
import { arriveAt, getEncounter, getFlask, winEncounter, WorldIndex } from '@/app/(protected)/(engine)/utils/worldMap'

/**
 * Development only: games in progress at different points of the first cycle
 * (/dev/progress1, /dev/progress2...), to look at the game without playing up
 * to there. They are played in memory and never saved.
 */
export interface TestGame {
  /** Biomes whose every point is won (bosses, sanctuaries, reliquaries...). */
  biomes: Biome[]
  /** Camp where the party stands, rested. */
  campId: string
  /** Level of each hero, in the order of the formation. Every hero of the list must be freed by then. */
  levels: Partial<Record<CharacterId, number>>
  gold: number
}

const { KAEL, SERA, BRANN, OREN, YSOLDE } = CharacterId

/** The test games, by number. Positions come from public/world/world.json (WORLD_VERSION 38). */
export const TEST_GAMES: Record<number, TestGame> = {
  // In the forest, right after freeing Sera from Morgrath.
  1: {
    biomes: [Biome.MEADOWS, Biome.FOREST],
    campId: 'n912',
    levels: { [KAEL]: 24, [SERA]: 14 },
    gold: 800
  },
  // In the desert, right after freeing Brann from Sahrak.
  2: {
    biomes: [Biome.MEADOWS, Biome.FOREST, Biome.DESERT],
    campId: 'n894',
    levels: { [KAEL]: 35, [SERA]: 33, [BRANN]: 24 },
    gold: 2500
  },
  // In the mountains, right after freeing Ysolde from the Colossus (Oren freed in the tropical jungle).
  3: {
    biomes: [Biome.MEADOWS, Biome.FOREST, Biome.DESERT, Biome.TROPICAL, Biome.MOUNTAINS],
    campId: 'n581',
    levels: { [KAEL]: 55, [SERA]: 54, [BRANN]: 52, [OREN]: 48, [YSOLDE]: 44 },
    gold: 6000
  }
}

/** How a sensible player spends the attribute points: mostly its power (special for the casters), then health and defense. */
const ATTRIBUTE_PLAN: (keyof CombatStats)[] = ['attack', 'maxHealth', 'attack', 'defense']
const CASTERS = [OREN, YSOLDE]

/** A hero at a level built as a player would: attribute points and skill points spent, weapons upgraded. */
function buildHero(character: CharacterState, level: number): CharacterState {
  const weaponLevel = Math.min(MAX_WEAPON_LEVEL, Math.floor(level / 6))
  let built: CharacterState = {
    ...character,
    level,
    xp: 0,
    attributes: {},
    // Only the root of its tree, as it comes.
    skillLevels: { [getSkillTree(character.id).root]: 1 },
    skills: [getSkillTree(character.id).root],
    weapons: Object.fromEntries(
      Object.keys(character.weapons).map((id) => [id, id === character.weaponId ? weaponLevel : weaponLevel >> 1])
    )
  }

  for (let point = 0; point < level - 1; point++) {
    const planned = ATTRIBUTE_PLAN[point % ATTRIBUTE_PLAN.length]
    const stat = planned === 'attack' && CASTERS.includes(built.id) ? 'special' : planned

    built = { ...built, attributes: { ...built.attributes, [stat]: (built.attributes[stat] ?? 0) + 1 } }
  }

  for (;;) {
    // The cheapest step each time, the specials that hurt first.
    const weight = (skill: string) => getNextSkillCost(built, skill) + (getSkill(skill).power > 0 ? 0 : 3)
    const next = getSkillTree(built.id)
      .nodes.map((node) => node.skillId)
      .filter((skill) => canLearnSkill(built, skill))
      .sort((a, b) => weight(a) - weight(b))[0]

    if (!next) {
      break
    }

    const fresh = getSkillLevel(built, next) === 0

    built = {
      ...built,
      skillLevels: { ...built.skillLevels, [next]: getSkillLevel(built, next) + 1 },
      skills: fresh && built.skills.length < SKILL_SLOTS ? [...built.skills, next] : built.skills
    }
  }

  delete built.focus

  return built
}

/**
 * The state of a test game: every point of its biomes won in order from the
 * start (with the game's own rules, so heroes, runes, weapons, tears, chests
 * and the flask come as playing), then the heroes built at their levels,
 * runes equipped and the party rested at its camp.
 */
export function createTestGameState(index: WorldIndex, number: number): GameState {
  const game = TEST_GAMES[number]

  if (!game) {
    throw new Error(`There is no test game ${number}`)
  }

  const biomes = new Set(game.biomes)
  let state: GameState = { ...createInitialGameState(`test-${number}`), gold: game.gold }
  const kills: Record<string, number> = {}

  const win = (nodeId: string) => {
    const arrival = arriveAt(index, state, nodeId)

    state = arrival.state

    if (arrival.encounter) {
      for (const phase of getEncounterPhases(index.nodes.get(nodeId)!, arrival.encounter)) {
        for (const enemy of phase) {
          kills[enemy.speciesId] = (kills[enemy.speciesId] ?? 0) + 1
        }
      }

      state = winEncounter(index, state, {}).state
    }
  }

  // Walks the trails from the start through the biomes of the game. Reliquaries wait until their hero is freed.
  const reliquaries: string[] = []
  const seen = new Set([state.positionNodeId])
  const queue = [state.positionNodeId]

  while (queue.length > 0) {
    for (const id of index.adjacency.get(queue.shift()!) ?? []) {
      const node = index.nodes.get(id)!

      if (seen.has(id) || !biomes.has(node.biome) || node.type === NodeType.ABYSS_GATE) {
        continue
      }

      seen.add(id)
      queue.push(id)

      if (node.type === NodeType.RELIQUARY) {
        reliquaries.push(id)
      } else {
        win(id)
      }
    }
  }

  reliquaries.forEach(win)

  const missing = Object.keys(game.levels).filter((id) => !state.characters.some((character) => character.id === id))

  if (missing.length > 0 || !state.openCampIds.includes(game.campId)) {
    throw new Error(`Test game ${number} does not free ${missing.join(', ')} or open ${game.campId}`)
  }

  const order = Object.keys(game.levels) as CharacterId[]
  const characters = order.map((id) =>
    buildHero(
      state.characters.find((character) => character.id === id)!,
      game.levels[id]!
    )
  )

  state = {
    ...state,
    characters,
    kills,
    positionNodeId: game.campId,
    lastRestCampId: game.campId,
    restsSinceCleared: {},
    respawnedNodeIds: []
  }
  state = { ...state, flaskCharges: getFlask(index, state).maxCharges }

  // The strongest runes on the heroes that fight, up to three each.
  const runes = [...state.runes].sort((a, b) => b - a)
  const fighters = order.slice(0, 3)

  for (let slot = 0; slot < RUNE_SLOTS; slot++) {
    for (const id of fighters) {
      const rune = runes.shift()

      if (rune !== undefined) {
        state = equipRune(state, id, rune)
      }
    }
  }

  // Rested: full health with the runes on.
  state = {
    ...state,
    characters: state.characters.map((character) => ({ ...character, health: getMaxHealth(character) }))
  }

  if (getEncounter(index, state, state.positionNodeId)) {
    throw new Error(`Test game ${number} stands on a fight`)
  }

  return state
}
