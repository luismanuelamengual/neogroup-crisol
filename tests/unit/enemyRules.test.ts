import { describe, expect, it } from 'vitest'
import { ELITE_AFFIXES, getAffixCount, getAffixPool } from '@/app/(protected)/(engine)/data/affixes'
import { BOSS_PHASES } from '@/app/(protected)/(engine)/data/bossPhases'
import { ENEMIES, getEnemyStats, getSpecies } from '@/app/(protected)/(engine)/data/enemies'
import { Affinity } from '@/app/(protected)/(engine)/models/Affinity'
import { BattleState, EnemySpawn } from '@/app/(protected)/(engine)/models/BattleState'
import { Biome } from '@/app/(protected)/(engine)/models/Biome'
import { CharacterId } from '@/app/(protected)/(engine)/models/CharacterId'
import { CharacterState } from '@/app/(protected)/(engine)/models/CharacterState'
import { Combatant } from '@/app/(protected)/(engine)/models/Combatant'
import { DamageType } from '@/app/(protected)/(engine)/models/DamageType'
import { EliteAffix } from '@/app/(protected)/(engine)/models/EliteAffix'
import { StatusType } from '@/app/(protected)/(engine)/models/StatusType'
import {
  createBattle,
  getCombatant,
  getFighters,
  nextTurn,
  performAction
} from '@/app/(protected)/(engine)/utils/battle'
import { createCharacter, getKnownSkills } from '@/app/(protected)/(engine)/utils/heroes'

function withSkills(character: CharacterState, skills: string[]): CharacterState {
  const learned = {
    ...character,
    skillLevels: { ...character.skillLevels, ...Object.fromEntries(skills.map((skill) => [skill, 1])) }
  }

  return { ...learned, skills: getKnownSkills(learned) }
}

const kael = withSkills(createCharacter(CharacterId.KAEL, 20), ['kael-sweep', 'kael-flame-edge'])

function battle(phases: EnemySpawn[][], seed = 42, heroes = [kael], cycle = 0): BattleState {
  return createBattle({ heroes, phases, seed, biome: Biome.DESERT, canRetreat: true, cycle }).state
}

/** Gives the turn to a fighter with full focus, and changes what it is given of the enemy. */
function setUp(state: BattleState, actorId: string, enemy: Partial<Combatant> = {}): BattleState {
  return {
    ...state,
    actorId,
    itemsUsed: 0,
    combatants: state.combatants.map((combatant) => ({
      ...combatant,
      ...(combatant.id === actorId ? { focus: combatant.stats.maxFocus } : {}),
      ...(combatant.side === 'enemy' ? enemy : {})
    }))
  }
}

const strike = (state: BattleState, skillId: string, targetId = 'e1-1') =>
  performAction(state, { type: 'skill', skillId, targetIds: [targetId] })

/** The damage of a hit of Kael on the first enemy. */
function damageOf(state: BattleState, skillId: string): number {
  const event = strike(state, skillId).events.find((e) => e.type === 'damage' && e.targetId === 'e1-1')

  return event?.type === 'damage' ? event.amount : 0
}

