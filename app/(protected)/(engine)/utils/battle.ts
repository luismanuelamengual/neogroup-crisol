import { getCharacterDefinition, getCharacterStats } from '@/app/(protected)/(engine)/data/characters'
import { getEnemyRewards, getEnemyStats, getSpecies } from '@/app/(protected)/(engine)/data/enemies'
import { getSkill } from '@/app/(protected)/(engine)/data/skills'
import { Affinity } from '@/app/(protected)/(engine)/models/Affinity'
import { Archetype } from '@/app/(protected)/(engine)/models/Archetype'
import { BattleAction } from '@/app/(protected)/(engine)/models/BattleAction'
import { BattleEvent } from '@/app/(protected)/(engine)/models/BattleEvent'
import { BattleState, EnemySpawn } from '@/app/(protected)/(engine)/models/BattleState'
import { Biome } from '@/app/(protected)/(engine)/models/Biome'
import { CharacterState } from '@/app/(protected)/(engine)/models/CharacterState'
import { Combatant } from '@/app/(protected)/(engine)/models/Combatant'
import { CombatStats } from '@/app/(protected)/(engine)/models/CombatStats'
import { DamageType } from '@/app/(protected)/(engine)/models/DamageType'
import { Skill } from '@/app/(protected)/(engine)/models/Skill'
import { StatusType } from '@/app/(protected)/(engine)/models/StatusType'
import { TargetType } from '@/app/(protected)/(engine)/models/TargetType'

/**
 * The combat engine: pure functions over a BattleState. Turns come from a
 * timeline ruled by speed (each fighter fills its initiative and acts at 100),
 * so a much faster fighter can act two or three times in a row.
 *
 *   createBattle → nextTurn → (hero: performAction with the player's choice |
 *   enemy: performAction(chooseEnemyAction)) → nextTurn → ... until `outcome`.
 *
 * Each step returns the events that happened, for the scene to animate them.
 */

export const ACTIVE_HEROES = 3
const INITIATIVE_FULL = 100
/** Share of the maximum focus recovered at the start of each turn. */
const FOCUS_REGEN = 0.12
/** Health lost per turn by each damage over time (share of the maximum; bosses take a third). */
const DOT_SHARE: Partial<Record<StatusType, number>> = {
  [StatusType.POISON]: 0.06,
  [StatusType.BURN]: 0.08,
  [StatusType.BLEED]: 0.05
}
const BOSS_DOT_FACTOR = 1 / 3
/** Bosses shrug off most freezes and stuns. */
const BOSS_CONTROL_FACTOR = 0.3
const BLIND_MISS_CHANCE = 0.5
const BUFF = 1.25
const DEBUFF = 0.75
/** A boss grows this much stronger when one of its health bars empties. */
const NEXT_BAR_POWER = 1.15
const AFFINITY_MULTIPLIER: Record<Affinity, number> = {
  [Affinity.WEAK]: 1.5,
  [Affinity.NORMAL]: 1,
  [Affinity.RESIST]: 0.5,
  [Affinity.IMMUNE]: 0,
  [Affinity.ABSORB]: -1
}
const PHYSICAL = new Set([DamageType.SLASH, DamageType.PIERCE, DamageType.BLUNT])
const CONTROL = new Set([StatusType.FREEZE, StatusType.STUN])

export interface BattleSetup {
  heroes: CharacterState[]
  phases: EnemySpawn[][]
  seed: number
  biome: Biome
  cycle?: number
  canRetreat: boolean
}

export interface BattleStep {
  state: BattleState
  events: BattleEvent[]
}

/** Next number of the seeded random sequence of the battle (mulberry32), advancing it. */
function roll(state: BattleState): number {
  state.seed = (state.seed + 0x6d2b79f5) >>> 0

  let t = state.seed

  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)

  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

export function getCombatant(state: BattleState, id: string): Combatant {
  const found = state.combatants.find((combatant) => combatant.id === id)

  if (!found) {
    throw new Error(`Unknown combatant ${id}`)
  }

  return found
}

export function isAlive(combatant: Combatant): boolean {
  return combatant.health > 0
}

