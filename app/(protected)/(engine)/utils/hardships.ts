import { getHardshipDefinition, HardshipKind, MAX_HARDSHIP_STEPS } from '@/app/(protected)/(engine)/data/hardships'
import { Biome } from '@/app/(protected)/(engine)/models/Biome'
import { BonusesPart } from '@/app/(protected)/(engine)/models/Bonuses'
import { GameState } from '@/app/(protected)/(engine)/models/GameState'
import { Perk } from '@/app/(protected)/(engine)/models/Perk'
import { getMaxHealth } from '@/app/(protected)/(engine)/utils/heroes'
import type { WorldIndex } from '@/app/(protected)/(engine)/utils/worldMap'

/**
 * The hardships of the map (data/hardships.ts): each step on the trails of a
 * hard biome piles up a little more of its effect. Pure functions.
 */

/** What the hardship of the party does now, where it stands. */
export interface ActiveHardship {
  biome: Biome
  kind: HardshipKind
  steps: number
  /** The share it takes away (0.12 = 12%), the turns of poison of the spores or the health burnt by each step of heat. */
  value: number
  /** Whether it reached its maximum. */
  maxed: boolean
}

/** Steps the party carries in a biome (0 when its hardship belongs to another one). */
export function getHardshipSteps(state: GameState, biome: Biome): number {
  return state.hardship?.biome === biome ? state.hardship.steps : 0
}

/** The hardship that weighs on the party in a biome, or null when it has none there (or has not walked it yet). */
export function getHardship(state: GameState, biome: Biome): ActiveHardship | null {
  const definition = getHardshipDefinition(biome)
  const steps = getHardshipSteps(state, biome)

  if (!definition || steps <= 0) {
    return null
  }

  const raw = definition.kind === HardshipKind.HEAT ? definition.perStep : definition.perStep * steps
  const value =
    definition.kind === HardshipKind.SPORES
      ? Math.min(definition.max!, Math.floor(raw))
      : Math.min(definition.max ?? raw, raw)

  return {
    biome,
    kind: definition.kind,
    steps,
    value: Math.round(value * 1000) / 1000,
    maxed: definition.max !== undefined && raw >= definition.max
  }
}

/** The hardship where the party stands. */
export function getHardshipHere(index: WorldIndex, state: GameState): ActiveHardship | null {
  const node = index.nodes.get(state.positionNodeId)

  return node ? getHardship(state, node.biome) : null
}

/**
 * The party takes one step into a point of a biome: the hardship of that
 * biome grows (a new biome starts it over) and the heat burns a little of the
 * health of each hero, never below 1 (the fallen stay fallen).
 */
export function stepInto(state: GameState, biome: Biome): GameState {
  const definition = getHardshipDefinition(biome)

  if (!definition) {
    return state.hardship ? { ...state, hardship: null } : state
  }

  const steps = Math.min(MAX_HARDSHIP_STEPS, getHardshipSteps(state, biome) + 1)
  const next: GameState = { ...state, hardship: { biome, steps } }

  if (definition.kind === HardshipKind.HEAT) {
    next.characters = state.characters.map((character) => {
      if (character.health <= 1) {
        return character
      }

      const burnt = Math.max(1, Math.round(getMaxHealth(character) * definition.perStep))

      return { ...character, health: Math.max(1, character.health - burnt) }
    })
  }

  return next
}

/** The party walks a route (from where it stands, the first point, to its target): one step into each point after the first. */
export function walkRoute(index: WorldIndex, state: GameState, route: string[]): GameState {
  let next = state

  for (const nodeId of route.slice(1)) {
    const node = index.nodes.get(nodeId)

    if (node) {
      next = stepInto(next, node.biome)
    }
  }

  return next
}

/** What the hardship of a biome takes away from each hero in battle (none for the spores and the heat). */
export function getHardshipBonuses(state: GameState, biome: Biome): BonusesPart | null {
  const hardship = getHardship(state, biome)

  switch (hardship?.kind) {
    case HardshipKind.THIRST:
      return { perks: { [Perk.HEALING_RECEIVED]: -hardship.value } }
    case HardshipKind.THIN_AIR:
      return { focusRegen: -hardship.value }
    case HardshipKind.RUST:
      return { stats: { defense: -hardship.value } }
    case HardshipKind.COLD:
      return { stats: { speed: -hardship.value } }
    case HardshipKind.VOID:
      return { weaponDamage: -hardship.value }
    default:
      return null
  }
}

/** Turns of poison the heroes start a battle in a biome with (the spores of the Tropics). */
export function getHardshipPoison(state: GameState, biome: Biome): number {
  const hardship = getHardship(state, biome)

  return hardship?.kind === HardshipKind.SPORES ? hardship.value : 0
}

/** The share of healing the thirst takes away in a biome (the Amber Flask included). */
export function getHardshipThirst(state: GameState, biome: Biome): number {
  const hardship = getHardship(state, biome)

  return hardship?.kind === HardshipKind.THIRST ? hardship.value : 0
}