describe('elite traits', () => {
  it('gives every elite its traits (two in the late biomes and New Game+), and never to the bosses or the rest', () => {
    const counts = new Set<number>()

    for (let seed = 1; seed <= 40; seed++) {
      const state = battle(
        [
          [
            { speciesId: 'giant-scorpion', level: 5, elite: true },
            { speciesId: 'giant-scorpion', level: 5 },
            { speciesId: 'sahrak', level: 5, elite: true }
          ]
        ],
        seed
      )
      const [elite, common, boss] = getFighters(state, 'enemy')

      expect(elite.affixes).toHaveLength(getAffixCount(Biome.DESERT, 0))
      expect(common.affixes).toBeUndefined()
      expect(boss.affixes).toBeUndefined()
      counts.add(new Set(elite.affixes).size)
    }

    expect(counts).toEqual(new Set([1]))
    expect(getAffixCount(Biome.ABYSS, 0)).toBe(2)
    expect(getAffixCount(Biome.MEADOWS, 1)).toBe(2)

    const plus = getFighters(
      battle([[{ speciesId: 'giant-scorpion', level: 5, elite: true }]], 7, [kael], 1),
      'enemy'
    )[0]

    expect(new Set(plus.affixes).size).toBe(2)
  })

  it('draws different traits from different seeds', () => {
    const seen = new Set<EliteAffix>()

    for (let seed = 1; seed <= 200; seed++) {
      for (const affix of getFighters(
        battle([[{ speciesId: 'giant-scorpion', level: 5, elite: true }]], seed),
        'enemy'
      )[0].affixes ?? []) {
        seen.add(affix)
      }
    }

    expect([...seen].sort()).toEqual([...ELITE_AFFIXES].sort())

    // The first biomes only meet the gentle ones.
    expect(getAffixPool(Biome.MEADOWS, 0)).not.toContain(EliteAffix.EXPLOSIVE)
    expect(getAffixPool(Biome.MEADOWS, 1)).toEqual(ELITE_AFFIXES)

    for (let seed = 1; seed <= 100; seed++) {
      const enemy = getFighters(
        createBattle({
          heroes: [kael],
          phases: [[{ speciesId: 'thorn-boar', level: 5, elite: true }]],
          seed,
          biome: Biome.MEADOWS,
          canRetreat: true
        }).state,
        'enemy'
      )[0]

      expect(getAffixPool(Biome.MEADOWS, 0)).toEqual(expect.arrayContaining(enemy.affixes!))
    }
  })

  it('makes the armored ones enter with shields and the swift ones faster', () => {
    const find = (affix: EliteAffix) => {
      for (let seed = 1; seed <= 300; seed++) {
        const enemy = getFighters(battle([[{ speciesId: 'giant-scorpion', level: 5, elite: true }]], seed), 'enemy')[0]

        if (enemy.affixes?.includes(affix)) {
          return enemy
        }
      }

      throw new Error(`No ${affix}`)
    }

    const plain = getEnemyStats('giant-scorpion', 5, true)

    expect(find(EliteAffix.ARMORED).shields).toBe(1)
    expect(find(EliteAffix.SWIFT).stats.speed).toBeGreaterThan(plain.speed * 1.15)
  })

  it('heals the vampiric ones, hurts back with the thorny ones and blows up the explosive ones', () => {
    const start = battle([[{ speciesId: 'thorn-boar', level: 20, elite: true }]])
    const vampire = setUp(start, 'e1-1', { affixes: [EliteAffix.VAMPIRIC], health: 10, shields: 0 })
    const bite = performAction(vampire, { type: 'skill', skillId: 'claw', targetIds: ['h-kael'] })

    expect(bite.events).toContainEqual({ type: 'affix', targetId: 'e1-1', affix: EliteAffix.VAMPIRIC })
    expect(getCombatant(bite.state, 'e1-1').health).toBeGreaterThan(10)

    const thorny = setUp(start, 'h-kael', { affixes: [EliteAffix.THORNY], shields: 0 })
    const hit = strike(thorny, 'kael-strike')
    const kaelBefore = getCombatant(thorny, 'h-kael').health

    expect(hit.events).toContainEqual({ type: 'affix', targetId: 'e1-1', affix: EliteAffix.THORNY })
    expect(getCombatant(hit.state, 'h-kael').health).toBeLessThan(kaelBefore)

    const explosive = setUp(start, 'h-kael', { affixes: [EliteAffix.EXPLOSIVE], health: 1, shields: 0 })
    const boom = strike(explosive, 'kael-strike')

    expect(boom.events).toContainEqual({ type: 'affix', targetId: 'e1-1', affix: EliteAffix.EXPLOSIVE })
    expect(getCombatant(boom.state, 'h-kael').health).toBeLessThan(getCombatant(explosive, 'h-kael').health)
    expect(boom.state.outcome).toBe('victory')

    // Never deadly: a hero with 1 health stays standing.
    const weak = {
      ...explosive,
      combatants: explosive.combatants.map((c) => (c.id === 'h-kael' ? { ...c, health: 1 } : c))
    }

    expect(getCombatant(strike(weak, 'kael-strike').state, 'h-kael').health).toBe(1)
  })

  it('keeps the unshakable ones from freezing, angers the vengeful ones and pays more for every trait', () => {
    const start = battle([
      [
        { speciesId: 'thorn-boar', level: 20, elite: true },
        { speciesId: 'thorn-boar', level: 20 }
      ]
    ])
    const vengeful = setUp(start, 'h-kael', { affixes: [EliteAffix.VENGEFUL], shields: 0 })
    const withLowSecond = {
      ...vengeful,
      combatants: vengeful.combatants.map((c) => (c.id === 'e1-2' ? { ...c, health: 1, affixes: undefined } : c))
    }
    const kill = strike(withLowSecond, 'kael-strike', 'e1-2')

    expect(kill.events).toContainEqual({ type: 'affix', targetId: 'e1-1', affix: EliteAffix.VENGEFUL })
    expect(getCombatant(kill.state, 'e1-1').statuses.map((s) => s.type)).toContain(StatusType.ATTACK_UP)

    const rewardOf = (affixes: EliteAffix[] | undefined) => {
      const state = battle([[{ speciesId: 'thorn-boar', level: 20, elite: true }]])
      const ready = setUp(state, 'h-kael', { affixes, health: 1, shields: 0 })

      return strike(ready, 'kael-strike').state.xp
    }

    expect(rewardOf([EliteAffix.SWIFT, EliteAffix.VAMPIRIC])).toBeGreaterThan(rewardOf(undefined) * 1.4)
  })
})

