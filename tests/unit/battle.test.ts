import { describe, expect, it } from 'vitest'
import { BattleState, EnemySpawn } from '@/app/(protected)/(engine)/models/BattleState'
import { Biome } from '@/app/(protected)/(engine)/models/Biome'
import { CharacterId } from '@/app/(protected)/(engine)/models/CharacterId'
import { StatusType } from '@/app/(protected)/(engine)/models/StatusType'
import {
  chooseEnemyAction,
  createBattle,
  getCombatant,
  getFighters,
  getTurnQueue,
  nextTurn,
  performAction
} from '@/app/(protected)/(engine)/utils/battle'
import { createCharacter } from '@/app/(protected)/(engine)/utils/gameState'
import { simulateBattle, winRate } from '@/tests/support/battleSimulator'

const kael = createCharacter(CharacterId.KAEL, 5)

function battle(phases: EnemySpawn[][], heroes = [kael], canRetreat = true): BattleState {
  return createBattle({ heroes, phases, seed: 42, biome: Biome.MEADOWS, canRetreat }).state
}

/** Gives the turn to a fighter (skipping the timeline). */
function turnOf(state: BattleState, id: string): BattleState {
  return {
    ...state,
    actorId: id,
    combatants: state.combatants.map((combatant) =>
      combatant.id === id ? { ...combatant, focus: combatant.stats.maxFocus } : combatant
    )
  }
}

describe('battle setup and turns', () => {
  it('puts three heroes on the field and the rest in reserve', () => {
    const heroes = [CharacterId.KAEL, CharacterId.SERA, CharacterId.BRANN, CharacterId.OREN].map((id) =>
      createCharacter(id, 3)
    )
    const state = battle([[{ speciesId: 'thorn-boar', level: 3 }]], heroes)

    expect(getFighters(state, 'hero').map((hero) => hero.characterId)).toEqual([
      CharacterId.KAEL,
      CharacterId.SERA,
      CharacterId.BRANN
    ])
    expect(getCombatant(state, 'h-oren').reserve).toBe(true)
    expect(getFighters(state, 'enemy')).toHaveLength(1)
  })

  it('gives more turns to the faster fighters', () => {
    const state = battle([[{ speciesId: 'thorn-boar', level: 1 }]])
    const fast: BattleState = {
      ...state,
      combatants: state.combatants.map((combatant) =>
        combatant.side === 'hero' ? { ...combatant, stats: { ...combatant.stats, speed: 300 } } : combatant
      )
    }
    const queue = getTurnQueue(fast, 12)

    expect(queue.filter((id) => id === 'h-kael').length).toBeGreaterThanOrEqual(8)

    const { state: started } = nextTurn(fast)

    expect(started.actorId).toBe(queue[0])
  })

  it('loses the turn while frozen', () => {
    const state = battle([[{ speciesId: 'thorn-boar', level: 1 }]])
    const frozen: BattleState = {
      ...state,
      combatants: state.combatants.map((combatant) =>
        combatant.side === 'hero'
          ? { ...combatant, initiative: 99, statuses: [{ type: StatusType.FREEZE, turns: 1 }] }
          : combatant
      )
    }
    const { state: next, events } = nextTurn(frozen)

    expect(events).toContainEqual({ type: 'skip', actorId: 'h-kael', status: StatusType.FREEZE })
    expect(next.actorId).toBe('e1-1')
    expect(getCombatant(next, 'h-kael').statuses).toEqual([])
  })

  it('hurts with poison at the start of the turn', () => {
    const state = battle([[{ speciesId: 'thorn-boar', level: 1 }]])
    const poisoned: BattleState = {
      ...state,
      combatants: state.combatants.map((combatant) =>
        combatant.side === 'hero'
          ? { ...combatant, initiative: 99, statuses: [{ type: StatusType.POISON, turns: 2 }] }
          : combatant
      )
    }
    const { state: next, events } = nextTurn(poisoned)
    const tick = events.find((event) => event.type === 'statusTick')

    expect(tick).toMatchObject({ targetId: 'h-kael', status: StatusType.POISON })
    expect(getCombatant(next, 'h-kael').health).toBe(kael.health - (tick as { amount: number }).amount)
  })
})

