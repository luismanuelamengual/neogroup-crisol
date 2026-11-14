import { describe, expect, it } from 'vitest'
import {
  BASIC_POTION_CHANCE,
  BASIC_POTIONS,
  BIOME_DROPS,
  BOSS_ITEMS,
  getItem,
  ITEMS,
  MAX_BASIC_POTIONS,
  MERCHANT_STOCK
} from '@/app/(protected)/(engine)/data/items'
import { RUNES } from '@/app/(protected)/(engine)/data/runes'
import { BattleState, EnemySpawn } from '@/app/(protected)/(engine)/models/BattleState'
import { Biome } from '@/app/(protected)/(engine)/models/Biome'
import { CharacterId } from '@/app/(protected)/(engine)/models/CharacterId'
import { CharacterState } from '@/app/(protected)/(engine)/models/CharacterState'
import { DamageType } from '@/app/(protected)/(engine)/models/DamageType'
import { Perk } from '@/app/(protected)/(engine)/models/Perk'
import { Stance } from '@/app/(protected)/(engine)/models/Stance'
import { StatusType } from '@/app/(protected)/(engine)/models/StatusType'
import {
  canRetreat,
  chooseEnemyAction,
  createBattle,
  getCombatant,
  getFighters,
  getItemsLeft,
  getTurnQueue,
  getUsableItems,
  getUsableSkills,
  MAX_ITEMS_PER_TURN,
  MAX_SHIELDS,
  nextTurn,
  performAction
} from '@/app/(protected)/(engine)/utils/battle'
import { createCharacter, getKnownSkills } from '@/app/(protected)/(engine)/utils/heroes'
import { simulateBattle, winRate } from '@/tests/support/battleSimulator'
import { buildCharacter } from '@/tests/support/builds'

/** A character with specials of its tree learned (at level 1, besides the levels given) and every one it knows equipped. */
function withSkills(character: CharacterState, skills: string[], levels: Record<string, number> = {}): CharacterState {
  const learned = {
    ...character,
    skillLevels: { ...character.skillLevels, ...Object.fromEntries(skills.map((skill) => [skill, 1])), ...levels }
  }

  return { ...learned, skills: getKnownSkills(learned) }
}