describe('enemies that only some hits reach', () => {
  it('lets no weapon attack touch the ethereal ones, while the specials do', () => {
    const state = setUp(battle([[{ speciesId: 'bog-wight', level: 20 }]]), 'h-kael')

    expect(getFighters(state, 'enemy')[0].weaponImmune).toBe(true)
    expect(strike(state, 'kael-strike').events).toContainEqual({ type: 'immune', targetId: 'e1-1', weapon: true })
    expect(damageOf(state, 'kael-flame-edge')).toBeGreaterThan(0)
  })

  it('keeps the physical damage off the elemental bodies', () => {
    const state = setUp(battle([[{ speciesId: 'magma-elemental', level: 20 }]]), 'h-kael')

    expect(strike(state, 'kael-strike').events).toContainEqual({ type: 'immune', targetId: 'e1-1' })
    expect(strike(state, 'kael-sweep').events).toContainEqual({ type: 'immune', targetId: 'e1-1' })
  })

  it('heals the ones that absorb an element', () => {
    const state = setUp(battle([[{ speciesId: 'magma-elemental', level: 20 }]]), 'h-kael', { health: 10 })
    const flame = strike(state, 'kael-flame-edge')

    expect(flame.events.some((e) => e.type === 'heal' && e.targetId === 'e1-1')).toBe(true)
    expect(getCombatant(flame.state, 'e1-1').health).toBeGreaterThan(10)
  })

  it('lets only a weakness hurt a sealed one as usual: the rest barely scratches it', () => {
    // Sealed and weak to fire only (on a boar, to compare with the same defense).
    const sealed = setUp(battle([[{ speciesId: 'thorn-boar', level: 20 }]]), 'h-kael', { sealed: true })
    const plain = setUp(battle([[{ speciesId: 'thorn-boar', level: 20 }]]), 'h-kael')
    const slash = damageOf(sealed, 'kael-strike')

    expect(slash).toBeLessThan(damageOf(plain, 'kael-strike') * 0.1)
    expect(strike(sealed, 'kael-strike').events).toContainEqual(
      expect.objectContaining({ type: 'damage', targetId: 'e1-1', sealed: true })
    )
    // On its weakness: a normal hit (no extra damage of the weakness).
    const fire = damageOf(sealed, 'kael-flame-edge')
    const normalFire = damageOf(plain, 'kael-flame-edge') / 1.5

    expect(fire).toBeGreaterThan(normalFire * 0.85)
    expect(fire).toBeLessThan(normalFire * 1.15)
  })

  it('shrinks the damage over time on a sealed one', () => {
    const start = battle([[{ speciesId: 'thorn-boar', level: 20 }]])

    const poisoned = (sealed: boolean): number => {
      const state: BattleState = {
        ...start,
        actorId: null,
        combatants: start.combatants.map((c) =>
          c.side === 'enemy'
            ? { ...c, sealed, initiative: 99.9, statuses: [{ type: StatusType.POISON, turns: 3 }] }
            : { ...c, initiative: 0 }
        )
      }
      const tick = nextTurn(state).events.find((e) => e.type === 'statusTick')

      return tick?.type === 'statusTick' ? tick.amount : 0
    }

    expect(poisoned(true)).toBeLessThan(poisoned(false) * 0.2)
  })

  it('puts each new defense on some species of the catalog', () => {
    expect(ENEMIES.filter((species) => species.weaponImmune).length).toBeGreaterThanOrEqual(4)
    expect(ENEMIES.filter((species) => species.sealed).length).toBeGreaterThanOrEqual(4)
    expect(
      ENEMIES.filter((species) =>
        [DamageType.SLASH, DamageType.PIERCE, DamageType.BLUNT].every(
          (type) => species.affinities[type] === Affinity.IMMUNE
        )
      ).length
    ).toBeGreaterThanOrEqual(3)

    // A sealed one always has a weakness to aim at.
    for (const species of ENEMIES.filter((candidate) => candidate.sealed)) {
      expect(Object.values(species.affinities)).toContain(Affinity.WEAK)
    }
  })
})

