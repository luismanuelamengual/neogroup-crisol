import { BIOMES } from '@/app/(protected)/(engine)/data/biomes'
import { getMaxHealth } from '@/app/(protected)/(engine)/data/characters'
import {
  EMBER_MINIBOSS_IDS,
  FLASK_BASE_CHARGES,
  FLASK_BASE_POTENCY,
  FLASK_EMBER_POTENCY,
  FLASK_MAX_CHARGES,
  FLASK_MAX_POTENCY
} from '@/app/(protected)/(engine)/data/flask'
import { SEALS_TO_OPEN_ABYSS } from '@/app/(protected)/(engine)/data/world'
import { BossKind } from '@/app/(protected)/(engine)/models/BossKind'
import { CharacterId } from '@/app/(protected)/(engine)/models/CharacterId'
import { Encounter } from '@/app/(protected)/(engine)/models/Encounter'
import { EncounterKind } from '@/app/(protected)/(engine)/models/EncounterKind'
import { Flask } from '@/app/(protected)/(engine)/models/Flask'
import { GameState } from '@/app/(protected)/(engine)/models/GameState'
import { NodeType } from '@/app/(protected)/(engine)/models/NodeType'
import { Reward } from '@/app/(protected)/(engine)/models/Reward'
import { World } from '@/app/(protected)/(engine)/models/World'
import { WorldNode } from '@/app/(protected)/(engine)/models/WorldNode'
import { createCharacter } from '@/app/(protected)/(engine)/utils/gameState'
import { Adjacency, buildAdjacency } from '@/app/(protected)/(engine)/utils/graph'

/**
 * Rules of the world map: fog, routes, what happens at each point, resting,
 * teleporting and the Amber Flask. Pure functions: each one returns a new
 * GameState and never changes the one it gets.
 */

/** The world with its lookups, built once (see indexWorld). */
export interface WorldIndex {
  world: World
  nodes: Map<string, WorldNode>
  adjacency: Adjacency
}

/** Points where a fight waits until it is won. */
const FIGHT_TYPES = new Set([
  NodeType.COMBAT,
  NodeType.CAMP_BOSS,
  NodeType.SANCTUARY,
  NodeType.TEAR,
  NodeType.FINAL_BOSS
])
/** Rescued characters join at the average level of the party minus this (at least 1). */
const RESCUED_LEVEL_GAP = 3
/** Gold of a chest: grows with the biome. */
const CHEST_BASE_GOLD = 30
const CHEST_GOLD_PER_BIOME = 30

export function indexWorld(world: World): WorldIndex {
  return {
    world,
    nodes: new Map(world.nodes.map((node) => [node.id, node])),
    adjacency: buildAdjacency(
      world.nodes.map((node) => node.id),
      world.edges
    )
  }
}

function getNode(index: WorldIndex, nodeId: string): WorldNode {
  const node = index.nodes.get(nodeId)

  if (!node) {
    throw new Error(`Unknown node ${nodeId}`)
  }

  return node
}

function isCleared(state: GameState, nodeId: string): boolean {
  return state.clearedNodeIds.includes(nodeId)
}

/** Seals defeated in this cycle. */
export function countDefeatedSeals(index: WorldIndex, state: GameState): number {
  return state.clearedNodeIds.filter((id) => index.nodes.get(id)?.bossKind === BossKind.SEAL).length
}

export function isAbyssOpen(index: WorldIndex, state: GameState): boolean {
  return countDefeatedSeals(index, state) >= SEALS_TO_OPEN_ABYSS
}

/** Points the party can see: the cleared ones and their neighbors (shown as silhouettes in the fog). */
export function getRevealedNodeIds(index: WorldIndex, state: GameState): Set<string> {
  const revealed = new Set(state.clearedNodeIds)

  for (const id of state.clearedNodeIds) {
    for (const next of index.adjacency.get(id) ?? []) {
      revealed.add(next)
    }
  }

  return revealed
}

/** Whether the party can step on a point that is not cleared yet (the door of the Abyss stays shut until the Seals fall). */
function canEnter(index: WorldIndex, state: GameState, node: WorldNode): boolean {
  return node.type !== NodeType.ABYSS_GATE || isAbyssOpen(index, state)
}

/**
 * Shortest route (in trail steps) from the party to a point, walking only
 * through cleared points: a fight not won yet blocks the way. The target can
 * be a cleared point or an uncleared one next to a cleared one. Returns the
 * nodes from the current one to the target, or null when there is no route.
 */
