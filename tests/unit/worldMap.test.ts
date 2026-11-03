import { describe, expect, it } from 'vitest'
import { CAPTOR_ECHOES, CAPTOR_STONES, CYCLE_LEVELS } from '@/app/(protected)/(engine)/data/cycles'
import { EMBER_MINIBOSS_IDS } from '@/app/(protected)/(engine)/data/flask'
import { BIOME_POTIONS, BIOME_STONE } from '@/app/(protected)/(engine)/data/items'
import { getStartingWeapon, getWeapon, WEAPONS } from '@/app/(protected)/(engine)/data/weapons'
import { BossKind } from '@/app/(protected)/(engine)/models/BossKind'
import { CharacterId } from '@/app/(protected)/(engine)/models/CharacterId'
import { EncounterKind } from '@/app/(protected)/(engine)/models/EncounterKind'
import { GameState } from '@/app/(protected)/(engine)/models/GameState'
import { NodeType } from '@/app/(protected)/(engine)/models/NodeType'
import type { World } from '@/app/(protected)/(engine)/models/World'
import { WorldNode } from '@/app/(protected)/(engine)/models/WorldNode'
import { getEncounterPhases } from '@/app/(protected)/(engine)/utils/encounters'
import { createInitialGameState, isGameState, migrateGameState } from '@/app/(protected)/(engine)/utils/gameState'
import { createCharacter } from '@/app/(protected)/(engine)/utils/heroes'
import { getMaxHealth } from '@/app/(protected)/(engine)/utils/heroes'
import {
  arriveAt,
  canDrinkPotion,
  canDrinkPotions,
  canStartNextCycle,
  drinkFlask,
  drinkPotion,
  getEncounter,
  getFlask,
  getFocus,
  getMissingOwner,
  getReachableNodeIds,
  getRevealedNodeIds,
  indexWorld,
  isAbyssOpen,
  loseEncounter,
  planRoute,
  RESPAWN_RESTS,
  rest,
  retreat,
  startNextCycle,
  teleport,
  winEncounter
} from '@/app/(protected)/(engine)/utils/worldMap'
import storedWorld from '@/public/world/world.json'

const index = indexWorld(storedWorld as unknown as World)
const world = index.world

function neighborsOf(nodeId: string): string[] {
  return index.adjacency.get(nodeId)!
}

function findNode(predicate: (node: WorldNode) => boolean): WorldNode {
  return world.nodes.find(predicate)!
}

/** A game standing at a cleared neighbor of `nodeId`, ready to step into it. */
function nextTo(nodeId: string, extra: Partial<GameState> = {}): GameState {
  const neighbor = neighborsOf(nodeId)[0]
  const initial = createInitialGameState('test')

  return {
    ...initial,
    positionNodeId: neighbor,
    clearedNodeIds: [...initial.clearedNodeIds, neighbor],
    ...extra,
    ...(extra.clearedNodeIds ? { clearedNodeIds: [...extra.clearedNodeIds, neighbor] } : {})
  }
}

/** Fights at a point and wins it with full health. */
function win(state: GameState, nodeId: string): GameState {
  const arrived = arriveAt(index, state, nodeId)

  return winEncounter(index, arrived.state, {}).state
}

describe('fog and routes', () => {
  const start = createInitialGameState('test')
  const [first, second] = neighborsOf(world.startNodeId)

  it('reveals the cleared points and their neighbors', () => {
    const revealed = getRevealedNodeIds(index, start)

    expect(revealed.has(world.startNodeId)).toBe(true)
    expect(neighborsOf(world.startNodeId).every((id) => revealed.has(id))).toBe(true)
    expect(revealed.size).toBe(1 + neighborsOf(world.startNodeId).length)
  })

  it('reaches a neighbor but not a point behind a fight not won yet', () => {
    const behind = neighborsOf(first).find(
      (id) => id !== world.startNodeId && !neighborsOf(world.startNodeId).includes(id)
    )!

    expect(planRoute(index, start, first)).toEqual([world.startNodeId, first])
    expect(planRoute(index, start, behind)).toBeNull()
    expect(planRoute(index, start, world.startNodeId)).toBeNull()

    const cleared = win(start, first)

    expect(planRoute(index, { ...cleared, positionNodeId: world.startNodeId }, behind)).toEqual([
      world.startNodeId,
      first,
      behind
    ])
  })

  it('walks the shortest way through cleared points', () => {
    const cleared = win({ ...win(start, first), positionNodeId: world.startNodeId }, second)

    expect(planRoute(index, cleared, first)).toEqual([second, world.startNodeId, first])
  })

  it('lists as reachable exactly the points with a route', () => {
    const rested = rest(index, { ...win(win(start, first), second), positionNodeId: world.startNodeId })

    for (const state of [start, win(start, first), rested]) {
      const reachable = getReachableNodeIds(index, state)

      for (const node of world.nodes) {
        expect(reachable.has(node.id)).toBe(planRoute(index, state, node.id) !== null)
      }
    }
  })
})