/** Fighters on the field: alive and not waiting in reserve. */
export function getFighters(state: BattleState, side?: Combatant['side']): Combatant[] {
  return state.combatants.filter(
    (combatant) => isAlive(combatant) && !combatant.reserve && (!side || combatant.side === side)
  )
}

function spawnEnemies(state: BattleState, phase: number): Combatant[] {
  return state.phases[phase].map((spawn, index) => {
    const species = getSpecies(spawn.speciesId)
    const stats = getEnemyStats(spawn.speciesId, spawn.level, spawn.elite, state.cycle)

    return {
      id: `e${phase + 1}-${index + 1}`,
      side: 'enemy',
      speciesId: spawn.speciesId,
      elite: spawn.elite,
      level: spawn.level,
      stats,
      health: stats.maxHealth,
      focus: Math.round(stats.maxFocus / 2),
      initiative: roll(state) * 30,
      statuses: [],
      skills: species.skills,
      affinities: species.affinities,
      bars: species.bars,
      reserve: false,
      fought: true
    }
  })
}

/** Starts a battle: the first three heroes on the field, the rest in reserve, and the first phase of enemies. */
export function createBattle(setup: BattleSetup): BattleStep {
  const state: BattleState = {
    seed: setup.seed >>> 0,
    biome: setup.biome,
    cycle: setup.cycle ?? 0,
    phases: setup.phases,
    phase: 0,
    combatants: [],
    actorId: null,
    canRetreat: setup.canRetreat,
    outcome: null,
    kills: {},
    xp: 0,
    gold: 0
  }
  const heroes: Combatant[] = setup.heroes.map((character, index) => {
    const stats = getCharacterStats(character)

    return {
      id: `h-${character.id}`,
      side: 'hero',
      characterId: character.id,
      level: character.level,
      stats,
      health: Math.min(character.health, stats.maxHealth),
      focus: Math.round(stats.maxFocus / 2),
      initiative: roll(state) * 30,
      statuses: [],
      skills: getCharacterDefinition(character.id).skills,
      affinities: {},
      bars: 1,
      reserve: index >= ACTIVE_HEROES,
      fought: index < ACTIVE_HEROES
    }
  })

  state.combatants = [...heroes, ...spawnEnemies(state, 0)]

  return {
    state,
    events: [{ type: 'phase', phase: 0, enemyIds: state.combatants.filter((c) => c.side === 'enemy').map((c) => c.id) }]
  }
}

function hasStatus(combatant: Combatant, type: StatusType): boolean {
  return combatant.statuses.some((status) => status.type === type)
}

/** An attribute with the buffs and debuffs of the fighter. */
function effective(combatant: Combatant, stat: keyof CombatStats): number {
  const value = combatant.stats[stat]
  const [up, down] =
    stat === 'attack' || stat === 'special'
      ? [StatusType.ATTACK_UP, StatusType.ATTACK_DOWN]
      : stat === 'defense'
        ? [StatusType.DEFENSE_UP, StatusType.DEFENSE_DOWN]
        : stat === 'speed'
          ? [StatusType.SPEED_UP, StatusType.SPEED_DOWN]
          : [null, null]

  return value * (up && hasStatus(combatant, up) ? BUFF : 1) * (down && hasStatus(combatant, down) ? DEBUFF : 1)
}

function isBoss(combatant: Combatant): boolean {
  return combatant.side === 'enemy' && getSpecies(combatant.speciesId!).strength > 1
}

/** The fighters a turn order is computed over: on the field and alive. */
function timelineFighters(state: BattleState): Combatant[] {
  return getFighters(state)
}

/** Time until a fighter reaches a full initiative bar. */
function timeToTurn(combatant: Combatant, initiative = combatant.initiative): number {
  return (INITIATIVE_FULL - initiative) / Math.max(1, effective(combatant, 'speed'))
}

/**
 * Who acts next on the timeline (without changing the state): the next
 * `count` turns, used for the queue shown at the top of the battle.
 */
