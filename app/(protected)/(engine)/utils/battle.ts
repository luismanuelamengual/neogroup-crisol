import { getCharacterDefinition } from '@/app/(protected)/(engine)/data/characters'
import { getEnemyRewards, getEnemyStats, getSpecies } from '@/app/(protected)/(engine)/data/enemies'
import { BIOME_POTIONS, BIOME_STONE, BOSS_STONES, DROP_CHANCE, getItem } from '@/app/(protected)/(engine)/data/items'
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
import { Item, ItemTarget } from '@/app/(protected)/(engine)/models/Item'
import { Skill } from '@/app/(protected)/(engine)/models/Skill'
import { StatusType } from '@/app/(protected)/(engine)/models/StatusType'
import { TargetType } from '@/app/(protected)/(engine)/models/TargetType'
import { Trait } from '@/app/(protected)/(engine)/models/Trait'
import { getCharacterSkills, getCharacterStats, getHeroBonuses } from '@/app/(protected)/(engine)/utils/heroes'

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
/** Statuses an antidote (or an elixir) removes. */
const HARMFUL = new Set([
  StatusType.POISON,
  StatusType.BURN,
  StatusType.BLEED,
  StatusType.FREEZE,
  StatusType.STUN,
  StatusType.BLIND,
  StatusType.ATTACK_DOWN,
  StatusType.DEFENSE_DOWN,
  StatusType.SPEED_DOWN
])
/** Most of the damage a hero's guard can avoid. */
const MAX_GUARD = 0.6
/** Kael's stances: multipliers of attack and defense. */
const STANCES = { offense: { attack: 1.15, defense: 0.9 }, defense: { attack: 0.9, defense: 1.3 } }
/** Sera: critical chance per mark on the target, and most marks. */
const MARK_CRIT = 0.06
const MAX_MARKS = 5
/** Brann: attack per point of fury (100 = +40%), and the power that spending it adds (100 = +100%). */
const FURY_ATTACK = 0.004
const MAX_FURY = 100
/** Oren: extra healing per share of missing health of the ally. */
const SAP_HEALING = 0.6
/** Ysolde: special power per charge, the power that spending them adds per charge, and the elements that charge. */
const CHARGE_POWER = 0.08
const CHARGE_SPEND = 0.5
const CHARGING = [DamageType.FIRE, DamageType.ICE, DamageType.LIGHTNING]

export interface BattleSetup {
  heroes: CharacterState[]
  phases: EnemySpawn[][]
  seed: number
  biome: Biome
  cycle?: number
  canRetreat: boolean
  /** Consumables the party carries. */
  items?: Record<string, number>
}

export interface BattleStep {
  state: BattleState
  events: BattleEvent[]
}

