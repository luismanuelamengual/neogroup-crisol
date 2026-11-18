import { describe, expect, it } from 'vitest'
import { Biome } from '@/app/(protected)/(engine)/models/Biome'
import { GameState } from '@/app/(protected)/(engine)/models/GameState'
import { NodeType } from '@/app/(protected)/(engine)/models/NodeType'
import type { World } from '@/app/(protected)/(engine)/models/World'
import { createInitialGameState } from '@/app/(protected)/(engine)/utils/gameState'
import { buildAdjacency, hopDistances } from '@/app/(protected)/(engine)/utils/graph'
import { findShortcuts, getAllTrails, getOpenShortcuts } from '@/app/(protected)/(engine)/utils/shortcuts'
import {
  arriveAt,
  getReachableNodeIds,
  getRevealedNodeIds,
  indexWorld,
  neighbors,
  planRoute,
  winEncounter
} from '@/app/(protected)/(engine)/utils/worldMap'
import { validateWorld } from '@/app/(protected)/(engine)/utils/worldValidation'
import storedWorld from '@/public/world/world.json'

const world = storedWorld as unknown as World
const index = indexWorld(world)
const shortcuts = world.shortcuts ?? []
const byId = new Map(world.nodes.map((node) => [node.id, node]))

/** A game standing at a point, with some points cleared. */
function standingAt(nodeId: string, cleared: string[]): GameState {
  return { ...createInitialGameState('test'), positionNodeId: nodeId, clearedNodeIds: [world.startNodeId, ...cleared] }
}

describe('the shortcuts of the world', () => {
  it('are found over the stored world as it is (no point nor trail changes)', () => {
    expect(shortcuts.length).toBeGreaterThanOrEqual(12)
    expect(findShortcuts({ ...world, shortcuts: undefined })).toEqual(shortcuts)
  })

  it('stay inside one biome, out of the first biomes and the Abyss, and save several steps to a camp', () => {
    const adjacency = buildAdjacency(
      world.nodes.map((node) => node.id),
      world.edges
    )
    const camps = world.nodes
      .filter((node) => node.type === NodeType.CAMP_BOSS || node.type === NodeType.START)
      .map((node) => node.id)
    const toCamp = hopDistances(adjacency, camps)

    for (const { from, to } of shortcuts) {
      expect(byId.get(from)!.biome).toBe(byId.get(to)!.biome)
      expect([Biome.MEADOWS, Biome.FOREST, Biome.ABYSS]).not.toContain(byId.get(from)!.biome)
      expect(toCamp.get(to)! - (toCamp.get(from)! + 1)).toBeGreaterThanOrEqual(4)
    }
  })

  it('leave the world valid, and are checked by the validation', () => {
    expect(validateWorld(world)).toEqual([])

    const [first] = shortcuts
    const trail = world.edges[0]

    expect(validateWorld({ ...world, shortcuts: [...shortcuts, { from: first.from, to: 'nowhere' }] })).toContain(
      `shortcut ${first.from}–nowhere to an unknown point`
    )
    expect(validateWorld({ ...world, shortcuts: [{ from: trail[0], to: trail[1] }] })).toContain(
      `shortcut ${trail[0]}–${trail[1]} is already a trail`
    )
  })

  it('pave the ground of every shortcut, shut or open', () => {
    expect(getAllTrails(world)).toHaveLength(world.edges.length + shortcuts.length)
  })
})

describe('walking through a shortcut', () => {
  const [shortcut] = shortcuts

  it('stays shut from the near side until the party reaches its deep end', () => {
    const shut = standingAt(shortcut.from, [shortcut.from])

    expect(neighbors(index, shut, shortcut.from)).not.toContain(shortcut.to)
    expect(getRevealedNodeIds(index, shut).has(shortcut.to)).toBe(false)
    expect(getReachableNodeIds(index, shut).has(shortcut.to)).toBe(false)
    expect(getOpenShortcuts(world, shut)).toEqual([])
  })

  it('opens for good once its deep end is cleared, both ways', () => {
    const open = standingAt(shortcut.to, [shortcut.from, shortcut.to])

    expect(getOpenShortcuts(world, open)).toContainEqual(shortcut)
    expect(neighbors(index, open, shortcut.to)).toContain(shortcut.from)
    expect(neighbors(index, open, shortcut.from)).toContain(shortcut.to)
    expect(planRoute(index, open, shortcut.from)).toEqual([shortcut.to, shortcut.from])
    expect(planRoute(index, { ...open, positionNodeId: shortcut.from }, shortcut.to)).toEqual([
      shortcut.from,
      shortcut.to
    ])
  })

  it('tells the player when winning the fight of its deep end opens it', () => {
    const fight = shortcuts.find((candidate) => byId.get(candidate.to)!.type === NodeType.COMBAT)!
    const arrived = arriveAt(index, standingAt(fight.to, []), fight.to)

    expect(arrived.encounter).not.toBeNull()

    const won = winEncounter(index, arrived.state, {})

    expect(won.rewards).toContainEqual({ type: 'shortcut', fromNodeId: fight.from, toNodeId: fight.to })
    expect(neighbors(index, won.state, fight.to)).toContain(fight.from)
    // Winning it again (after its enemies come back) opens nothing new.
    expect(winEncounter(index, won.state, {}).rewards).not.toContainEqual(expect.objectContaining({ type: 'shortcut' }))
  })
})