export function planRoute(index: WorldIndex, state: GameState, targetId: string): string[] | null {
  const start = state.positionNodeId
  const target = index.nodes.get(targetId)

  if (!target || targetId === start || (!isCleared(state, targetId) && !canEnter(index, state, target))) {
    return null
  }

  const previous = new Map<string, string>([[start, start]])
  const queue = [start]

  for (let head = 0; head < queue.length; head++) {
    const current = queue[head]

    for (const next of index.adjacency.get(current) ?? []) {
      if (previous.has(next)) {
        continue
      }

      if (next === targetId) {
        const route = [targetId, current]

        for (let step = current; step !== start; step = previous.get(step)!) {
          route.push(previous.get(step)!)
        }

        return route.reverse()
      }

      if (isCleared(state, next)) {
        previous.set(next, current)
        queue.push(next)
      }
    }
  }

  return null
}

/** The fight that waits at a point, or null when there is none (cleared, or a point without enemies). */
export function getEncounter(index: WorldIndex, state: GameState, nodeId: string): Encounter | null {
  const node = getNode(index, nodeId)
  const respawned = state.respawnedNodeIds.includes(nodeId)

  if ((isCleared(state, nodeId) && !respawned) || !FIGHT_TYPES.has(node.type)) {
    return null
  }

  const kind = encounterKindOf(node)

  return {
    nodeId,
    kind,
    level: node.level ?? 1,
    bossId: node.bossId,
    canRetreat: kind === EncounterKind.COMBAT || kind === EncounterKind.ELITE
  }
}

function encounterKindOf(node: WorldNode): EncounterKind {
  switch (node.type) {
    case NodeType.CAMP_BOSS:
      return node.bossKind === BossKind.CAPTOR
        ? EncounterKind.CAPTOR
        : node.bossKind === BossKind.SEAL
          ? EncounterKind.SEAL
          : EncounterKind.MINIBOSS
    case NodeType.SANCTUARY:
      return node.guardian ? EncounterKind.GUARDIAN : EncounterKind.ELITE
    case NodeType.TEAR:
      return EncounterKind.ELITE
    case NodeType.FINAL_BOSS:
      return EncounterKind.CRISOL
    default:
      return EncounterKind.COMBAT
  }
}

/**
 * The party reaches a point (the last one of a route). Points without a fight
 * are cleared right away and give their reward (a chest); with a fight, the
 * party stays there until it is resolved (winEncounter, loseEncounter or
 * retreat).
 */
export function arriveAt(
  index: WorldIndex,
  state: GameState,
  nodeId: string
): { state: GameState; encounter: Encounter | null; rewards: Reward[] } {
  const node = getNode(index, nodeId)
  const moved: GameState = { ...state, positionNodeId: nodeId }
  const encounter = getEncounter(index, moved, nodeId)

  if (encounter || isCleared(state, nodeId)) {
    return { state: moved, encounter, rewards: [] }
  }

  const rewards: Reward[] = []
  let gold = moved.gold

  if (node.type === NodeType.CHEST) {
    const amount =
      CHEST_BASE_GOLD + CHEST_GOLD_PER_BIOME * BIOMES.findIndex((definition) => definition.biome === node.biome)

    gold += amount
    rewards.push({ type: 'gold', amount })
  }

  return { state: { ...moved, gold, clearedNodeIds: [...moved.clearedNodeIds, nodeId] }, encounter: null, rewards }
}

/**
 * The party won the fight at its point: the point is cleared and gives its
 * rewards. `health` is the health of each character after the battle (the
 * fallen ones come back with 1).
 */