describe('fights', () => {
  const start = createInitialGameState('test')
  const combat = neighborsOf(world.startNodeId).find((id) => index.nodes.get(id)!.type === NodeType.COMBAT)!

  it('stops the party at a fight until it is resolved', () => {
    const { state, encounter } = arriveAt(index, start, combat)

    expect(state.positionNodeId).toBe(combat)
    expect(encounter).toMatchObject({ nodeId: combat, kind: EncounterKind.COMBAT, canRetreat: true })
    expect(retreat(index, state, world.startNodeId).positionNodeId).toBe(world.startNodeId)
  })

  it('clears the point on a victory, and the fallen come back with 1 health', () => {
    const { state } = winEncounter(index, arriveAt(index, start, combat).state, { [CharacterId.KAEL]: 0 })

    expect(state.clearedNodeIds).toContain(combat)
    expect(state.characters[0].health).toBe(1)
    expect(getEncounter(index, state, combat)).toBeNull()
  })

  it('counts waking up at a camp after a defeat as a rest', () => {
    const cleared = { ...win(start, combat), positionNodeId: world.startNodeId }
    const defeated = loseEncounter(index, loseEncounter(index, rest(index, cleared)))

    expect(defeated.respawnedNodeIds).toEqual([combat])
  })

  it('starts counting the rests from zero in a game saved before the count existed', () => {
    const cleared = { ...win(start, combat), positionNodeId: world.startNodeId }
    const { restsSinceCleared, ...old } = rest(index, cleared)
    const migrated = migrateGameState({ ...old, respawnedNodeIds: [] }, 8) as GameState

    expect(restsSinceCleared).toEqual({ [combat]: 1 })
    expect(isGameState(old)).toBe(false)
    expect(isGameState(migrated)).toBe(true)
    expect(restTimes(migrated, RESPAWN_RESTS - 1).respawnedNodeIds).toEqual([])
    expect(restTimes(migrated, RESPAWN_RESTS).respawnedNodeIds).toEqual([combat])
  })

  it('has no lost experience waiting in a game saved before it could wait somewhere', () => {
    const { lostXp, ...old } = start
    const migrated = migrateGameState(old, 9) as GameState

    expect(lostXp).toBeNull()
    expect(isGameState(old)).toBe(false)
    expect(migrated.lostXp).toBeNull()
    expect(isGameState(migrated)).toBe(true)
    expect(isGameState({ ...start, lostXp: { nodeId: combat, xp: { kael: 12 } } })).toBe(true)
    expect(isGameState({ ...start, lostXp: { nodeId: combat, xp: { nobody: 12 } } })).toBe(false)
  })

  it('wakes up at the last rest after a defeat, with full health', () => {
    const fighting = { ...arriveAt(index, start, combat).state }
    const defeated = loseEncounter(index, { ...fighting, characters: [{ ...fighting.characters[0], health: 0 }] })

    expect(defeated.positionNodeId).toBe(world.startNodeId)
    expect(defeated.characters[0].health).toBe(getMaxHealth(defeated.characters[0]))
  })

  /** Rests `times` times at the camp where the party stands. */
  function restTimes(state: GameState, times: number): GameState {
    let next = state

    for (let count = 0; count < times; count++) {
      next = rest(index, next)
    }

    return next
  }

  it('brings the common enemies back on the third rest, and they block the way until won again', () => {
    const cleared = { ...win(start, combat), positionNodeId: world.startNodeId }

    expect(RESPAWN_RESTS).toBe(3)

    for (let rests = 1; rests < RESPAWN_RESTS; rests++) {
      const waiting = restTimes(cleared, rests)

      expect(waiting.respawnedNodeIds).toEqual([])
      expect(waiting.restsSinceCleared).toEqual({ [combat]: rests })
      expect(getEncounter(index, waiting, combat)).toBeNull()
    }

    const rested = restTimes(cleared, RESPAWN_RESTS)
    const behind = neighborsOf(combat).find((id) => !rested.clearedNodeIds.includes(id))!

    expect(rested.respawnedNodeIds).toEqual([combat])
    expect(getEncounter(index, rested, combat)?.kind).toBe(EncounterKind.COMBAT)
    expect(planRoute(index, rested, behind)).toBeNull()
    expect(planRoute(index, rested, combat)).toEqual([world.startNodeId, combat])

    expect(rested.restsSinceCleared).toEqual({})
    expect(restTimes(rested, 1).respawnedNodeIds).toEqual([combat])

    const won = win(rested, combat)

    expect(won.respawnedNodeIds).toEqual([])
    expect(restTimes({ ...won, positionNodeId: world.startNodeId }, RESPAWN_RESTS - 1).respawnedNodeIds).toEqual([])
    expect(restTimes({ ...won, positionNodeId: world.startNodeId }, RESPAWN_RESTS).respawnedNodeIds).toEqual([combat])
    expect(planRoute(index, { ...won, positionNodeId: world.startNodeId }, behind)).toEqual([
      world.startNodeId,
      combat,
      behind
    ])
  })

  it('opens a chest without a fight: gold, stones and a potion of its biome', () => {
    const chest = findNode((node) => node.type === NodeType.CHEST)
    const { state, encounter, rewards } = arriveAt(index, nextTo(chest.id), chest.id)
    const stone = BIOME_STONE[chest.biome]
    const potion = BIOME_POTIONS[chest.biome][0]

    expect(encounter).toBeNull()
    expect(state.clearedNodeIds).toContain(chest.id)
    expect(rewards).toEqual([
      { type: 'gold', amount: state.gold },
      { type: 'item', itemId: stone, count: 2 },
      { type: 'item', itemId: potion, count: 1 }
    ])
    expect(state.gold).toBeGreaterThan(0)
    expect(state.inventory).toEqual({ [stone]: 2, [potion]: 1 })
  })
})