describe('damage', () => {
  it('hits harder where the enemy is weak, and an immune one takes nothing', () => {
    const state = turnOf(
      battle([
        [
          { speciesId: 'thorn-boar', level: 5 },
          { speciesId: 'sand-worm', level: 5 }
        ]
      ]),
      'h-kael'
    )
    const flame = performAction(state, { type: 'skill', skillId: 'kael-flame-edge', targetIds: ['e1-1'] })

    expect(flame.events).toContainEqual(expect.objectContaining({ type: 'damage', targetId: 'e1-1', weak: true }))

    const brann = createCharacter(CharacterId.BRANN, 5)
    const quake = performAction(turnOf(battle([[{ speciesId: 'sand-worm', level: 5 }]], [brann]), 'h-brann'), {
      type: 'skill',
      skillId: 'brann-earthsplitter',
      targetIds: []
    })

    expect(quake.events).toContainEqual({ type: 'immune', targetId: 'e1-1' })
  })

  it('spends focus and refuses a special without enough of it', () => {
    const state = turnOf(battle([[{ speciesId: 'thorn-boar', level: 5 }]]), 'h-kael')
    const before = getCombatant(state, 'h-kael').focus
    const { state: after } = performAction(state, { type: 'skill', skillId: 'kael-firm-cut', targetIds: ['e1-1'] })

    expect(getCombatant(after, 'h-kael').focus).toBe(before - 12)

    const empty = {
      ...state,
      combatants: state.combatants.map((combatant) =>
        combatant.side === 'hero' ? { ...combatant, focus: 0 } : combatant
      )
    }

    expect(() => performAction(empty, { type: 'skill', skillId: 'kael-firm-cut', targetIds: ['e1-1'] })).toThrow()
  })

  it('heals an ally with a healing skill', () => {
    const oren = createCharacter(CharacterId.OREN, 5)
    const state = turnOf(battle([[{ speciesId: 'thorn-boar', level: 5 }]], [{ ...kael, health: 20 }, oren]), 'h-oren')
    const { state: after, events } = performAction(state, {
      type: 'skill',
      skillId: 'oren-mend',
      targetIds: ['h-kael']
    })

    expect(events).toContainEqual(expect.objectContaining({ type: 'heal', targetId: 'h-kael' }))
    expect(getCombatant(after, 'h-kael').health).toBeGreaterThan(20)
  })
})