/** Kael at level 5 with Sweep and Flame Edge learned. */
const kael = withSkills(createCharacter(CharacterId.KAEL, 5), ['kael-sweep', 'kael-flame-edge'])

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

    const brann = withSkills(createCharacter(CharacterId.BRANN, 5), ['brann-earthsplitter'])
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

  it('only lets the party retreat with every hero alive, reserves included', () => {
    const state = turnOf(battle([[{ speciesId: 'thorn-boar', level: 1 }]]), 'h-kael')

    expect(canRetreat(state)).toBe(true)

    const fallen = structuredClone(state)

    fallen.combatants.push({
      ...structuredClone(getCombatant(state, 'h-kael')),
      id: 'h-fallen',
      health: 0,
      reserve: true
    })

    expect(canRetreat(fallen)).toBe(false)
    expect(() => performAction(fallen, { type: 'retreat' })).toThrow()
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
    const leech = { ...kael, runes: [RUNES.find((rune) => rune.id === 'blood-echo')!.index] }
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

  it('makes the levels of the tree change the specials', () => {
    const upgraded = withSkills(kael, [], { 'kael-firm-cut': 5, 'kael-flame-edge': 4 })
    const skill = (hero: typeof kael, id: string) =>
      getUsableSkills(turnOf(field([hero]), 'h-kael'), 'h-kael').find((candidate) => candidate.id === id)!

    expect(skill(upgraded, 'kael-firm-cut').cost).toBe(skill(kael, 'kael-firm-cut').cost - 4)
    expect(skill(upgraded, 'kael-firm-cut').power).toBeCloseTo(skill(kael, 'kael-firm-cut').power * 2)
    expect(skill(upgraded, 'kael-flame-edge').statuses).toEqual([
      { type: StatusType.BURN, chance: expect.closeTo(0.45), turns: 3 }
    ])
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

  it('lets each enemy leave each basic potion now and then, a little more often than some food', () => {
    const lootOf = (items: Record<string, number>, seed: number, elite = false) => {
      const state = turnOf(
        createBattle({
          heroes: [kael],
          phases: [[{ speciesId: 'thorn-boar', level: 1, elite }]],
          seed,
          biome: Biome.MEADOWS,
          canRetreat: true,
          items
        }).state,
        'h-kael'
      )
      const nearlyDead = {
        ...state,
        combatants: state.combatants.map((combatant) =>
          combatant.side === 'enemy' ? { ...combatant, health: 1 } : combatant
        )
      }
      const { state: after } = performAction(nearlyDead, { type: 'skill', skillId: 'kael-strike', targetIds: ['e1-1'] })

      expect(after.outcome).toBe('victory')

      return after.loot
    }

    const rate = (items: Record<string, number>, count: (loot: Record<string, number>) => number, elite = false) => {
      let won = 0

      for (let seed = 1; seed <= 3000; seed++) {
        won += count(lootOf(items, seed, elite))
      }

      return won / 3000
    }

    const of = (itemId: string) => (loot: Record<string, number>) => loot[itemId] ?? 0
    const food = (loot: Record<string, number>) =>
      Object.entries(loot)
        .filter(([itemId]) => getItem(itemId).category === 'food')
        .reduce((sum, [, count]) => sum + count, 0)

    expect(rate({}, of('health-potion'))).toBeCloseTo(BASIC_POTION_CHANCE.normal, 1)
    expect(rate({}, of('focus-potion'))).toBeCloseTo(BASIC_POTION_CHANCE.normal, 1)
    expect(rate({}, of('health-potion'), true)).toBeCloseTo(BASIC_POTION_CHANCE.elite, 1)
    expect(BASIC_POTION_CHANCE.normal).toBeGreaterThan(rate({}, food) * 0.9)
    expect(BASIC_POTION_CHANCE.normal).toBeLessThan(rate({}, food) * 1.6)
    expect(rate({ 'focus-potion': MAX_BASIC_POTIONS }, of('focus-potion'))).toBe(0)
  })
})

describe('items per turn, shields and the consumables', () => {
  const field = (items: Record<string, number>, heroes = [kael], speciesId = 'thorn-boar', level = 5) =>
    turnOf(
      createBattle({
        heroes,
        phases: [[{ speciesId, level }]],
        seed: 11,
        biome: Biome.MEADOWS,
        canRetreat: true,
        items
      }).state,
      'h-kael'
    )
  const consume = (state: BattleState, itemId: string, targetIds = ['h-kael']) =>
    performAction(state, { type: 'item', itemId, targetIds })
  const enemyActs = (state: BattleState, skillId = 'gore') =>
    performAction(
      {
        ...turnOf(state, 'e1-1'),
        combatants: turnOf(state, 'e1-1').combatants.map((combatant) =>
          combatant.id === 'e1-1' ? { ...combatant, skills: [...combatant.skills, skillId] } : combatant
        )
      },
      { type: 'skill', skillId, targetIds: ['h-kael'] }
    )

  it('keeps the turn after an item, up to three, and ends it with the third', () => {
    const start = field({ 'crusty-bread': 3, 'honey-cake': 1, 'might-tonic': 1 })
    const one = consume(start, 'crusty-bread').state

    expect(one.actorId).toBe('h-kael')
    expect(getItemsLeft(one)).toBe(MAX_ITEMS_PER_TURN - 1)

    const two = consume(one, 'honey-cake').state

    expect(two.actorId).toBe('h-kael')
    expect(getItemsLeft(two)).toBe(1)

    // A third item ends the turn.
    const three = consume(two, 'crusty-bread').state

    expect(three.actorId).toBeNull()
    expect(three.items['crusty-bread']).toBe(1)

    // Or, after one or two, the hero can still attack (which ends the turn).
    const attacked = performAction(two, { type: 'skill', skillId: 'kael-strike', targetIds: ['e1-1'] }).state

    expect(attacked.actorId).toBeNull()
    expect(attacked.itemsUsed).toBe(0)

    // The next turn of the hero starts with every item again.
    const next = nextTurn({
      ...three,
      combatants: three.combatants.map((combatant) =>
        combatant.side === 'hero' ? { ...combatant, initiative: 99.9 } : { ...combatant, initiative: 0 }
      )
    }).state

    expect(next.actorId).toBe('h-kael')
    expect(getItemsLeft(next)).toBe(MAX_ITEMS_PER_TURN)
    expect(() => consume(three, 'crusty-bread')).toThrow()
  })

  it('stacks shields, and each one stops a whole hit', () => {
    const start = field({ 'bulwark-crystal': 1, 'guard-seal': 1 })
    const first = consume(start, 'bulwark-crystal')

    expect(first.events).toContainEqual({ type: 'shields', targetId: 'h-kael', change: 2, shields: 2 })

    let state = consume(first.state, 'guard-seal').state

    expect(getCombatant(state, 'h-kael').shields).toBe(3)

    for (const left of [2, 1, 0]) {
      const hit = enemyActs(state)

      expect(hit.events.some((event) => event.type === 'damage')).toBe(false)
      expect(hit.events).toContainEqual({ type: 'shields', targetId: 'h-kael', change: -1, shields: left })
      state = hit.state
    }

    expect(enemyActs(state).events.some((event) => event.type === 'damage')).toBe(true)
  })

  it('gives shields with skills too, to heroes and enemies, up to the most a fighter can carry', () => {
    const guardian = withSkills(kael, ['kael-guard'])
    const guard = performAction(field({}, [guardian]), { type: 'skill', skillId: 'kael-guard', targetIds: ['h-kael'] })

    expect(getCombatant(guard.state, 'h-kael').shields).toBe(1)

    const hardened = performAction(
      {
        ...turnOf(guard.state, 'e1-1'),
        combatants: turnOf(guard.state, 'e1-1').combatants.map((combatant) =>
          combatant.id === 'e1-1' ? { ...combatant, skills: [...combatant.skills, 'harden'] } : combatant
        )
      },
      { type: 'skill', skillId: 'harden', targetIds: ['e1-1'] }
    )

    expect(getCombatant(hardened.state, 'e1-1').shields).toBe(1)

    const full = field({ 'aegis-relic': 5 })
    let state = full

    for (let index = 0; index < 4; index++) {
      state = turnOf(consume(state, 'aegis-relic').state, 'h-kael')
    }

    expect(getCombatant(state, 'h-kael').shields).toBe(MAX_SHIELDS)
  })

  it('throws a weapon at one enemy, some of them several times', () => {
    const knife = consume(field({ 'throwing-knife': 1 }), 'throwing-knife', ['e1-1'])

    expect(knife.events.filter((event) => event.type === 'damage')).toHaveLength(1)

    const stars = consume(field({ shuriken: 1 }, [kael], 'thorn-boar', 30), 'shuriken', ['e1-1'])

    expect(stars.events.filter((event) => event.type === 'damage' && event.targetId === 'e1-1')).toHaveLength(3)
    expect(() => consume(field({ shuriken: 1 }), 'shuriken', ['h-kael'])).toThrow()
  })

  it('imbues the weapon with an element, one at a time', () => {
    const oiled = consume(field({ 'fire-oil': 1, 'frost-oil': 1 }), 'fire-oil').state
    const strike = performAction(oiled, { type: 'skill', skillId: 'kael-strike', targetIds: ['e1-1'] })

    expect(strike.events).toContainEqual(expect.objectContaining({ type: 'damage', damageType: DamageType.FIRE }))

    const frosted = consume(oiled, 'frost-oil').state
    const imbues = getCombatant(frosted, 'h-kael').statuses.map((status) => status.type)

    expect(imbues).toContain(StatusType.IMBUE_ICE)
    expect(imbues).not.toContain(StatusType.IMBUE_FIRE)
  })

  it('raises attributes with tonics and wards off harmful statuses', () => {
    const toned = consume(field({ 'giant-draught': 1 }), 'giant-draught').state

    expect(getCombatant(toned, 'h-kael').statuses.map((status) => status.type)).toEqual([
      StatusType.ATTACK_UP,
      StatusType.DEFENSE_UP
    ])

    const cursed = (items: Record<string, number>, seed: number) => {
      const base = { ...field(items), seed }
      const state = items['ward-charm'] ? consume(base, 'ward-charm').state : base

      return enemyActs(state, 'curse')
    }

    let warded = 0
    let bare = 0

    for (let seed = 1; seed <= 30; seed++) {
      const withWard = cursed({ 'ward-charm': 1 }, seed)

      expect(getCombatant(withWard.state, 'h-kael').statuses.map((status) => status.type)).not.toContain(
        StatusType.DEFENSE_DOWN
      )
      warded += withWard.events.some((event) => event.type === 'immune') ? 1 : 0
      bare += getCombatant(cursed({}, seed).state, 'h-kael').statuses.some(
        (status) => status.type === StatusType.DEFENSE_DOWN
      )
        ? 1
        : 0
    }

    expect(warded).toBeGreaterThan(0)
    expect(bare).toBeGreaterThan(0)
  })

  it('regenerates health at the start of each turn', () => {
    const fed = consume(field({ 'troll-blood': 1 }), 'troll-blood').state
    const hurt = {
      ...fed,
      actorId: null,
      combatants: fed.combatants.map((combatant) =>
        combatant.side === 'hero' ? { ...combatant, health: 10, initiative: 99.9 } : { ...combatant, initiative: 0 }
      )
    }
    const { events } = nextTurn(hurt)

    expect(events).toContainEqual(expect.objectContaining({ type: 'heal', targetId: 'h-kael' }))
  })

  it('leaves things of the biome after the fights, and more after a boss', () => {
    const loot = (speciesId: string, seed: number) => {
      const state = turnOf(
        createBattle({
          heroes: [kael],
          phases: [[{ speciesId, level: 1 }]],
          seed,
          biome: Biome.FOREST,
          canRetreat: speciesId === 'thorn-boar'
        }).state,
        'h-kael'
      )
      const nearlyDead = {
        ...state,
        combatants: state.combatants.map((combatant) =>
          combatant.side === 'enemy' ? { ...combatant, health: 1, bars: 1 } : combatant
        )
      }

      return performAction(nearlyDead, { type: 'skill', skillId: 'kael-strike', targetIds: ['e1-1'] }).state.loot
    }

    const found = new Set<string>()

    for (let seed = 1; seed <= 300; seed++) {
      for (const itemId of Object.keys(loot('thorn-boar', seed))) {
        found.add(itemId)
      }
    }

    const dropped = [...found].filter(
      (itemId) => getItem(itemId).kind === 'consumable' && !BASIC_POTIONS.includes(itemId)
    )

    expect(dropped.every((itemId) => BIOME_DROPS[Biome.FOREST].includes(itemId))).toBe(true)
    expect(dropped.length).toBeGreaterThan(5)

    const boss = loot('bandit-chief', 5)
    const bossItems = Object.entries(boss)
      .filter(([itemId]) => BIOME_DROPS[Biome.FOREST].includes(itemId))
      .reduce((sum, [, count]) => sum + count, 0)

    expect(bossItems).toBeGreaterThanOrEqual(BOSS_ITEMS)
  })

  it('finds every consumable somewhere: in the drops of a biome or in a shop', () => {
    const sold = new Set(Object.values(MERCHANT_STOCK).flatMap((stock) => stock.map((entry) => entry.itemId)))
    const dropped = new Set(Object.values(BIOME_DROPS).flat())

    for (const item of ITEMS.filter((candidate) => candidate.kind === 'consumable')) {
      expect(item.category, item.id).toBeDefined()
      expect(BASIC_POTIONS.includes(item.id) || sold.has(item.id) || dropped.has(item.id), item.id).toBe(true)
    }

    for (const itemId of dropped) {
      expect(getItem(itemId).kind, itemId).toBe('consumable')
    }
  })
})

describe('the mechanics of each hero', () => {
  const boar = [[{ speciesId: 'thorn-boar', level: 5 }]]

  it('starts Kael without a stance and lets his specials move him from one to another', () => {
    const fencer = withSkills(createCharacter(CharacterId.KAEL, 8), ['kael-sweep', 'kael-whirlwind', 'kael-guard'])
    const tough = [[{ speciesId: 'thorn-boar', level: 30 }]]
    let state = turnOf(battle(tough, [fencer]), 'h-kael')
    const boarId = getFighters(state, 'enemy')[0].id

    const use = (skillId: string) => {
      const step = performAction(turnOf(state, 'h-kael'), { type: 'skill', skillId, targetIds: [boarId] })

      state = step.state

      return step.events
    }

    expect(getCombatant(state, 'h-kael').stance).toBe(Stance.NONE)

    // The weapon attack keeps the stance.
    expect(use('kael-strike').some((event) => event.type === 'stance')).toBe(false)
    expect(getCombatant(state, 'h-kael').stance).toBe(Stance.NONE)

    expect(use('kael-firm-cut')).toContainEqual({ type: 'stance', targetId: 'h-kael', stance: Stance.OFFENSE })
    use('kael-whirlwind')
    expect(getCombatant(state, 'h-kael').stance).toBe(Stance.VIRTUOUS)
    use('kael-guard')
    expect(getCombatant(state, 'h-kael').stance).toBe(Stance.DEFENSE)
  })

  it('keeps some specials of Kael for one stance', () => {
    const fencer = withSkills(createCharacter(CharacterId.KAEL, 8), ['kael-sweep', 'kael-whirlwind', 'kael-execution'])
    const tough = [[{ speciesId: 'thorn-boar', level: 30 }]]
    const state = turnOf(battle(tough, [fencer]), 'h-kael')
    const boarId = getFighters(state, 'enemy')[0].id
    const usable = (from: BattleState) => getUsableSkills(from, 'h-kael').map((skill) => skill.id)
    const inStance = (stance: Stance): BattleState => ({
      ...state,
      combatants: state.combatants.map((combatant) =>
        combatant.id === 'h-kael' ? { ...combatant, stance } : combatant
      )
    })

    expect(usable(state)).not.toContain('kael-whirlwind')
    expect(usable(state)).not.toContain('kael-execution')
    expect(() => performAction(state, { type: 'skill', skillId: 'kael-execution', targetIds: [boarId] })).toThrow()

    expect(usable(inStance(Stance.OFFENSE))).toContain('kael-whirlwind')
    expect(usable(inStance(Stance.OFFENSE))).not.toContain('kael-execution')

    const { state: after } = performAction(inStance(Stance.VIRTUOUS), {
      type: 'skill',
      skillId: 'kael-execution',
      targetIds: [boarId]
    })

    expect(getCombatant(after, 'h-kael').stance).toBe(Stance.NONE)
  })

  it('charges Ysolde with the elements she casts, and spends them all at once', () => {
    const ysolde = withSkills(createCharacter(CharacterId.YSOLDE, 20), ['ysolde-combustion'])
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
    const oren = withSkills(createCharacter(CharacterId.OREN, 30), ['oren-rebirth'])
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

describe('New Game+ battles', () => {
  it('makes the enemies stronger and teaches the bosses one skill more', () => {
    const spawn = [[{ speciesId: 'boar-matriarch', level: 10 }]]
    const first = getFighters(battle(spawn), 'enemy')[0]
    const second = getFighters(
      createBattle({ heroes: [kael], phases: spawn, seed: 42, biome: Biome.MEADOWS, canRetreat: false, cycle: 1 })
        .state,
      'enemy'
    )[0]

    expect(second.stats.maxHealth).toBeGreaterThan(first.stats.maxHealth)
    expect(second.skills).toEqual([...first.skills, 'war-cry'])
  })
})

describe('rune effects', () => {
  const wearing = (...ids: string[]): CharacterState => ({
    ...kael,
    runes: ids.map((id) => RUNES.find((rune) => rune.id === id)!.index)
  })
  const field = (hero: CharacterState, level = 30) =>
    createBattle({
      heroes: [hero],
      phases: [[{ speciesId: 'thorn-boar', level }]],
      seed: 7,
      biome: Biome.MEADOWS,
      canRetreat: true,
      items: { 'health-potion': 1 }
    }).state
  const withHealth = (state: BattleState, health: number): BattleState => ({
    ...state,
    combatants: state.combatants.map((combatant) => (combatant.side === 'hero' ? { ...combatant, health } : combatant))
  })
  const gored = (state: BattleState) =>
    performAction(turnOf(state, 'e1-1'), { type: 'skill', skillId: 'gore', targetIds: ['h-kael'] })
  const struck = (state: BattleState) =>
    performAction(turnOf(state, 'h-kael'), { type: 'skill', skillId: 'kael-strike', targetIds: ['e1-1'] })

  it('gives every rune its own effect and text id', () => {
    expect(new Set(RUNES.map((rune) => rune.id)).size).toBe(RUNES.length)
    expect(RUNES.every((rune) => Object.keys(rune.effect).length > 0)).toBe(true)
  })

  it('stops the first hit with the shield of the barrier', () => {
    const start = field(wearing('barrier'))

    expect(getCombatant(start, 'h-kael').shields).toBe(1)

    const first = gored(start)

    expect(first.events).toContainEqual({ type: 'shields', targetId: 'h-kael', change: -1, shields: 0 })
    expect(first.events.some((event) => event.type === 'damage')).toBe(false)
    expect(gored(first.state).events.some((event) => event.type === 'damage')).toBe(true)
  })

  it('shields the allies that have none when the wearer of the shelter falls', () => {
    const start = createBattle({
      heroes: [wearing('shelter'), createCharacter(CharacterId.SERA, 5), createCharacter(CharacterId.BRANN, 5)],
      phases: [[{ speciesId: 'thorn-boar', level: 60 }]],
      seed: 7,
      biome: Biome.MEADOWS,
      canRetreat: true
    }).state
    const ready: BattleState = {
      ...start,
      combatants: start.combatants.map((combatant) =>
        combatant.id === 'h-kael'
          ? { ...combatant, health: 2 }
          : combatant.id === 'h-brann'
            ? { ...combatant, shields: 1 }
            : combatant
      )
    }
    const fall = gored(ready)

    expect(getCombatant(fall.state, 'h-kael').health).toBe(0)
    expect(fall.events).toContainEqual({ type: 'perk', targetId: 'h-kael', perk: Perk.SHELTER })
    expect(getCombatant(fall.state, 'h-sera').shields).toBe(1)
    expect(getCombatant(fall.state, 'h-brann').shields).toBe(1)
  })

  it('survives a deadly hit once per battle', () => {
    const first = gored(withHealth(field(wearing('endurance'), 60), 2))

    expect(getCombatant(first.state, 'h-kael').health).toBe(1)
    expect(first.events).toContainEqual({ type: 'perk', targetId: 'h-kael', perk: Perk.SURVIVE })
    expect(getCombatant(gored(first.state).state, 'h-kael').health).toBe(0)
  })

  it('acts twice in a row with the twin rune', () => {
    const twin = struck(field(wearing('twin')))

    expect(nextTurn(twin.state).state.actorId).toBe('h-kael')
  })

  it('turns the weapon attack into an element', () => {
    const { events } = struck(field(wearing('burning-iron')))

    expect(events).toContainEqual(expect.objectContaining({ type: 'damage', damageType: DamageType.FIRE, weak: true }))
  })

  it('makes the specials cheaper', () => {
    const cost = (hero: CharacterState) =>
      getUsableSkills(turnOf(field(hero), 'h-kael'), 'h-kael').find((skill) => skill.id === 'kael-flame-edge')!.cost

    expect(cost(wearing('thrift'))).toBeLessThan(cost(kael))
  })

  it('cannot be healed with pride, and takes less damage', () => {
    const damage = (hero: CharacterState) =>
      (gored(field(hero)).events.find((event) => event.type === 'damage') as { amount: number }).amount

    expect(damage(wearing('pride'))).toBeLessThan(damage(kael))

    const proud = performAction(withHealth(turnOf(field(wearing('pride')), 'h-kael'), 10), {
      type: 'item',
      itemId: 'health-potion',
      targetIds: ['h-kael']
    })

    expect(getCombatant(proud.state, 'h-kael').health).toBe(10)
  })
})

describe('runes of the spoils and the new runes of the way', () => {
  const runeIndex = (id: string) => RUNES.find((rune) => rune.id === id)!.index
  const wearing = (character: CharacterState, ...ids: string[]): CharacterState => ({
    ...character,
    runes: ids.map(runeIndex)
  })

  /** A battle against one thorn boar that falls with the next hit of Kael. */
  const nearlyWonWith = (heroes: CharacterState[], seed = 7, elite = false) => {
    const state = createBattle({
      heroes,
      phases: [[{ speciesId: 'thorn-boar', level: 30, elite }]],
      seed,
      biome: Biome.MEADOWS,
      canRetreat: true
    }).state

    return turnOf(
      {
        ...state,
        combatants: state.combatants.map((combatant) =>
          combatant.side === 'enemy' ? { ...combatant, health: 1 } : combatant
        )
      },
      'h-kael'
    )
  }

  const strike = (state: BattleState) =>
    performAction(state, { type: 'skill', skillId: 'kael-strike', targetIds: ['e1-1'] })

  it('gives the party more experience with the wisdom and more gold with the tribute', () => {
    const plain = strike(nearlyWonWith([kael])).state
    const wise = strike(nearlyWonWith([wearing(kael, 'wisdom')])).state
    const rich = strike(nearlyWonWith([wearing(kael, 'tribute')])).state

    expect(plain.xp).toBeGreaterThan(0)
    expect(plain.gold).toBeGreaterThan(0)
    expect(wise.xp).toBe(Math.round(plain.xp * 1.25))
    expect(wise.gold).toBe(plain.gold)
    expect(rich.gold).toBe(Math.round(plain.gold * 1.3))
    expect(rich.xp).toBe(plain.xp)
  })

  it('counts a rune of the spoils once for the party, from any hero that fought', () => {
    const sera = createCharacter(CharacterId.SERA, 5)
    const plain = strike(nearlyWonWith([kael, sera])).state
    const fromAlly = strike(nearlyWonWith([kael, wearing(sera, 'wisdom')])).state
    const twice = strike(nearlyWonWith([wearing(kael, 'wisdom'), wearing(sera, 'wisdom')])).state

    expect(fromAlly.xp).toBe(Math.round(plain.xp * 1.25))
    expect(twice.xp).toBe(fromAlly.xp)
  })

  it('makes the enemies leave loot more often with the luck of the clover', () => {
    const count = (heroes: CharacterState[]) => {
      let found = 0

      for (let seed = 1; seed <= 1500; seed++) {
        const after = strike(nearlyWonWith(heroes, seed)).state

        found += Object.values(after.loot).reduce((sum, amount) => sum + amount, 0)
      }

      return found
    }

    const plain = count([kael])
    const lucky = count([wearing(kael, 'clover')])

    expect(plain).toBeGreaterThan(0)
    expect(lucky / plain).toBeGreaterThan(1.35)
    expect(lucky / plain).toBeLessThan(1.65)
  })

  it('gives its turn right away to the ally that keeps vigil when a hero falls', () => {
    const start = createBattle({
      heroes: [kael, wearing(createCharacter(CharacterId.SERA, 5), 'vigil'), createCharacter(CharacterId.BRANN, 5)],
      phases: [[{ speciesId: 'thorn-boar', level: 60 }]],
      seed: 7,
      biome: Biome.MEADOWS,
      canRetreat: true
    }).state
    const ready: BattleState = {
      ...start,
      combatants: start.combatants.map((combatant) =>
        combatant.id === 'h-kael' ? { ...combatant, health: 2 } : { ...combatant, initiative: 0 }
      )
    }
    const fall = performAction(turnOf(ready, 'e1-1'), { type: 'skill', skillId: 'gore', targetIds: ['h-kael'] })

    expect(getCombatant(fall.state, 'h-kael').health).toBe(0)
    expect(fall.events).toContainEqual({ type: 'perk', targetId: 'h-sera', perk: Perk.VIGIL })
    expect(nextTurn(fall.state).state.actorId).toBe('h-sera')
  })

  it('grows the damage of the patient apprentice with each turn without damage, and resets it on a hit', () => {
    const start = createBattle({
      heroes: [wearing(kael, 'patient-apprentice')],
      phases: [[{ speciesId: 'thorn-boar', level: 60 }]],
      seed: 7,
      biome: Biome.MEADOWS,
      canRetreat: true
    }).state
    const withPatience = (patience: number, initiative = 0): BattleState => ({
      ...start,
      combatants: start.combatants.map((combatant) =>
        combatant.id === 'h-kael'
          ? { ...combatant, initiative, runeState: { ...combatant.runeState!, turns: 1, patience } }
          : { ...combatant, initiative: 0 }
      )
    })
    const damageOf = (state: BattleState) =>
      strike(turnOf(state, 'h-kael')).events.find((event) => event.type === 'damage')!
    const calm = damageOf(withPatience(0))
    const patient = damageOf(withPatience(5))

    // A turn begun without damage since the last one adds a step.
    expect(getCombatant(nextTurn(withPatience(2, 99)).state, 'h-kael').runeState!.patience).toBe(3)
    expect(getCombatant(nextTurn(withPatience(5, 99)).state, 'h-kael').runeState!.patience).toBe(5)
    expect(calm.type === 'damage' && patient.type === 'damage' && patient.amount / calm.amount).toBeGreaterThan(1.15)
    expect(calm.type === 'damage' && patient.type === 'damage' && patient.amount / calm.amount).toBeLessThan(1.35)

    const gored = performAction(turnOf(withPatience(4), 'e1-1'), {
      type: 'skill',
      skillId: 'gore',
      targetIds: ['h-kael']
    })

    expect(getCombatant(gored.state, 'h-kael').runeState!.patience).toBe(0)
  })

  it('heals the heroes standing when the battle is won with the respite', () => {
    const hurt = (state: BattleState): BattleState => ({
      ...state,
      combatants: state.combatants.map((combatant) =>
        combatant.side === 'hero' ? { ...combatant, health: 10 } : combatant
      )
    })
    const plain = strike(hurt(nearlyWonWith([kael])))
    const rested = strike(hurt(nearlyWonWith([wearing(kael, 'respite')])))
    const hero = getCombatant(rested.state, 'h-kael')

    expect(rested.state.outcome).toBe('victory')
    expect(getCombatant(plain.state, 'h-kael').health).toBe(10)
    expect(hero.health).toBe(Math.min(hero.stats.maxHealth, 10 + Math.ceil(hero.stats.maxHealth * 0.25)))
    expect(rested.events).toContainEqual({ type: 'perk', targetId: 'h-kael', perk: Perk.RESPITE })
  })
})
