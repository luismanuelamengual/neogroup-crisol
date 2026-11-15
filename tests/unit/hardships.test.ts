import { describe, expect, it } from 'vitest'
import { HardshipKind, HARDSHIPS } from '@/app/(protected)/(engine)/data/hardships'
import { BattleState } from '@/app/(protected)/(engine)/models/BattleState'
import { Biome } from '@/app/(protected)/(engine)/models/Biome'
import { CharacterId } from '@/app/(protected)/(engine)/models/CharacterId'
import { GameState } from '@/app/(protected)/(engine)/models/GameState'
import { StatusType } from '@/app/(protected)/(engine)/models/StatusType'
import type { World } from '@/app/(protected)/(engine)/models/World'
import { createBattle, getCombatant, performAction } from '@/app/(protected)/(engine)/utils/battle'
import { createInitialGameState, isGameState, migrateGameState } from '@/app/(protected)/(engine)/utils/gameState'
import {
  getHardship,
  getHardshipBonuses,
  getHardshipPoison,
  stepInto,
  walkRoute
} from '@/app/(protected)/(engine)/utils/hardships'
import { createCharacter, getMaxHealth } from '@/app/(protected)/(engine)/utils/heroes'
import { drinkFlask, indexWorld, rest, retreat } from '@/app/(protected)/(engine)/utils/worldMap'
import storedWorld from '@/public/world/world.json'

const index = indexWorld(storedWorld as unknown as World)

/** A game with Kael at level 30, after `steps` steps in a biome. */
function walked(biome: Biome, steps: number, extra: Partial<GameState> = {}): GameState {
  let state: GameState = {
    ...createInitialGameState('test'),
    characters: [createCharacter(CharacterId.KAEL, 30)],
    ...extra
  }

  for (let step = 0; step < steps; step++) {
    state = stepInto(state, biome)
  }

  return state
}

function battleIn(state: GameState, biome: Biome): BattleState {
  return createBattle({
    heroes: state.characters,
    phases: [[{ speciesId: 'thorn-boar', level: 30 }]],
    seed: 7,
    biome,
    canRetreat: true,
    hardship: getHardshipBonuses(state, biome),
    poisonTurns: getHardshipPoison(state, biome)
  }).state
}