export function getTurnQueue(state: BattleState, count = 8): string[] {
  const fighters = timelineFighters(state)
  const initiative = new Map(fighters.map((fighter) => [fighter.id, fighter.initiative]))
  const queue: string[] = []

  if (state.actorId) {
    queue.push(state.actorId)
    initiative.set(state.actorId, 0)
  }

  while (queue.length < count && fighters.length > 0) {
    let next = fighters[0]
    let best = Infinity

    for (const fighter of fighters) {
      const time = timeToTurn(fighter, initiative.get(fighter.id))

      if (time < best - 1e-9) {
        best = time
        next = fighter
      }
    }

    for (const fighter of fighters) {
      initiative.set(fighter.id, initiative.get(fighter.id)! + effective(fighter, 'speed') * best)
    }

    initiative.set(next.id, 0)
    queue.push(next.id)
  }

  return queue
}

/** Lowers the turns left of the statuses of a fighter at the end of its turn. */
function tickStatuses(combatant: Combatant, events: BattleEvent[]): void {
  for (const status of combatant.statuses) {
    status.turns--

    if (status.turns <= 0) {
      events.push({ type: 'statusEnd', targetId: combatant.id, status: status.type })
    }
  }

  combatant.statuses = combatant.statuses.filter((status) => status.turns > 0)
}

/**
 * Moves the timeline to the next fighter that can act and starts its turn:
 * it recovers focus, takes its damage over time and loses the turn if it is
 * frozen or stunned (then the timeline moves on).
 */
export function nextTurn(battle: BattleState): BattleStep {
  const state = structuredClone(battle)
  const events: BattleEvent[] = []

  while (!state.outcome) {
    const fighters = timelineFighters(state)
    let actor = fighters[0]
    let best = Infinity

    for (const fighter of fighters) {
      const time = timeToTurn(fighter)

      if (time < best - 1e-9) {
        best = time
        actor = fighter
      }
    }

    for (const fighter of fighters) {
      fighter.initiative += effective(fighter, 'speed') * best
    }

    actor.initiative = 0
    actor.focus = Math.min(actor.stats.maxFocus, actor.focus + Math.ceil(actor.stats.maxFocus * FOCUS_REGEN))
    events.push({ type: 'turn', actorId: actor.id })

    for (const status of actor.statuses) {
      const share = DOT_SHARE[status.type]

      if (share) {
        const amount = Math.max(1, Math.round(actor.stats.maxHealth * share * (isBoss(actor) ? BOSS_DOT_FACTOR : 1)))

        events.push({ type: 'statusTick', targetId: actor.id, status: status.type, amount })
        hurt(state, actor, amount, events)
      }
    }

    if (state.outcome) {
      break
    }

    if (!isAlive(actor)) {
      continue
    }

    const control = actor.statuses.find((status) => CONTROL.has(status.type))

    if (control) {
      events.push({ type: 'skip', actorId: actor.id, status: control.type })
      tickStatuses(actor, events)
      continue
    }

    state.actorId = actor.id
    break
  }

  return { state, events }
}

/** Skills a fighter can use now (enough focus). */
export function getUsableSkills(state: BattleState, combatantId: string): Skill[] {
  const combatant = getCombatant(state, combatantId)

  return combatant.skills.map(getSkill).filter((skill) => skill.cost <= combatant.focus)
}

/** Who a skill can be aimed at: the ids of the possible targets (for "all" skills, all of them at once). */
export function getTargets(state: BattleState, actorId: string, skill: Skill): string[] {
  const actor = getCombatant(state, actorId)
  const foes = getFighters(state, actor.side === 'hero' ? 'enemy' : 'hero')
  const allies = getFighters(state, actor.side)

  switch (skill.target) {
    case TargetType.ENEMY:
    case TargetType.ALL_ENEMIES:
      return foes.map((foe) => foe.id)
    case TargetType.ALLY:
    case TargetType.ALL_ALLIES:
      return allies.map((ally) => ally.id)
    default:
      return [actor.id]
  }
}

/**
 * The fighter whose turn it is acts: a skill on its targets (one for single
 * target skills; "all" skills reach every valid target whatever is passed),
 * or a retreat. Then the turn ends.
 */
