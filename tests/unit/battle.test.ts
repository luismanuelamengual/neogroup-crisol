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
  getUsableItems,
  getUsableSkills,
  nextTurn,
  performAction
} from '@/app/(protected)/(engine)/utils/battle'
import { createCharacter } from '@/app/(protected)/(engine)/utils/heroes'
import { simulateBattle, winRate } from '@/tests/support/battleSimulator'
import { buildCharacter } from '@/tests/support/builds'

/** Kael at level 5 with Sweep and Flame Edge bought. */
const kael = { ...createCharacter(CharacterId.KAEL, 5), talents: ['kael-sharpness', 'kael-sweep', 'kael-flame-edge'] }

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

    const brann = { ...createCharacter(CharacterId.BRANN, 5), talents: ['brann-earthsplitter'] }
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
    heroes: [buildCharacter(CharacterId.KAEL, level)],
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

describe('items, bonuses and loot', () => {
  const field = (heroes = [kael], items: Record<string, number> = {}) =>
    createBattle({
      heroes,
      phases: [[{ speciesId: 'thorn-boar', level: 5 }]],
      seed: 7,
      biome: Biome.MEADOWS,
      canRetreat: true,
      items
    }).state
  const hurtHero = (state: BattleState, health: number): BattleState => ({
    ...state,
    combatants: state.combatants.map((combatant) => (combatant.side === 'hero' ? { ...combatant, health } : combatant))
  })

  it('carries only the consumables, and spends one per use', () => {
    const state = turnOf(hurtHero(field([kael], { 'health-potion': 2, 'rough-stone': 4 }), 10), 'h-kael')

    expect(state.items).toEqual({ 'health-potion': 2 })
    expect(getUsableItems(state).map((item) => item.id)).toEqual(['health-potion'])

    const { state: after, events } = performAction(state, {
      type: 'item',
      itemId: 'health-potion',
      targetIds: ['h-kael']
    })
    const hero = getCombatant(after, 'h-kael')

    expect(after.items['health-potion']).toBe(1)
    expect(hero.health).toBe(10 + Math.round(hero.stats.maxHealth * 0.35))
    expect(events[0]).toEqual({ type: 'item', actorId: 'h-kael', itemId: 'health-potion', targetIds: ['h-kael'] })
  })

  it('brings a fallen ally back with a revival potion', () => {
    const sera = createCharacter(CharacterId.SERA, 5)
    const base = field([kael, sera], { 'revive-potion': 1 })
    const state = turnOf(
      {
        ...base,
        combatants: base.combatants.map((combatant) =>
          combatant.id === 'h-sera' ? { ...combatant, health: 0 } : combatant
        )
      },
      'h-kael'
    )
    const { state: after, events } = performAction(state, {
      type: 'item',
      itemId: 'revive-potion',
      targetIds: ['h-sera']
    })

    expect(getCombatant(after, 'h-sera').health).toBeGreaterThan(0)
    expect(events).toContainEqual(expect.objectContaining({ type: 'revive', targetId: 'h-sera' }))
    expect(getFighters(after, 'hero')).toHaveLength(2)
  })

  it('cures the harmful statuses with an antidote and burns every enemy with a bomb', () => {
    const base = field([kael], { antidote: 1, 'fire-bomb': 1 })
    const poisoned = turnOf(
      {
        ...base,
        combatants: base.combatants.map((combatant) =>
          combatant.side === 'hero'
            ? {
                ...combatant,
                statuses: [
                  { type: StatusType.POISON, turns: 3 },
                  { type: StatusType.ATTACK_UP, turns: 3 }
                ]
              }
            : combatant
        )
      },
      'h-kael'
    )
    const cured = performAction(poisoned, { type: 'item', itemId: 'antidote', targetIds: ['h-kael'] }).state

    expect(getCombatant(cured, 'h-kael').statuses.map((status) => status.type)).toEqual([StatusType.ATTACK_UP])

    const bombed = performAction(turnOf(cured, 'h-kael'), { type: 'item', itemId: 'fire-bomb', targetIds: [] })

    expect(bombed.events).toContainEqual(expect.objectContaining({ type: 'damage', targetId: 'e1-1', weak: true }))
  })

  it('heals with lifesteal and avoids damage with guard', () => {
    const leech = { ...kael, runes: [1] }
    const state = turnOf(hurtHero(field([leech]), 20), 'h-kael')
    const { events } = performAction(state, { type: 'skill', skillId: 'kael-strike', targetIds: ['e1-1'] })

    expect(getCombatant(state, 'h-kael').bonuses?.lifesteal).toBeGreaterThan(0)
    expect(events).toContainEqual(expect.objectContaining({ type: 'heal', targetId: 'h-kael' }))

    const guarded = (guard: number) => {
      const base = field()
      const enemyTurn = {
        ...base,
        actorId: 'e1-1',
        combatants: base.combatants.map((combatant) =>
          combatant.side === 'hero' ? { ...combatant, bonuses: { ...combatant.bonuses!, guard } } : combatant
        )
      }

      return performAction(enemyTurn, { type: 'skill', skillId: 'gore', targetIds: ['h-kael'] }).events.find(
        (event) => event.type === 'damage'
      )
    }

    expect((guarded(0.5) as { amount: number }).amount).toBeLessThan((guarded(0) as { amount: number }).amount)
  })

  it('makes the upgrades of the tree change the specials', () => {
    const upgraded = { ...kael, talents: [...kael.talents, 'kael-precision', 'kael-deep-cut'] }
    const cut = (hero: typeof kael) =>
      getUsableSkills(turnOf(field([hero]), 'h-kael'), 'h-kael').find((skill) => skill.id === 'kael-firm-cut')!

    expect(cut(upgraded).cost).toBe(cut(kael).cost - 2)
    expect(cut(upgraded).power).toBeCloseTo(cut(kael).power * 1.3)
  })

  it('drops stones from a boss', () => {
    const state = turnOf(
      {
        ...createBattle({
          heroes: [kael],
          phases: [[{ speciesId: 'bandit-chief', level: 1 }]],
          seed: 3,
          biome: Biome.MEADOWS,
          canRetreat: false
        }).state
      },
      'h-kael'
    )
    const nearlyDead = {
      ...state,
      combatants: state.combatants.map((combatant) =>
        combatant.side === 'enemy' ? { ...combatant, health: 1, bars: 1 } : combatant
      )
    }
    const { state: after } = performAction(nearlyDead, { type: 'skill', skillId: 'kael-strike', targetIds: ['e1-1'] })

    expect(after.outcome).toBe('victory')
    expect(after.loot['rough-stone']).toBe(4)
  })
})