describe('phases, reserves and bosses', () => {
  /** A battle where every enemy on the field has 1 health left. */
  function nearlyWon(state: BattleState): BattleState {
    return {
      ...state,
      combatants: state.combatants.map((combatant) =>
        combatant.side === 'enemy' ? { ...combatant, health: 1 } : combatant
      )
    }
  }

  it('brings the next phase when the field is cleared, keeping the health of the heroes', () => {
    const state = turnOf(
      nearlyWon(battle([[{ speciesId: 'thorn-boar', level: 1 }], [{ speciesId: 'road-bandit', level: 1 }]])),
      'h-kael'
    )
    const { state: after, events } = performAction(state, {
      type: 'skill',
      skillId: 'kael-strike',
      targetIds: ['e1-1']
    })

    expect(events).toContainEqual({ type: 'phase', phase: 1, enemyIds: ['e2-1'] })
    expect(after.outcome).toBeNull()
    expect(getFighters(after, 'enemy').map((enemy) => enemy.speciesId)).toEqual(['road-bandit'])
    expect(after.kills).toEqual({ 'thorn-boar': 1 })
    expect(after.xp).toBeGreaterThan(0)
  })

  it('ends in victory after the last phase', () => {
    const state = turnOf(nearlyWon(battle([[{ speciesId: 'thorn-boar', level: 1 }]])), 'h-kael')
    const { state: after } = performAction(state, { type: 'skill', skillId: 'kael-sweep', targetIds: [] })

    expect(after.outcome).toBe('victory')
    expect(after.gold).toBeGreaterThan(0)
  })

  it('fills the next health bar of a boss', () => {
    const state = turnOf(nearlyWon(battle([[{ speciesId: 'bandit-chief', level: 7 }]])), 'h-kael')
    const { state: after, events } = performAction(state, {
      type: 'skill',
      skillId: 'kael-strike',
      targetIds: ['e1-1']
    })
    const boss = getCombatant(after, 'e1-1')

    expect(events).toContainEqual({ type: 'nextBar', targetId: 'e1-1', bars: 1 })
    expect(boss.health).toBe(boss.stats.maxHealth)
    expect(after.outcome).toBeNull()
  })

  it('sends the reserves in when the active heroes fall, and loses when nobody is left', () => {
    const heroes = [CharacterId.KAEL, CharacterId.SERA, CharacterId.BRANN, CharacterId.OREN].map((id) => ({
      ...createCharacter(id, 3),
      health: 1
    }))
    let state = battle([[{ speciesId: 'boar-matriarch', level: 15 }]], heroes)
    const reservesEvents = []

    for (let turn = 0; turn < 200 && !state.outcome; turn++) {
      const started = nextTurn(state)

      state = started.state

      if (state.outcome) {
        break
      }

      const actor = getCombatant(state, state.actorId!)
      const step = performAction(
        state,
        actor.side === 'enemy'
          ? chooseEnemyAction(state)
          : { type: 'skill', skillId: actor.skills[0], targetIds: ['e1-1'] }
      )

      reservesEvents.push(...step.events.filter((event) => event.type === 'reserves'))
      state = step.state
    }

    expect(reservesEvents).toEqual([{ type: 'reserves', heroIds: ['h-oren'] }])
    expect(getCombatant(state, 'h-oren').fought).toBe(true)
    expect(state.outcome).toBe('defeat')
  })

  it('does not let the party flee from a boss', () => {
    const state = turnOf(battle([[{ speciesId: 'boar-matriarch', level: 10 }]], [kael], false), 'h-kael')

    expect(() => performAction(state, { type: 'retreat' })).toThrow()
    expect(
      performAction(turnOf(battle([[{ speciesId: 'thorn-boar', level: 1 }]]), 'h-kael'), { type: 'retreat' }).state
        .outcome
    ).toBe('retreat')
  })
})

describe('enemy AI', () => {
  it('heals a badly hurt ally', () => {
    const state = battle([
      [
        { speciesId: 'hedge-sprite', level: 5 },
        { speciesId: 'thorn-boar', level: 5 }
      ]
    ])
    const hurt: BattleState = turnOf(
      {
        ...state,
        combatants: state.combatants.map((combatant) =>
          combatant.id === 'e1-2' ? { ...combatant, health: 5 } : combatant
        )
      },
      'e1-1'
    )

    expect(chooseEnemyAction(hurt)).toEqual({ type: 'skill', skillId: 'mend', targetIds: ['e1-2'] })
  })

  it('always picks an action it can perform', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const result = simulateBattle({
        heroes: [kael],
        phases: [
          [
            { speciesId: 'wheat-spirit', level: 5 },
            { speciesId: 'hedge-sprite', level: 5 },
            { speciesId: 'road-bandit', level: 5 }
          ]
        ],
        seed,
        biome: Biome.MEADOWS,
        canRetreat: true
      })

      expect(result.outcome).not.toBeNull()
    }
  })
})

describe('balance of the Meadows', () => {
  const setup = (level: number, phases: EnemySpawn[][]) => ({
    heroes: [createCharacter(CharacterId.KAEL, level)],
    phases,
    biome: Biome.MEADOWS,
    canRetreat: true
  })

  it('lets Kael at level 1 win the first fights', () => {
    expect(
      winRate(
        setup(1, [
          [
            { speciesId: 'thorn-boar', level: 1 },
            { speciesId: 'road-bandit', level: 1 }
          ]
        ]),
        100
      )
    ).toBeGreaterThan(0.9)
  })

  it('makes the camp bosses a challenge at their level but beatable a few levels later', () => {
    const matriarch = [[{ speciesId: 'boar-matriarch', level: 10 }]]

    expect(winRate(setup(10, matriarch), 60)).toBeLessThan(0.5)
    expect(winRate(setup(13, matriarch), 60)).toBeGreaterThan(0.8)
  })
})