/** The starting state of the mechanic of a hero. */
function traitState(trait: Trait): Partial<Combatant> {
  switch (trait) {
    case Trait.STANCE:
      return { trait, stance: 'offense' }
    case Trait.MARKS:
      return { trait, marks: {} }
    case Trait.FURY:
      return { trait, fury: 0 }
    case Trait.CHARGES:
      return { trait, charges: [] }
    default:
      return { trait }
  }
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
    gold: 0,
    items: Object.fromEntries(
      Object.entries(setup.items ?? {}).filter(([itemId, count]) => count > 0 && getItem(itemId).kind === 'consumable')
    ),
    loot: {},
    echoes: 0
  }
  const heroes: Combatant[] = setup.heroes.map((character, index) => {
    const bonuses = getHeroBonuses(character)
    const stats = getCharacterStats(character, bonuses)

    return {
      id: `h-${character.id}`,
      side: 'hero',
      characterId: character.id,
      level: character.level,
      stats,
      health: Math.min(character.health, stats.maxHealth),
      focus: Math.round(stats.maxFocus / 2),
      initiative: Math.min(INITIATIVE_FULL - 1, roll(state) * 30 + bonuses.initiative),
      statuses: [],
      skills: getCharacterSkills(character),
      affinities: {},
      bars: 1,
      reserve: index >= ACTIVE_HEROES,
      fought: index < ACTIVE_HEROES,
      bonuses,
      runes: character.runes,
      ...traitState(getCharacterDefinition(character.id).trait)
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
  const statuses = (up && hasStatus(combatant, up) ? BUFF : 1) * (down && hasStatus(combatant, down) ? DEBUFF : 1)
  const stance = combatant.stance && (stat === 'attack' || stat === 'defense') ? STANCES[combatant.stance][stat] : 1
  const fury = stat === 'attack' && combatant.fury ? 1 + combatant.fury * FURY_ATTACK : 1
  const charges = stat === 'special' && combatant.charges ? 1 + combatant.charges.length * CHARGE_POWER : 1

  return value * statuses * stance * fury * charges
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
    actor.focus = Math.min(
      actor.stats.maxFocus,
      actor.focus + Math.ceil(actor.stats.maxFocus * (FOCUS_REGEN + (actor.bonuses?.focusRegen ?? 0)))
    )
    events.push({ type: 'turn', actorId: actor.id })

    if (actor.bonuses?.regen && actor.health < actor.stats.maxHealth) {
      heal(actor, Math.ceil(actor.stats.maxHealth * actor.bonuses.regen), events)
    }

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

/** A skill as a fighter uses it: with the upgrades of its skill tree. */
function skillOf(combatant: Combatant, skillId: string): Skill {
  const skill = getSkill(skillId)
  const upgrade = combatant.bonuses?.upgrades[skillId]

  if (!upgrade) {
    return skill
  }

  return {
    ...skill,
    power: skill.power * (1 + (upgrade.power ?? 0)),
    cost: Math.max(0, skill.cost - (upgrade.cost ?? 0)),
    statuses: skill.statuses?.map((status) => ({
      ...status,
      chance: Math.min(1, status.chance + (upgrade.statusChance ?? 0))
    }))
  }
}

/** The skills of a fighter as it uses them (upgrades included), usable or not. */
export function getCombatantSkills(state: BattleState, combatantId: string): Skill[] {
  const combatant = getCombatant(state, combatantId)

  return combatant.skills.map((id) => skillOf(combatant, id))
}

/** Skills a fighter can use now (enough focus). */
export function getUsableSkills(state: BattleState, combatantId: string): Skill[] {
  const combatant = getCombatant(state, combatantId)

  return getCombatantSkills(state, combatantId).filter((skill) => skill.cost <= combatant.focus)
}

/** Fallen heroes on the field (not in reserve): a revival potion can bring them back. */
function getFallenHeroes(state: BattleState): Combatant[] {
  return state.combatants.filter((combatant) => combatant.side === 'hero' && !combatant.reserve && !isAlive(combatant))
}

/** Who an item can be used on. */
export function getItemTargets(state: BattleState, item: Item): string[] {
  const target: ItemTarget = item.target ?? 'ally'

  switch (target) {
    case 'allEnemies':
      return getFighters(state, 'enemy').map((enemy) => enemy.id)
    case 'fallenAlly':
      return getFallenHeroes(state).map((hero) => hero.id)
    default:
      return getFighters(state, 'hero').map((hero) => hero.id)
  }
}

/** Items the party can use now: carried, and with someone to use them on. */
export function getUsableItems(state: BattleState): Item[] {
  return Object.entries(state.items)
    .filter(([, count]) => count > 0)
    .map(([itemId]) => getItem(itemId))
    .filter((item) => getItemTargets(state, item).length > 0)
}

/** Who a skill can be aimed at: the ids of the possible targets (for "all" skills, all of them at once). */
export function getTargets(state: BattleState, actorId: string, skill: Skill): string[] {
  const actor = getCombatant(state, actorId)
  const foes = getFighters(state, actor.side === 'hero' ? 'enemy' : 'hero')
  const allies = getFighters(state, actor.side)

  if (skill.revive) {
    return actor.side === 'hero' ? getFallenHeroes(state).map((hero) => hero.id) : []
  }

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

  if (action.type === 'item') {
    applyItem(state, actor, action.itemId, action.targetIds, events)

    if (!state.outcome && isAlive(actor)) {
      tickStatuses(actor, events)
    }

    state.actorId = null

    return { state, events }
  }

  if (action.type === 'retreat') {
    if (actor.side !== 'hero' || !state.canRetreat) {
      throw new Error('Retreating is not allowed')
    }

    state.outcome = 'retreat'
    state.actorId = null
    events.push({ type: 'end', outcome: 'retreat' })

    return { state, events }
  }

  if (!actor.skills.includes(action.skillId)) {
    throw new Error(`${actor.id} cannot use ${action.skillId}`)
  }

  const base = skillOf(actor, action.skillId)

  if (base.cost > actor.focus) {
    throw new Error(`${actor.id} cannot use ${base.id}`)
  }

  // Spending fury or charges adds power to this use of the skill.
  const spent =
    base.consumes === 'fury'
      ? 1 + (actor.fury ?? 0) / 100
      : base.consumes === 'charges'
        ? 1 + (actor.charges?.length ?? 0) * CHARGE_SPEND
        : 1
  const skill = spent > 1 ? { ...base, power: base.power * spent } : base
  const valid = getTargets(state, actor.id, skill)
  const single = skill.target === TargetType.ENEMY || skill.target === TargetType.ALLY
  const targetIds = single ? action.targetIds.filter((id) => valid.includes(id)).slice(0, 1) : valid

  if (targetIds.length === 0) {
    throw new Error(`No valid target for ${skill.id}`)
  }

  actor.focus -= skill.cost
  events.push({ type: 'action', actorId: actor.id, skillId: skill.id, targetIds })

  if (skill.stance && actor.stance) {
    actor.stance = actor.stance === 'offense' ? 'defense' : 'offense'
    events.push({ type: 'stance', targetId: actor.id, stance: actor.stance })
  }

  if (skill.consumes === 'fury') {
    actor.fury = 0
  }

  if (skill.consumes === 'charges') {
    actor.charges = []
  }

  for (const targetId of targetIds) {
    const target = getCombatant(state, targetId)

    if (skill.revive) {
      if (!isAlive(target)) {
        target.health = Math.max(
          1,
          Math.min(target.stats.maxHealth, Math.round(skill.power * effective(actor, 'special')))
        )
        target.statuses = []
        target.initiative = 0
        events.push({ type: 'revive', targetId, amount: target.health })
      }

      continue
    }

    if (!isAlive(target)) {
      continue
    }

    if (skill.cure) {
      cure(target, events)
    }

    if (skill.power > 0) {
      if (skill.heal) {
        const sap = actor.trait === Trait.SAP ? 1 + SAP_HEALING * (1 - target.health / target.stats.maxHealth) : 1
        const amount = Math.round(skill.power * effective(actor, 'special') * sap * (0.95 + roll(state) * 0.1))

        heal(target, amount, events)
      } else if (!strike(state, actor, target, skill, events)) {
        continue
      }
    }

    applyStatuses(state, actor, target, skill, events)

    if (state.outcome) {
      break
    }
  }

  if (actor.charges && skill.cost > 0 && CHARGING.includes(skill.damageType) && !skill.consumes) {
    actor.charges = [...new Set([...actor.charges, skill.damageType])]
  }

  if (!state.outcome && isAlive(actor)) {
    tickStatuses(actor, events)
  }

  state.actorId = null

  return { state, events }
}

/** The statuses a skill can leave, on its target or on its user. */
function applyStatuses(
  state: BattleState,
  actor: Combatant,
  target: Combatant,
  skill: Skill,
  events: BattleEvent[]
): void {
  for (const effect of skill.statuses ?? []) {
    const bearer = effect.onSelf || skill.target === TargetType.SELF ? actor : target
    const harmful = bearer.side !== actor.side
    const chance =
      (effect.chance + (harmful ? (actor.bonuses?.statusChance ?? 0) : 0)) *
      (CONTROL.has(effect.type) && isBoss(bearer) ? BOSS_CONTROL_FACTOR : 1)

    if (isAlive(bearer) && roll(state) < chance) {
      addStatus(bearer, effect.type, effect.turns, events)
    }
  }
}

function addStatus(bearer: Combatant, type: StatusType, turns: number, events: BattleEvent[]): void {
  const existing = bearer.statuses.find((status) => status.type === type)

  if (existing) {
    existing.turns = Math.max(existing.turns, turns)
  } else {
    bearer.statuses.push({ type, turns })
  }

  events.push({ type: 'status', targetId: bearer.id, status: type, turns })
}

/** A hero uses a consumable of the party on its targets. */
function applyItem(
  state: BattleState,
  actor: Combatant,
  itemId: string,
  targetIds: string[],
  events: BattleEvent[]
): void {
  const item = getItem(itemId)

  if (actor.side !== 'hero' || item.kind !== 'consumable' || (state.items[itemId] ?? 0) <= 0) {
    throw new Error(`${actor.id} cannot use ${itemId}`)
  }

  const valid = getItemTargets(state, item)
  const single = item.target === 'ally' || item.target === 'fallenAlly'
  const targets = single ? targetIds.filter((id) => valid.includes(id)).slice(0, 1) : valid

  if (targets.length === 0) {
    throw new Error(`No valid target for ${itemId}`)
  }

  state.items[itemId]--
  events.push({ type: 'item', actorId: actor.id, itemId, targetIds: targets })

  for (const targetId of targets) {
    const target = getCombatant(state, targetId)

    if (item.target === 'fallenAlly') {
      target.health = Math.max(1, Math.round(target.stats.maxHealth * (item.heal ?? 0)))
      target.statuses = []
      target.initiative = 0
      events.push({ type: 'revive', targetId, amount: target.health })
      continue
    }

    if (item.power) {
      const bomb: Skill = {
        id: itemId,
        cost: 0,
        target: TargetType.ALL_ENEMIES,
        power: item.power,
        stat: 'attack',
        damageType: item.damageType ?? DamageType.FIRE,
        statuses: item.status ? [item.status] : undefined
      }

      if (isAlive(target) && strike(state, actor, target, bomb, events)) {
        applyStatuses(state, actor, target, bomb, events)
      }

      if (state.outcome) {
        return
      }

      continue
    }

    if (item.heal) {
      heal(target, Math.round(target.stats.maxHealth * item.heal), events)
    }

    if (item.focus) {
      const restored = Math.min(target.stats.maxFocus - target.focus, Math.round(target.stats.maxFocus * item.focus))

      target.focus += restored
      events.push({ type: 'focus', targetId, amount: restored })
    }

    if (item.cure) {
      cure(target, events)
    }
  }
}

/** Removes the harmful statuses of a fighter. */
function cure(target: Combatant, events: BattleEvent[]): void {
  for (const status of target.statuses.filter((candidate) => HARMFUL.has(candidate.type))) {
    events.push({ type: 'statusEnd', targetId: target.id, status: status.type })
  }

  target.statuses = target.statuses.filter((status) => !HARMFUL.has(status.type))
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

  const marks = actor.marks?.[target.id] ?? 0
  const critical = roll(state) < actor.stats.critChance + (skill.critBonus ?? 0) + marks * MARK_CRIT

  if (actor.marks) {
    actor.marks[target.id] = critical ? 0 : Math.min(MAX_MARKS, marks + 1)
  }

  const weak = affinity === Affinity.WEAK
  const amount = Math.max(
    1,
    Math.round(
      skill.power *
        effective(actor, skill.stat) *
        (100 / (100 + effective(target, 'defense'))) *
        Math.abs(AFFINITY_MULTIPLIER[affinity]) *
        (critical ? actor.stats.critDamage : 1) *
        (1 + (actor.bonuses?.damage[skill.damageType] ?? 0)) *
        (weak ? 1 + (actor.bonuses?.weakness ?? 0) : 1) *
        (1 - Math.min(MAX_GUARD, target.bonuses?.guard ?? 0)) *
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
    weak,
    resisted: affinity === Affinity.RESIST
  })
  hurt(state, target, amount, events)

  if (actor.bonuses?.lifesteal && isAlive(actor) && !state.outcome) {
    heal(actor, Math.max(1, Math.round(amount * actor.bonuses.lifesteal)), events)
  }

  // The weapon attack can leave the statuses of the weapon, the runes and the tree.
  if (skill.id === actor.skills[0] && isAlive(target) && !state.outcome) {
    for (const effect of actor.bonuses?.onHit ?? []) {
      const chance = effect.chance * (CONTROL.has(effect.type) && isBoss(target) ? BOSS_CONTROL_FACTOR : 1)

      if (roll(state) < chance) {
        addStatus(target, effect.type, effect.turns, events)
      }
    }
  }

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

  if (target.fury !== undefined) {
    target.fury = Math.min(MAX_FURY, target.fury + Math.round((amount / target.stats.maxHealth) * 100))
  }

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
    // Some bosses learn new skills when a bar empties.
    const species = getSpecies(target.speciesId!)
    const learned = species.phaseSkills?.[species.bars - target.bars - 1] ?? []

    target.skills = [...target.skills, ...learned.filter((skill) => !target.skills.includes(skill))]

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
    dropLoot(state, target)

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

/** What a defeated enemy leaves: smithing stones of the biome, a potion now and then, and very rarely an Echo. */
function dropLoot(state: BattleState, enemy: Combatant): void {
  const species = getSpecies(enemy.speciesId!)

  const add = (itemId: string, count = 1) => {
    state.loot[itemId] = (state.loot[itemId] ?? 0) + count
  }

  const potions = BIOME_POTIONS[state.biome]

  if (species.strength > 1) {
    add(BIOME_STONE[state.biome], BOSS_STONES * species.bars)
  } else if (roll(state) < (enemy.elite ? DROP_CHANCE.eliteStone : DROP_CHANCE.stone)) {
    add(BIOME_STONE[state.biome])
  }

  if (roll(state) < (enemy.elite || species.strength > 1 ? DROP_CHANCE.elitePotion : DROP_CHANCE.potion)) {
    add(potions[Math.floor(roll(state) * potions.length)])
  }

  if (roll(state) < DROP_CHANCE.echo) {
    state.echoes++
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
    return healing.target === TargetType.ALL_ALLIES ? act(healing) : act(healing, hurtAlly.id)
  }

  const alliesBuff = specials.find(
    (skill) =>
      skill.target === TargetType.ALL_ALLIES &&
      !skill.heal &&
      allies.some((ally) => !skill.statuses?.every((status) => hasStatus(ally, status.type)))
  )

  if (alliesBuff && roll(state) < 0.25) {
    return act(alliesBuff)
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