describe('bosses that change their rules on each bar', () => {
  it('only lists bosses with enough bars, and always leaves them a weakness', () => {
    for (const [speciesId, phases] of Object.entries(BOSS_PHASES)) {
      const species = getSpecies(speciesId)

      expect(species.rarity).toBe('boss')
      expect(phases.length).toBeLessThanOrEqual(species.bars - 1)

      let affinities = { ...species.affinities }
      let sealed = species.sealed ?? false

      for (const phase of phases) {
        affinities = { ...affinities, ...phase.affinities }
        sealed = phase.sealed ?? sealed

        const weak = Object.values(affinities).includes(Affinity.WEAK)

        // A sealed boss needs a weakness; any other needs a way in (a weakness or something that is not immune).
        expect(weak || !sealed).toBe(true)
      }
    }

    // Every boss of more than one bar changes something.
    for (const species of ENEMIES.filter((candidate) => candidate.bars > 1)) {
      expect(BOSS_PHASES[species.id], species.id).toBeDefined()
    }
  })

  it('changes the reactions of a boss when a bar empties, and tells it', () => {
    const start = battle([[{ speciesId: 'xalqui', level: 30 }]])
    const nearly = setUp(start, 'h-kael', { health: 1 })

    expect(getCombatant(nearly, 'e1-1').affinities[DamageType.ICE]).toBe(Affinity.WEAK)

    const { state, events } = strike(nearly, 'kael-strike')
    const boss = getCombatant(state, 'e1-1')

    expect(boss.affinities[DamageType.ICE]).toBe(Affinity.ABSORB)
    expect(boss.affinities[DamageType.FIRE]).toBe(Affinity.WEAK)
    expect(events).toContainEqual({
      type: 'bossPhase',
      targetId: 'e1-1',
      changes: expect.arrayContaining([
        { kind: 'affinity', damageType: DamageType.ICE, affinity: Affinity.ABSORB },
        { kind: 'affinity', damageType: DamageType.FIRE, affinity: Affinity.WEAK }
      ])
    })
    // The catalog stays as it was.
    expect(getSpecies('xalqui').affinities[DamageType.ICE]).toBe(Affinity.WEAK)
  })

  it('makes a boss ethereal, sealed or shielded in its next bar', () => {
    const morgrath = strike(
      setUp(battle([[{ speciesId: 'winter-witch', level: 20 }]]), 'h-kael', { health: 1 }),
      'kael-strike'
    )

    expect(getCombatant(morgrath.state, 'e1-1').weaponImmune).toBe(true)
    expect(morgrath.events).toContainEqual({
      type: 'bossPhase',
      targetId: 'e1-1',
      changes: [{ kind: 'weaponImmune', value: true }]
    })

    const colossus = strike(
      setUp(battle([[{ speciesId: 'colossus', level: 40 }]]), 'h-kael', { health: 1 }),
      'kael-strike'
    )
    const boss = getCombatant(colossus.state, 'e1-1')

    expect(boss.sealed).toBe(true)
    expect(boss.shields).toBe(2)
  })

  it('walks Crisol through its two changes', () => {
    let state = setUp(battle([[{ speciesId: 'crisol', level: 60 }]]), 'h-kael', { health: 1 })

    state = strike(state, 'kael-strike').state
    expect(getCombatant(state, 'e1-1').affinities[DamageType.LIGHT]).toBe(Affinity.WEAK)
    expect(getCombatant(state, 'e1-1').shields).toBe(2)

    state = setUp(state, 'h-kael', { health: 1, shields: 0 })
    state = strike(state, 'kael-strike').state

    const crisol = getCombatant(state, 'e1-1')

    expect(crisol.bars).toBe(1)
    expect(crisol.sealed).toBe(true)
    expect(crisol.affinities[DamageType.LIGHT]).toBeUndefined()
    expect(crisol.affinities[DamageType.ICE]).toBe(Affinity.WEAK)
  })
})