export function winEncounter(
  index: WorldIndex,
  state: GameState,
  health: Partial<Record<CharacterId, number>>
): { state: GameState; rewards: Reward[] } {
  const nodeId = state.positionNodeId
  const node = getNode(index, nodeId)
  const rewards: Reward[] = []
  const wasCleared = isCleared(state, nodeId)
  const flaskBefore = getFlask(index, state)
  const abyssWasOpen = isAbyssOpen(index, state)
  let characters = state.characters.map((character) => ({
    ...character,
    health: Math.min(getMaxHealth(character), Math.max(1, Math.round(health[character.id] ?? character.health)))
  }))
  let openCampIds = state.openCampIds

  if (!wasCleared && node.type === NodeType.CAMP_BOSS) {
    openCampIds = [...openCampIds, nodeId]
    rewards.push({ type: 'camp', nodeId })

    if (node.captive && !characters.some((character) => character.id === node.captive)) {
      const averageLevel = characters.reduce((sum, character) => sum + character.level, 0) / characters.length
      const level = Math.max(1, Math.round(averageLevel) - RESCUED_LEVEL_GAP)

      characters = [...characters, createCharacter(node.captive, level)]
      rewards.push({ type: 'character', characterId: node.captive, level })
    }
  }

  if (!wasCleared && node.type === NodeType.SANCTUARY && node.runeIndex && node.runeTier) {
    rewards.push({ type: 'rune', runeIndex: node.runeIndex, tier: node.runeTier })
  }

  if (!wasCleared && node.type === NodeType.TEAR) {
    rewards.push({ type: 'tear' })
  }

  if (!wasCleared && node.type === NodeType.FINAL_BOSS) {
    rewards.push({ type: 'crisolDefeated' })
  }

  const next: GameState = {
    ...state,
    characters,
    openCampIds,
    clearedNodeIds: wasCleared ? state.clearedNodeIds : [...state.clearedNodeIds, nodeId],
    respawnedNodeIds: state.respawnedNodeIds.filter((id) => id !== nodeId)
  }
  const flaskAfter = getFlask(index, next)

  if (flaskAfter.maxCharges > flaskBefore.maxCharges) {
    // The new charge comes filled.
    next.flaskCharges = state.flaskCharges + flaskAfter.maxCharges - flaskBefore.maxCharges
    rewards.push({ type: 'flaskCharge', maxCharges: flaskAfter.maxCharges })
  }

  if (flaskAfter.potency > flaskBefore.potency) {
    rewards.push({ type: 'flaskPotency', potency: flaskAfter.potency })
  }

  if (!abyssWasOpen && isAbyssOpen(index, next)) {
    rewards.push({ type: 'abyssOpen' })
  }

  return { state: next, rewards }
}

/**
 * The whole party fell: it wakes up at the last camp where it rested, as if
 * it had rested there (full health, flask refilled, common enemies back).
 */
export function loseEncounter(index: WorldIndex, state: GameState): GameState {
  return rest(index, { ...state, positionNodeId: state.lastRestCampId })
}

/** The party flees a fight (not allowed against bosses) back to the point it came from. */
export function retreat(index: WorldIndex, state: GameState, toNodeId: string): GameState {
  const encounter = getEncounter(index, state, state.positionNodeId)

  if (!encounter?.canRetreat || !isCleared(state, toNodeId)) {
    throw new Error('The party cannot retreat')
  }

  return { ...state, positionNodeId: toNodeId }
}

export function isAtOpenCamp(state: GameState): boolean {
  return state.openCampIds.includes(state.positionNodeId)
}

/**
 * Rest at the camp where the party stands: full health, the flask refilled,
 * this camp becomes the respawn point and the common enemies come back to the
 * fights already won (bosses and guardians never do within a cycle).
 */
export function rest(index: WorldIndex, state: GameState): GameState {
  if (!isAtOpenCamp(state)) {
    throw new Error('The party is not at an open camp')
  }

  return {
    ...state,
    lastRestCampId: state.positionNodeId,
    flaskCharges: getFlask(index, state).maxCharges,
    respawnedNodeIds: state.clearedNodeIds.filter((id) => index.nodes.get(id)?.type === NodeType.COMBAT),
    characters: state.characters.map((character) => ({ ...character, health: getMaxHealth(character) }))
  }
}

/** From an open camp to another open camp. */
export function teleport(state: GameState, campId: string): GameState {
  if (!isAtOpenCamp(state) || !state.openCampIds.includes(campId) || campId === state.positionNodeId) {
    throw new Error('The party cannot teleport there')
  }

  return { ...state, positionNodeId: campId }
}

/** Charges, maximum and potency of the Amber Flask, from the bosses defeated in this cycle. */
export function getFlask(index: WorldIndex, state: GameState): Flask {
  let embers = 0

  for (const id of state.clearedNodeIds) {
    const node = index.nodes.get(id)

    if (node?.bossKind === BossKind.CAPTOR || (node?.bossId && EMBER_MINIBOSS_IDS.includes(node.bossId))) {
      embers++
    }
  }

  return {
    charges: state.flaskCharges,
    maxCharges: Math.min(FLASK_MAX_CHARGES, FLASK_BASE_CHARGES + countDefeatedSeals(index, state)),
    potency: Math.min(FLASK_MAX_POTENCY, FLASK_BASE_POTENCY + FLASK_EMBER_POTENCY * embers)
  }
}

/** Drinks a charge of the Amber Flask: heals every character a share of its maximum health (the fallen ones too). */
export function drinkFlask(index: WorldIndex, state: GameState): GameState {
  const flask = getFlask(index, state)

  if (flask.charges <= 0) {
    throw new Error('The Amber Flask is empty')
  }

  return {
    ...state,
    flaskCharges: flask.charges - 1,
    characters: state.characters.map((character) => {
      const maxHealth = getMaxHealth(character)

      return {
        ...character,
        health: Math.min(maxHealth, character.health + Math.ceil((maxHealth * flask.potency) / 100))
      }
    })
  }
}