export function performAction(battle: BattleState, action: BattleAction): BattleStep {
  const state = structuredClone(battle)
  const events: BattleEvent[] = []
  const actor = getCombatant(state, state.actorId ?? '')

  if (action.type === 'retreat') {
    if (actor.side !== 'hero' || !state.canRetreat) {
      throw new Error('Retreating is not allowed')
    }

    state.outcome = 'retreat'
    state.actorId = null
    events.push({ type: 'end', outcome: 'retreat' })

    return { state, events }
  }

  const skill = getSkill(action.skillId)

  if (!actor.skills.includes(skill.id) || skill.cost > actor.focus) {
    throw new Error(`${actor.id} cannot use ${skill.id}`)
  }

  const valid = getTargets(state, actor.id, skill)
  const single = skill.target === TargetType.ENEMY || skill.target === TargetType.ALLY
  const targetIds = single ? action.targetIds.filter((id) => valid.includes(id)).slice(0, 1) : valid

  if (targetIds.length === 0) {
    throw new Error(`No valid target for ${skill.id}`)
  }

  actor.focus -= skill.cost
  events.push({ type: 'action', actorId: actor.id, skillId: skill.id, targetIds })

  for (const targetId of targetIds) {
    const target = getCombatant(state, targetId)

    if (!isAlive(target)) {
      continue
    }

    if (skill.power > 0) {
      if (skill.heal) {
        const amount = Math.round(skill.power * effective(actor, 'special') * (0.95 + roll(state) * 0.1))

        heal(target, amount, events)
      } else if (!strike(state, actor, target, skill, events)) {
        continue
      }
    }

    for (const effect of skill.statuses ?? []) {
      const bearer = effect.onSelf || skill.target === TargetType.SELF ? actor : target
      const chance = effect.chance * (CONTROL.has(effect.type) && isBoss(bearer) ? BOSS_CONTROL_FACTOR : 1)

      if (isAlive(bearer) && roll(state) < chance) {
        const existing = bearer.statuses.find((status) => status.type === effect.type)

        if (existing) {
          existing.turns = Math.max(existing.turns, effect.turns)
        } else {
          bearer.statuses.push({ type: effect.type, turns: effect.turns })
        }

        events.push({ type: 'status', targetId: bearer.id, status: effect.type, turns: effect.turns })
      }
    }

    if (state.outcome) {
      break
    }
  }

  if (!state.outcome && isAlive(actor)) {
    tickStatuses(actor, events)
  }

  state.actorId = null

  return { state, events }
}

/** A damaging hit: false when it missed or did nothing. */
function strike(state: BattleState, actor: Combatant, target: Combatant, skill: Skill, events: BattleEvent[]): boolean {
  if (PHYSICAL.has(skill.damageType) && skill.stat === 'attack' && hasStatus(actor, StatusType.BLIND)) {
    if (roll(state) < BLIND_MISS_CHANCE) {
      events.push({ type: 'miss', targetId: target.id })

      return false
    }
  }

  const affinity = target.affinities[skill.damageType] ?? Affinity.NORMAL

  if (affinity === Affinity.IMMUNE) {
    events.push({ type: 'immune', targetId: target.id })

    return false
  }

  const critical = roll(state) < actor.stats.critChance + (skill.critBonus ?? 0)
  const amount = Math.max(
    1,
    Math.round(
      skill.power *
        effective(actor, skill.stat) *
        (100 / (100 + effective(target, 'defense'))) *
        Math.abs(AFFINITY_MULTIPLIER[affinity]) *
        (critical ? actor.stats.critDamage : 1) *
        (0.95 + roll(state) * 0.1)
    )
  )

  if (affinity === Affinity.ABSORB) {
    heal(target, amount, events)

    return true
  }

  events.push({
    type: 'damage',
    targetId: target.id,
    amount,
    damageType: skill.damageType,
    critical,
    weak: affinity === Affinity.WEAK,
    resisted: affinity === Affinity.RESIST
  })
  hurt(state, target, amount, events)

  return true
}

function heal(target: Combatant, amount: number, events: BattleEvent[]): void {
  const healed = Math.min(amount, target.stats.maxHealth - target.health)

  target.health += healed
  events.push({ type: 'heal', targetId: target.id, amount: healed })
}