describe('hardships of the map', () => {
  it('leave the Meadows and the Forest alone and weigh on every biome from the Desert on', () => {
    const hard = HARDSHIPS.map((definition) => definition.biome)

    expect(hard).not.toContain(Biome.MEADOWS)
    expect(hard).not.toContain(Biome.FOREST)
    expect(hard.sort()).toEqual(
      [Biome.DESERT, Biome.TROPICAL, Biome.MOUNTAINS, Biome.WASTELANDS, Biome.SNOW, Biome.VOLCANIC, Biome.ABYSS].sort()
    )
    expect(stepInto(createInitialGameState('test'), Biome.FOREST).hardship).toBeNull()
  })

  it('pile up with each step in the same biome, up to their maximum', () => {
    expect(getHardship(walked(Biome.SNOW, 1), Biome.SNOW)).toMatchObject({ kind: HardshipKind.COLD, value: 0.02 })
    expect(getHardship(walked(Biome.SNOW, 5), Biome.SNOW)).toMatchObject({ steps: 5, value: 0.1, maxed: false })
    expect(getHardship(walked(Biome.SNOW, 40), Biome.SNOW)).toMatchObject({ value: 0.3, maxed: true })
  })

  it('start over in another biome and fade when resting', () => {
    const snow = walked(Biome.SNOW, 6)
    const abyss = stepInto(snow, Biome.ABYSS)

    expect(abyss.hardship).toEqual({ biome: Biome.ABYSS, steps: 1 })
    expect(getHardship(abyss, Biome.SNOW)).toBeNull()
    expect(stepInto(snow, Biome.MEADOWS).hardship).toBeNull()

    const camp = { ...snow, positionNodeId: snow.openCampIds[0] }

    expect(rest(index, camp).hardship).toBeNull()
  })

  it('count every point of a route after the first, and a retreat too', () => {
    const route = index.world.nodes.filter((node) => node.biome === Biome.SNOW).slice(0, 4)
    const state = walkRoute(
      index,
      walked(Biome.SNOW, 0),
      route.map((node) => node.id)
    )

    expect(state.hardship).toEqual({ biome: Biome.SNOW, steps: 3 })

    const fight = index.world.nodes.find(
      (node) =>
        node.biome === Biome.SNOW &&
        node.type === 'combat' &&
        index.adjacency.get(node.id)!.some((id) => index.nodes.get(id)!.biome === Biome.SNOW)
    )!
    const back = index.adjacency.get(fight.id)!.find((id) => index.nodes.get(id)!.biome === Biome.SNOW)!
    const atFight = { ...state, positionNodeId: fight.id, clearedNodeIds: [...state.clearedNodeIds, back] }

    expect(retreat(index, atFight, back).hardship).toEqual({ biome: Biome.SNOW, steps: 4 })
  })

  it('slow the heroes in the snow', () => {
    const calm = getCombatant(battleIn(walked(Biome.SNOW, 0), Biome.SNOW), 'h-kael').stats.speed
    const cold = getCombatant(battleIn(walked(Biome.SNOW, 10), Biome.SNOW), 'h-kael').stats.speed

    expect(cold).toBe(Math.round(calm * 0.8))
  })

  it('burn a little health with each step in the volcanic lands, never below 1', () => {
    const kael = createCharacter(CharacterId.KAEL, 30)
    const max = getMaxHealth(kael)
    const once = walked(Biome.VOLCANIC, 1, { characters: [kael] })

    expect(once.characters[0].health).toBe(max - Math.round(max * 0.02))
    expect(walked(Biome.VOLCANIC, 200, { characters: [kael] }).characters[0].health).toBe(1)
    expect(walked(Biome.VOLCANIC, 3, { characters: [{ ...kael, health: 0 }] }).characters[0].health).toBe(0)
  })

  it('weaken the weapon attacks in the Abyss', () => {
    const damageOf = (state: BattleState) => {
      const kael = getCombatant(state, 'h-kael')
      const { events } = performAction(
        { ...state, actorId: kael.id },
        { type: 'skill', skillId: kael.skills[0], targetIds: ['e1-1'] }
      )

      return events.find((event) => event.type === 'damage' && event.targetId === 'e1-1') as { amount: number }
    }

    const calm = damageOf(battleIn(walked(Biome.ABYSS, 0), Biome.ABYSS)).amount
    const weak = damageOf(battleIn(walked(Biome.ABYSS, 10), Biome.ABYSS)).amount

    expect(weak).toBeLessThan(calm)
    expect(weak).toBeGreaterThan(calm * 0.6)
  })

  it('start the battles of the Tropics poisoned', () => {
    expect(getHardshipPoison(walked(Biome.TROPICAL, 3), Biome.TROPICAL)).toBe(0)
    expect(getHardshipPoison(walked(Biome.TROPICAL, 8), Biome.TROPICAL)).toBe(2)
    expect(getHardshipPoison(walked(Biome.TROPICAL, 50), Biome.TROPICAL)).toBe(3)

    const kael = getCombatant(battleIn(walked(Biome.TROPICAL, 8), Biome.TROPICAL), 'h-kael')

    expect(kael.statuses).toContainEqual({ type: StatusType.POISON, turns: 2 })
  })

  it('make the Amber Flask heal less in the desert', () => {
    const kael = createCharacter(CharacterId.KAEL, 30)
    const desertNode = index.world.nodes.find((node) => node.biome === Biome.DESERT)!
    const hurt = { ...kael, health: 1 }
    const fresh = drinkFlask(index, walked(Biome.DESERT, 0, { characters: [hurt], positionNodeId: desertNode.id }))
    const thirsty = drinkFlask(index, walked(Biome.DESERT, 10, { characters: [hurt], positionNodeId: desertNode.id }))

    expect(thirsty.characters[0].health).toBeLessThan(fresh.characters[0].health)
    expect(getHardshipBonuses(walked(Biome.DESERT, 10), Biome.DESERT)).toEqual({ perks: { healingReceived: -0.3 } })
  })

  it('are kept in the saves (older ones carry none)', () => {
    const state = walked(Biome.SNOW, 3)

    expect(isGameState(state)).toBe(true)
    expect(isGameState({ ...state, hardship: { biome: 'nowhere', steps: 2 } })).toBe(false)

    const { hardship: _hardship, ...old } = createInitialGameState('old')

    expect((migrateGameState(old, 14) as GameState).hardship).toBeNull()
  })
})