describe('the mechanics of each hero', () => {
  const boar = [[{ speciesId: 'thorn-boar', level: 5 }]]

  it('lets Kael switch between the offense and the defense stance', () => {
    const state = turnOf(battle(boar), 'h-kael')

    expect(getCombatant(state, 'h-kael').stance).toBe('offense')

    const { state: after, events } = performAction(state, {
      type: 'skill',
      skillId: 'kael-stance',
      targetIds: ['h-kael']
    })

    expect(getCombatant(after, 'h-kael').stance).toBe('defense')
    expect(events).toContainEqual({ type: 'stance', targetId: 'h-kael', stance: 'defense' })
  })

  it('charges Ysolde with the elements she casts, and spends them all at once', () => {
    const ysolde = { ...createCharacter(CharacterId.YSOLDE, 20), talents: ['ysolde-combustion'] }
    const state = turnOf(battle([[{ speciesId: 'thorn-boar', level: 30 }]], [ysolde]), 'h-ysolde')
    const { state: charged } = performAction(state, { type: 'skill', skillId: 'ysolde-fireball', targetIds: ['e1-1'] })

    expect(getCombatant(charged, 'h-ysolde').charges).toEqual(['fire'])

    const { state: spent } = performAction(turnOf(charged, 'h-ysolde'), {
      type: 'skill',
      skillId: 'ysolde-combustion',
      targetIds: ['e1-1']
    })

    expect(getCombatant(spent, 'h-ysolde').charges).toEqual([])
  })

  it('lets Oren bring a fallen hero back', () => {
    const oren = { ...createCharacter(CharacterId.OREN, 30), talents: ['oren-rebirth'] }
    const start = battle(boar, [kael, oren])
    const fallen: BattleState = {
      ...start,
      combatants: start.combatants.map((combatant) =>
        combatant.id === 'h-kael' ? { ...combatant, health: 0 } : combatant
      )
    }
    const { state, events } = performAction(turnOf(fallen, 'h-oren'), {
      type: 'skill',
      skillId: 'oren-rebirth',
      targetIds: ['h-kael']
    })

    expect(getCombatant(state, 'h-kael').health).toBeGreaterThan(0)
    expect(events.some((event) => event.type === 'revive')).toBe(true)
  })

  it('teaches a boss new skills when one of its bars empties', () => {
    const start = battle([[{ speciesId: 'crisol', level: 50 }]])
    const boss = getFighters(start, 'enemy')[0]
    const nearly: BattleState = {
      ...start,
      combatants: start.combatants.map((combatant) =>
        combatant.id === boss.id ? { ...combatant, health: 1 } : combatant
      )
    }
    const { state } = performAction(turnOf(nearly, 'h-kael'), {
      type: 'skill',
      skillId: 'kael-strike',
      targetIds: [boss.id]
    })

    expect(getCombatant(state, boss.id).bars).toBe(2)
    expect(getCombatant(state, boss.id).skills).toEqual(expect.arrayContaining(['soul-drain', 'war-cry']))
  })
})