describe('weapon reliquaries', () => {
  const reliquaryOf = (weaponId: string) => findNode((node) => node.weaponId === weaponId)

  it('keeps every weapon to find in a reliquary of its biome, guarded by its warden', () => {
    for (const weapon of WEAPONS.filter((item) => item.biome)) {
      const node = reliquaryOf(weapon.id)

      expect(node).toMatchObject({ type: NodeType.RELIQUARY, biome: weapon.biome })
      expect(neighborsOf(node.id)).toHaveLength(1)

      const encounter = getEncounter(index, nextTo(node.id), node.id)!

      expect(encounter.kind).toBe(EncounterKind.WARDEN)
      expect(encounter.canRetreat).toBe(false)
      expect(
        getEncounterPhases(node, encounter)
          .flat()
          .map((spawn) => spawn.speciesId)
      ).toContain(weapon.warden)
    }
  })

  it('opens only for the owner of the weapon and gives it to them', () => {
    const node = reliquaryOf('frost-crossbow')
    const withoutSera = nextTo(node.id)

    expect(getMissingOwner(withoutSera, node)).toBe(CharacterId.SERA)
    expect(planRoute(index, withoutSera, node.id)).toBeNull()

    const withSera = { ...withoutSera, characters: [...withoutSera.characters, createCharacter(CharacterId.SERA, 20)] }

    expect(getMissingOwner(withSera, node)).toBeNull()
    expect(planRoute(index, withSera, node.id)).toHaveLength(2)

    const won = winEncounter(index, arriveAt(index, withSera, node.id).state, {})
    const sera = won.state.characters.find((character) => character.id === CharacterId.SERA)!

    expect(won.rewards).toContainEqual({ type: 'weapon', weaponId: 'frost-crossbow', characterId: CharacterId.SERA })
    expect(sera.weapons).toEqual({ 'ranger-bow': 0, 'frost-crossbow': 0 })
    expect(sera.weaponId).toBe('ranger-bow')
  })

  it("gives Echoes and stones instead when the weapon is already the party's (New Game+)", () => {
    const node = reliquaryOf(getWeapon('dawnbrand').id)
    const state = nextTo(node.id, {
      cycle: 1,
      characters: [{ ...createCharacter(CharacterId.KAEL, 30), weapons: { 'oath-sword': 0, dawnbrand: 7 } }]
    })
    const won = winEncounter(index, arriveAt(index, state, node.id).state, {})

    expect(won.rewards.map((reward) => reward.type)).toEqual(expect.arrayContaining(['echoes', 'item']))
    expect(won.state.characters[0].weapons.dawnbrand).toBe(7)
  })
})

