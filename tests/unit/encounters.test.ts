import { describe, expect, it } from 'vitest'
import { getSpecies } from '@/app/(protected)/(engine)/data/enemies'
import { getSkill } from '@/app/(protected)/(engine)/data/skills'
import { Biome } from '@/app/(protected)/(engine)/models/Biome'
import { CharacterId } from '@/app/(protected)/(engine)/models/CharacterId'
import { EncounterKind } from '@/app/(protected)/(engine)/models/EncounterKind'
import type { World } from '@/app/(protected)/(engine)/models/World'
import { createBattle } from '@/app/(protected)/(engine)/utils/battle'
import { applyBattleResult } from '@/app/(protected)/(engine)/utils/battleResult'
import { getEncounterPhases } from '@/app/(protected)/(engine)/utils/encounters'
import { createInitialGameState } from '@/app/(protected)/(engine)/utils/gameState'
import { createCharacter } from '@/app/(protected)/(engine)/utils/heroes'
import { gainExperience, loseExperience, xpToNextLevel } from '@/app/(protected)/(engine)/utils/progression'
import { arriveAt, getEncounter, indexWorld } from '@/app/(protected)/(engine)/utils/worldMap'
import storedWorld from '@/public/world/world.json'
import { simulateBattle } from '@/tests/support/battleSimulator'

const index = indexWorld(storedWorld as unknown as World)
const world = index.world
const fresh = { ...createInitialGameState('test'), clearedNodeIds: [] }

describe('encounters', () => {
  it('gives every fight of the world 1 to 3 phases of 1 to 3 known enemies', () => {
    for (const node of world.nodes) {
      const encounter = getEncounter(index, fresh, node.id)

      if (!encounter) {
        continue
      }

      const phases = getEncounterPhases(node, encounter)

      expect(phases.length).toBeGreaterThanOrEqual(1)
      expect(phases.length).toBeLessThanOrEqual(3)

      for (const phase of phases) {
        expect(phase.length).toBeGreaterThanOrEqual(1)
        expect(phase.length).toBeLessThanOrEqual(3)

        for (const spawn of phase) {
          const species = getSpecies(spawn.speciesId)

          expect(spawn.level).toBeGreaterThanOrEqual(1)
          expect(species.skills.every((id) => getSkill(id))).toBeTruthy()
        }
      }

      expect(getEncounterPhases(node, encounter)).toEqual(phases)
    }
  })

  it('puts the camp boss alone with its own species in the Meadows', () => {
    const node = world.nodes.find((candidate) => candidate.bossId === 'meadows-miniboss-1')!
    const encounter = getEncounter(index, fresh, node.id)!

    expect(encounter.kind).toBe(EncounterKind.MINIBOSS)
    expect(getEncounterPhases(node, encounter)).toEqual([[{ speciesId: 'boar-matriarch', level: node.level }]])
  })
})

describe('experience', () => {
  it('goes up as many levels as the experience pays for, with their health', () => {
    const kael = createCharacter(CharacterId.KAEL)
    const grown = gainExperience(kael, xpToNextLevel(1) + xpToNextLevel(2) + 5)

    expect(grown).toMatchObject({ level: 3, xp: 5, health: 144 })
  })

  it('loses a share of the experience of the level, never the level', () => {
    expect(loseExperience({ ...createCharacter(CharacterId.KAEL, 4), xp: 51 }, 0.5)).toMatchObject({ level: 4, xp: 26 })
  })
})

describe('battle results on the map', () => {
  const start = createInitialGameState('test')
  const combatId = index.adjacency.get(world.startNodeId)!.find((id) => index.nodes.get(id)!.type === 'combat')!
  const node = index.nodes.get(combatId)!
  const fighting = arriveAt(index, start, combatId)
  const phases = getEncounterPhases(node, fighting.encounter!)
  const battleWith = (heroLevel: number, seed = 1) =>
    simulateBattle({
      heroes: [{ ...createCharacter(CharacterId.KAEL, heroLevel) }],
      phases,
      seed,
      biome: Biome.MEADOWS,
      canRetreat: true
    })

  it('clears the point and pays experience, gold and kills on a victory', () => {
    const battle = battleWith(10)
    const result = applyBattleResult(index, fighting.state, battle, world.startNodeId)

    expect(battle.outcome).toBe('victory')
    expect(result.state.clearedNodeIds).toContain(combatId)
    expect(result.state.gold).toBe(battle.gold)
    expect(result.state.characters[0].xp).toBe(battle.xp)
    expect(Object.values(result.state.kills).reduce((sum, count) => sum + count, 0)).toBe(
      phases.reduce((sum, phase) => sum + phase.length, 0)
    )
    expect(result.rewards[0]).toEqual({ type: 'gold', amount: battle.gold })
  })

  it('wakes the party at its last camp with half the experience of the level after a defeat', () => {
    const { state } = createBattle({
      heroes: start.characters,
      phases,
      seed: 1,
      biome: Biome.MEADOWS,
      canRetreat: true
    })
    const game = { ...fighting.state, characters: [{ ...fighting.state.characters[0], xp: 10 }] }
    const result = applyBattleResult(index, game, { ...state, outcome: 'defeat' }, world.startNodeId)

    expect(result.state.positionNodeId).toBe(world.startNodeId)
    expect(result.state.characters[0]).toMatchObject({ xp: 5, health: 120 })
  })

  it('goes back on a retreat losing a tenth of the experience of the level', () => {
    const { state } = createBattle({
      heroes: start.characters,
      phases,
      seed: 1,
      biome: Biome.MEADOWS,
      canRetreat: true
    })
    const game = { ...fighting.state, characters: [{ ...fighting.state.characters[0], xp: 10 }] }
    const result = applyBattleResult(index, game, { ...state, outcome: 'retreat' }, world.startNodeId)

    expect(result.state.positionNodeId).toBe(world.startNodeId)
    expect(result.state.characters[0].xp).toBe(9)
    expect(result.state.clearedNodeIds).not.toContain(combatId)
  })
})