/** Takes health from a fighter and handles its fall: next health bar, next phase, reserves or the end. */
function hurt(state: BattleState, target: Combatant, amount: number, events: BattleEvent[]): void {
  target.health = Math.max(0, target.health - amount)

  if (target.health > 0) {
    return
  }

  if (target.bars > 1) {
    target.bars--
    target.health = target.stats.maxHealth
    target.statuses = []
    target.stats = {
      ...target.stats,
      attack: Math.round(target.stats.attack * NEXT_BAR_POWER),
      special: Math.round(target.stats.special * NEXT_BAR_POWER)
    }
    events.push({ type: 'nextBar', targetId: target.id, bars: target.bars })

    return
  }

  target.statuses = []
  target.initiative = 0
  events.push({ type: 'fall', targetId: target.id })

  if (target.side === 'enemy') {
    const rewards = getEnemyRewards(target.speciesId!, target.level, target.elite, state.cycle)

    state.kills[target.speciesId!] = (state.kills[target.speciesId!] ?? 0) + 1
    state.xp += rewards.xp
    state.gold += rewards.gold

    if (getFighters(state, 'enemy').length === 0) {
      if (state.phase < state.phases.length - 1) {
        state.phase++

        const enemies = spawnEnemies(state, state.phase)

        state.combatants.push(...enemies)
        events.push({ type: 'phase', phase: state.phase, enemyIds: enemies.map((enemy) => enemy.id) })
      } else {
        state.outcome = 'victory'
        state.actorId = null
        events.push({ type: 'end', outcome: 'victory' })
      }
    }
  } else if (getFighters(state, 'hero').length === 0) {
    const reserves = state.combatants.filter((combatant) => combatant.reserve && isAlive(combatant))

    if (reserves.length > 0) {
      // All the reserves enter together.
      for (const reserve of reserves) {
        reserve.reserve = false
        reserve.fought = true
        reserve.initiative = 0
      }

      events.push({ type: 'reserves', heroIds: reserves.map((reserve) => reserve.id) })
    } else {
      state.outcome = 'defeat'
      state.actorId = null
      events.push({ type: 'end', outcome: 'defeat' })
    }
  }
}

/** The AI of the enemies: rules by archetype, with some randomness. */
export function chooseEnemyAction(battle: BattleState): BattleAction {
  const state = structuredClone(battle)
  const actor = getCombatant(state, state.actorId ?? '')
  const archetype = getSpecies(actor.speciesId!).archetype
  const heroes = getFighters(state, 'hero')
  const allies = getFighters(state, 'enemy')
  const usable = getUsableSkills(state, actor.id)
  const specials = usable.filter((skill) => skill.cost > 0)
  const basic = getSkill(actor.skills[0])
  const pick = <T>(items: T[]): T => items[Math.floor(roll(state) * items.length)]
  const weakest = [...heroes].sort((a, b) => a.health - b.health)[0]
  const act = (skill: Skill, targetId?: string): BattleAction => ({
    type: 'skill',
    skillId: skill.id,
    targetIds: targetId ? [targetId] : getTargets(state, actor.id, skill)
  })
  const healing = specials.find((skill) => skill.heal)
  const hurtAlly = [...allies].sort((a, b) => a.health / a.stats.maxHealth - b.health / b.stats.maxHealth)[0]

  if (healing && hurtAlly && hurtAlly.health / hurtAlly.stats.maxHealth < 0.5) {
    return act(healing, hurtAlly.id)
  }

  const area = specials.find((skill) => skill.target === TargetType.ALL_ENEMIES)

  if (area && heroes.length >= 2 && roll(state) < (archetype === Archetype.CASTER ? 0.6 : 0.35)) {
    return act(area)
  }

  const selfBuff = specials.find(
    (skill) => skill.target === TargetType.SELF && !skill.statuses?.every((status) => hasStatus(actor, status.type))
  )

  if (selfBuff && roll(state) < (archetype === Archetype.TANK ? 0.35 : 0.2)) {
    return act(selfBuff)
  }

  const single = specials.filter((skill) => skill.target === TargetType.ENEMY)
  const target = archetype === Archetype.AGILE || roll(state) < 0.3 ? weakest : pick(heroes)

  if (single.length > 0 && roll(state) < 0.45) {
    return act(pick(single), target.id)
  }

  return act(basic, target.id)
}

/** Health each hero ends the battle with (fallen ones at 0). */
export function getHeroHealth(state: BattleState): Partial<Record<string, number>> {
  return Object.fromEntries(
    state.combatants.filter((combatant) => combatant.side === 'hero').map((hero) => [hero.characterId!, hero.health])
  )
}