describe('camp bosses and the Amber Flask', () => {
  const captor = findNode((node) => node.bossKind === BossKind.CAPTOR)
  const seals = world.nodes.filter((node) => node.bossKind === BossKind.SEAL)

  it('opens a camp and rescues the captive when a captor falls', () => {
    const state = nextTo(captor.id, {
      characters: [{ ...createCharacter(CharacterId.KAEL, 20), xp: 0, health: 1 }]
    })
    const arrived = arriveAt(index, state, captor.id)

    expect(arrived.encounter).toMatchObject({ kind: EncounterKind.CAPTOR, canRetreat: false })

    const { state: won, rewards } = winEncounter(index, arrived.state, {})

    expect(won.openCampIds).toContain(captor.id)
    expect(won.characters.map((character) => character.id)).toEqual([CharacterId.KAEL, captor.captive])
    expect(won.characters[1]).toMatchObject({ level: 10 })
    expect(rewards).toEqual([
      { type: 'camp', nodeId: captor.id },
      { type: 'character', characterId: captor.captive, level: 10 },
      { type: 'flaskPotency', potency: 15 }
    ])
  })

  it('gives a filled flask charge for each Seal', () => {
    const { state, rewards } = winEncounter(index, arriveAt(index, nextTo(seals[0].id), seals[0].id).state, {})

    expect(getFlask(index, state)).toEqual({ charges: 2, maxCharges: 2, potency: 10 })
    expect(rewards).toContainEqual({ type: 'flaskCharge', maxCharges: 2 })
  })

  it('heals the whole party with the flask and refills it when resting', () => {
    const initial = createInitialGameState('test')
    const hurt = { ...initial, characters: [{ ...initial.characters[0], health: 50 }] }
    const drunk = drinkFlask(index, hurt)

    expect(drunk.characters[0].health).toBe(62)
    expect(drunk.flaskCharges).toBe(0)
    expect(() => drinkFlask(index, drunk)).toThrow()
    expect(rest(index, drunk).flaskCharges).toBe(1)
  })

  it('drinks health and focus potions on the map, one hero at a time, only where there are no enemies', () => {
    const initial = createInitialGameState('test')
    const kael = initial.characters[0]
    const maxHealth = getMaxHealth(kael)
    const { maxFocus } = getFocus(kael)
    const hurt: GameState = {
      ...initial,
      inventory: { 'health-potion': 1, 'focus-potion': 2, antidote: 1 },
      characters: [{ ...kael, health: 10, focus: 0 }]
    }

    expect(canDrinkPotions(hurt)).toBe(true)
    expect(canDrinkPotion(hurt, 'antidote', kael.id)).toBe(false)

    const healed = drinkPotion(hurt, 'health-potion', kael.id)

    expect(healed.characters[0].health).toBe(Math.min(maxHealth, 10 + Math.round(maxHealth * 0.35)))
    expect(healed.inventory['health-potion']).toBe(0)
    expect(() => drinkPotion(healed, 'health-potion', kael.id)).toThrow()

    const focused = drinkPotion(healed, 'focus-potion', kael.id)

    expect(focused.characters[0].focus).toBe(Math.round(maxFocus * 0.5))
    expect(focused.characters[0].health).toBe(healed.characters[0].health)
    expect(focused.inventory['focus-potion']).toBe(1)

    // Not for the fallen, nor when already full, nor at a point with enemies.
    expect(canDrinkPotion({ ...hurt, characters: [{ ...kael, health: 0 }] }, 'health-potion', kael.id)).toBe(false)
    expect(canDrinkPotion({ ...hurt, characters: [{ ...kael, focus: maxFocus }] }, 'focus-potion', kael.id)).toBe(false)
    const elsewhere = { ...hurt, positionNodeId: neighborsOf(world.startNodeId)[0] }

    expect(canDrinkPotions(elsewhere)).toBe(false)
    expect(() => drinkPotion(elsewhere, 'focus-potion', kael.id)).toThrow()
  })

  it('teleports only between open camps', () => {
    const won = winEncounter(index, arriveAt(index, nextTo(captor.id), captor.id).state, {}).state

    expect(teleport(won, world.startNodeId).positionNodeId).toBe(world.startNodeId)
    expect(() => teleport({ ...won, positionNodeId: neighborsOf(captor.id)[0] }, world.startNodeId)).toThrow()
    expect(() => teleport(won, neighborsOf(captor.id)[0])).toThrow()
  })

  it('opens the door of the Abyss once the two Seals fall, and its guardian has to be beaten', () => {
    const closed = nextTo(world.gateNodeId)

    expect(isAbyssOpen(index, closed)).toBe(false)
    expect(planRoute(index, closed, world.gateNodeId)).toBeNull()

    const open = nextTo(world.gateNodeId, { clearedNodeIds: [world.startNodeId, ...seals.map((seal) => seal.id)] })
    const arrived = arriveAt(index, open, world.gateNodeId)

    expect(planRoute(index, open, world.gateNodeId)).toHaveLength(2)
    expect(arrived.encounter).toMatchObject({ kind: EncounterKind.GATE, bossId: 'vael', canRetreat: false })

    const won = winEncounter(index, arrived.state, {}).state

    expect(won.clearedNodeIds).toContain(world.gateNodeId)
    expect(getFlask(index, won).maxCharges).toBe(4)
  })

  it('has its Amber Embers on real mini bosses', () => {
    for (const bossId of EMBER_MINIBOSS_IDS) {
      expect(findNode((node) => node.bossId === bossId)?.bossKind).toBe(BossKind.MINIBOSS)
    }
  })
})

describe('New Game+', () => {
  const crisol = world.finalBossNodeId
  const captor = findNode((node) => node.bossKind === BossKind.CAPTOR)
  const sanctuary = findNode((node) => node.type === NodeType.SANCTUARY && !!node.runeIndex)
  const beaten: GameState = {
    ...createInitialGameState('test'),
    characters: [
      {
        ...createCharacter(CharacterId.KAEL, 60),
        weaponId: 'dawnbrand',
        weapons: { 'oath-sword': 12, dawnbrand: 3 },
        skillLevels: { 'kael-firm-cut': 2 },
        xp: 0,
        health: 1
      },
      { ...createCharacter(captor.captive!, 55), xp: 0, health: 1 }
    ],
    clearedNodeIds: [world.startNodeId, crisol, captor.id],
    openCampIds: [world.startNodeId, captor.id],
    positionNodeId: captor.id,
    gold: 5000,
    inventory: { 'health-potion': 3 },
    runes: [sanctuary.runeIndex!],
    runeWins: { [sanctuary.runeIndex!]: 4 },
    echoes: 7,
    tears: 2,
    scholarSold: 2,
    kills: { 'thorn-boar': 30 }
  }

  it('starts from a camp once Crisol fell', () => {
    expect(canStartNextCycle(index, beaten)).toBe(true)
    expect(canStartNextCycle(index, { ...beaten, clearedNodeIds: [world.startNodeId, captor.id] })).toBe(false)
    expect(canStartNextCycle(index, { ...beaten, positionNodeId: crisol })).toBe(false)
    expect(() => startNextCycle(index, { ...beaten, positionNodeId: crisol })).toThrow()
  })

  it('starts the world over and keeps the characters, rested', () => {
    const next = startNextCycle(index, beaten)

    expect(next).toMatchObject({
      cycle: 1,
      positionNodeId: world.startNodeId,
      openCampIds: [world.startNodeId],
      clearedNodeIds: [world.startNodeId],
      gold: 0,
      inventory: {},
      scholarSold: 0,
      runes: beaten.runes,
      runeWins: beaten.runeWins,
      echoes: 7,
      tears: 2,
      kills: beaten.kills
    })
    expect(next.characters.map((character) => [character.id, character.level, character.weapons])).toEqual([
      [CharacterId.KAEL, 60, { 'oath-sword': 12, dawnbrand: 3 }],
      [captor.captive, 55, { [getStartingWeapon(captor.captive!).id]: 0 }]
    ])
    expect(next.characters.every((character) => character.health === getMaxHealth(character))).toBe(true)
  })

  it('raises the level of every fight in each cycle', () => {
    const next = startNextCycle(index, beaten)
    const fight = neighborsOf(world.startNodeId).find((id) => index.nodes.get(id)!.type === NodeType.COMBAT)!

    expect(getEncounter(index, next, fight)!.level).toBe(index.nodes.get(fight)!.level! + CYCLE_LEVELS)
  })

  it('gives Echoes and stones instead of a captive or a rune the party already has', () => {
    const next = { ...startNextCycle(index, beaten), cycle: 2 }
    const freed = win(nextTo(captor.id, { ...next, clearedNodeIds: next.clearedNodeIds }), captor.id)

    expect(freed.characters).toHaveLength(2)
    expect(freed.echoes).toBe(7 + CAPTOR_ECHOES * 2)
    expect(freed.inventory).toMatchObject({ [BIOME_STONE[captor.biome]]: CAPTOR_STONES })

    const { state: arrived } = arriveAt(index, nextTo(sanctuary.id, next), sanctuary.id)
    const { state: won, rewards } = winEncounter(index, arrived, {})

    expect(won.runes).toEqual(beaten.runes)
    expect(rewards[0]).toMatchObject({ type: 'echoes' })
    expect(won.echoes).toBeGreaterThan(7)
  })
})
