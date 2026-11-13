import { getCharacterDefinition } from '@/app/(protected)/(engine)/data/characters'
import { CYCLE_BOSS_SKILLS } from '@/app/(protected)/(engine)/data/cycles'
import { getEnemyRewards, getEnemyStats, getSpecies } from '@/app/(protected)/(engine)/data/enemies'
import {
  BASIC_POTION_CHANCE,
  BASIC_POTIONS,
  BIOME_DROPS,
  BIOME_STONE,
  BOSS_ITEMS,
  BOSS_STONES,
  DROP_CHANCE,
  getItem,
  MAX_BASIC_POTIONS
} from '@/app/(protected)/(engine)/data/items'
import { getSkill } from '@/app/(protected)/(engine)/data/skills'
import { Affinity } from '@/app/(protected)/(engine)/models/Affinity'
import { Archetype } from '@/app/(protected)/(engine)/models/Archetype'
import { BattleAction } from '@/app/(protected)/(engine)/models/BattleAction'
import { BattleEvent } from '@/app/(protected)/(engine)/models/BattleEvent'
import { BattleState, EnemySpawn } from '@/app/(protected)/(engine)/models/BattleState'
import { Biome } from '@/app/(protected)/(engine)/models/Biome'
import { CharacterState } from '@/app/(protected)/(engine)/models/CharacterState'
import { Combatant, RuneState } from '@/app/(protected)/(engine)/models/Combatant'
import { CombatStats } from '@/app/(protected)/(engine)/models/CombatStats'
import { DamageType } from '@/app/(protected)/(engine)/models/DamageType'
import { EnemySpecies } from '@/app/(protected)/(engine)/models/EnemySpecies'
import { Item, ItemTarget, StoneId } from '@/app/(protected)/(engine)/models/Item'
import { Perk } from '@/app/(protected)/(engine)/models/Perk'
import { Skill, SkillStatus } from '@/app/(protected)/(engine)/models/Skill'
import { Stance } from '@/app/(protected)/(engine)/models/Stance'
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
/**
 * Items a hero can use in one turn: each one keeps the turn going (it can use
 * another or then attack or use a special) until the third, which ends it.
 */
export const MAX_ITEMS_PER_TURN = 3
/** Most shields a fighter can stack (each one stops a whole hit). */
export const MAX_SHIELDS = 9
const INITIATIVE_FULL = 100
/** Share of the maximum health that regeneration gives back at the start of each turn. */
const REGEN_SHARE = 0.06
/** Critical chance added while the critical chance is up. */
const CRIT_UP_CHANCE = 0.2
/** What an imbued weapon does: the kind of hit of its attacks, and the status they can leave. */
const IMBUES: Partial<Record<StatusType, { damageType?: DamageType; onHit: SkillStatus }>> = {
  [StatusType.IMBUE_FIRE]: { damageType: DamageType.FIRE, onHit: { type: StatusType.BURN, chance: 0.3, turns: 2 } },
  [StatusType.IMBUE_ICE]: { damageType: DamageType.ICE, onHit: { type: StatusType.FREEZE, chance: 0.12, turns: 1 } },
  [StatusType.IMBUE_LIGHTNING]: {
    damageType: DamageType.LIGHTNING,
    onHit: { type: StatusType.STUN, chance: 0.12, turns: 1 }
  },
  [StatusType.IMBUE_EARTH]: {
    damageType: DamageType.EARTH,
    onHit: { type: StatusType.DEFENSE_DOWN, chance: 0.3, turns: 2 }
  },
  [StatusType.IMBUE_LIGHT]: { damageType: DamageType.LIGHT, onHit: { type: StatusType.BLIND, chance: 0.25, turns: 2 } },
  [StatusType.IMBUE_DARKNESS]: {
    damageType: DamageType.DARKNESS,
    onHit: { type: StatusType.ATTACK_DOWN, chance: 0.3, turns: 2 }
  },
  [StatusType.IMBUE_VENOM]: { onHit: { type: StatusType.POISON, chance: 0.4, turns: 3 } }
}

/** Whether a status is one of the imbuements of the weapon (only one at a time). */
export function isImbue(type: StatusType): boolean {
  return type in IMBUES
}

/** Share of the maximum focus recovered with each weapon attack. */
const ATTACK_FOCUS = 0.25
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
const STANCES: Record<Stance, { attack: number; defense: number }> = {
  [Stance.NONE]: { attack: 1, defense: 1 },
  [Stance.DEFENSE]: { attack: 0.9, defense: 1.3 },
  [Stance.OFFENSE]: { attack: 1.2, defense: 0.9 },
  [Stance.VIRTUOUS]: { attack: 1.5, defense: 0.85 }
}
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
/** Runes (see Perk): how long or how far their conditions reach. */
const OPENING_TURNS = 3
const WARM_UP_TURNS = 5
const MAX_FRENZY = 4
const LOW_HEALTH = 0.3
const LAST_BREATH_HEALTH = 0.15
const SOS_HEALTH = 0.5
const JUDGMENT_EVERY = 5
const PLAGUE_TURNS = 3
const LONE_WOLF_TURNS = 2
/** The buffs a rune can start the battle with. */
const START_BUFFS: [Perk, StatusType][] = [
  [Perk.START_ATTACK_UP, StatusType.ATTACK_UP],
  [Perk.START_DEFENSE_UP, StatusType.DEFENSE_UP],
  [Perk.START_SPEED_UP, StatusType.SPEED_UP]
]
const BUFFS = new Set([
  StatusType.ATTACK_UP,
  StatusType.DEFENSE_UP,
  StatusType.SPEED_UP,
  StatusType.CRIT_UP,
  StatusType.REGEN
])
/** The statuses each immunity of the runes keeps away. */
const IMMUNITIES: [Perk, StatusType[]][] = [
  [Perk.IMMUNE_DOTS, [StatusType.POISON, StatusType.BURN, StatusType.BLEED]],
  [Perk.IMMUNE_CONTROL, [StatusType.FREEZE, StatusType.STUN]],
  [Perk.IMMUNE_BLIND, [StatusType.BLIND, StatusType.ATTACK_DOWN, StatusType.DEFENSE_DOWN, StatusType.SPEED_DOWN]]
]
/** The element a rune turns the weapon attack into. */
const WEAPON_ELEMENTS: [Perk, DamageType][] = [
  [Perk.FIRE_WEAPON, DamageType.FIRE],
  [Perk.ICE_WEAPON, DamageType.ICE],
  [Perk.LIGHTNING_WEAPON, DamageType.LIGHTNING]
]

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
      return { trait, stance: Stance.NONE }
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

/** The party can retreat when the fight allows it (not against bosses) and every hero, on the field or in reserve, is alive. */
export function canRetreat(state: BattleState): boolean {
  return state.canRetreat && state.combatants.every((combatant) => combatant.side !== 'hero' || isAlive(combatant))
}

/** Fighters on the field: alive and not waiting in reserve. */
export function getFighters(state: BattleState, side?: Combatant['side']): Combatant[] {
  return state.combatants.filter(
    (combatant) => isAlive(combatant) && !combatant.reserve && (!side || combatant.side === side)
  )
}

/** The skills of an enemy: from the first New Game+ on, the bosses know one more. */
function cycleSkills(species: EnemySpecies, cycle: number): string[] {
  const extra = CYCLE_BOSS_SKILLS[species.archetype].find((skill) => !species.skills.includes(skill))

  return cycle > 0 && species.rarity === 'boss' && extra ? [...species.skills, extra] : species.skills
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
      skills: cycleSkills(species, state.cycle),
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
      weaponId: character.weaponId,
      level: character.level,
      stats,
      health: Math.min(character.health, stats.maxHealth),
      focus: Math.min(stats.maxFocus, character.focus ?? Math.round(stats.maxFocus / 2)),
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

  for (const hero of heroes.filter((candidate) => !candidate.reserve)) {
    startRunes(hero)
  }

  return {
    state,
    events: [{ type: 'phase', phase: 0, enemyIds: state.combatants.filter((c) => c.side === 'enemy').map((c) => c.id) }]
  }
}

function hasStatus(combatant: Combatant, type: StatusType): boolean {
  return combatant.statuses.some((status) => status.type === type)
}

/** The value of a perk of the runes and echoes of a fighter (0 when it has none). */
function perkOf(combatant: Combatant, perk: Perk): number {
  return combatant.bonuses?.perks[perk] ?? 0
}

function emptyRuneState(): RuneState {
  return {
    turns: 0,
    hits: 0,
    specials: 0,
    streak: 0,
    struck: false,
    hurt: false,
    damagedSinceTurn: false,
    afterCrit: false,
    survived: false,
    rose: false,
    sos: false,
    critFocus: false,
    statusFocus: false,
    eclipse: false,
    bonus: false,
    inBonus: false,
    actAgain: false
  }
}

function runeStateOf(combatant: Combatant): RuneState {
  combatant.runeState ??= emptyRuneState()

  return combatant.runeState
}

function triggerPerk(combatant: Combatant, perk: Perk, events: BattleEvent[]): void {
  events.push({ type: 'perk', targetId: combatant.id, perk })
}

/** Gives a fighter back a share of its maximum focus. */
function restoreFocus(combatant: Combatant, share: number, events: BattleEvent[]): void {
  const restored = Math.min(combatant.stats.maxFocus - combatant.focus, Math.ceil(combatant.stats.maxFocus * share))

  if (restored > 0) {
    combatant.focus += restored
    events.push({ type: 'focus', targetId: combatant.id, amount: restored })
  }
}

/** A hero steps onto the field: what its runes give it at the start (focus, a shield, the first turn, buffs). */
function startRunes(hero: Combatant): void {
  if (!hero.bonuses) {
    return
  }

  hero.runeState = emptyRuneState()

  const focus = perkOf(hero, Perk.START_FOCUS)

  if (focus) {
    hero.focus = Math.min(hero.stats.maxFocus, hero.focus + Math.round(hero.stats.maxFocus * focus))
  }

  if (perkOf(hero, Perk.DAWN)) {
    hero.initiative = INITIATIVE_FULL
  }

  if (perkOf(hero, Perk.BARRIER)) {
    hero.shields = Math.min(MAX_SHIELDS, (hero.shields ?? 0) + 1)
  }

  for (const [perk, type] of START_BUFFS) {
    const turns = perkOf(hero, perk)

    if (turns) {
      addStatus(hero, type, turns, [], hero)
    }
  }
}

/** The start of a turn of a hero: what its runes do then. */
function beginRuneTurn(state: BattleState, actor: Combatant, events: BattleEvent[]): void {
  const runes = runeStateOf(actor)

  runes.turns++
  runes.critFocus = false
  runes.statusFocus = false
  runes.eclipse = false

  if (
    perkOf(actor, Perk.PERFECT_INSTANT) &&
    runes.turns > 1 &&
    !runes.damagedSinceTurn &&
    actor.health < actor.stats.maxHealth
  ) {
    triggerPerk(actor, Perk.PERFECT_INSTANT, events)
    heal(actor, actor.stats.maxHealth, events)
  }

  runes.damagedSinceTurn = false

  const opening = perkOf(actor, Perk.OPENING_REGEN)

  if (opening && runes.turns <= OPENING_TURNS && actor.health < actor.stats.maxHealth) {
    heal(actor, Math.ceil(actor.stats.maxHealth * opening), events)
  }

  const focus = perkOf(actor, Perk.TURN_FOCUS)

  if (focus) {
    restoreFocus(actor, focus, events)
  }

  if (
    perkOf(actor, Perk.LONE_WOLF) &&
    getFighters(state, 'hero').length === 1 &&
    !hasStatus(actor, StatusType.SPEED_UP)
  ) {
    triggerPerk(actor, Perk.LONE_WOLF, events)
    addStatus(actor, StatusType.SPEED_UP, LONE_WOLF_TURNS, events, actor)
  }
}

/** The end of an action of a hero: its runes can give it another one right away. */
function endRuneAction(actor: Combatant): void {
  const runes = actor.runeState

  if (!runes || !isAlive(actor)) {
    return
  }

  if (runes.actAgain || (perkOf(actor, Perk.TWIN) && !runes.inBonus)) {
    runes.actAgain = false
    runes.bonus = true
    actor.initiative = INITIATIVE_FULL
  }
}

/** The power a special gets from the runes of its user (in a row, every third one, with full focus). */
function runeSkillPower(actor: Combatant, skill: Skill, weaponAttack: boolean, events: BattleEvent[]): number {
  if (!actor.runeState) {
    return 1
  }

  const runes = actor.runeState

  if (weaponAttack) {
    runes.streak = 0

    return 1
  }

  if (skill.cost <= 0) {
    return 1
  }

  runes.specials++
  runes.streak++

  let power = 1 + perkOf(actor, Perk.FRENZY) * Math.min(MAX_FRENZY, runes.streak - 1)

  if (perkOf(actor, Perk.THIRD_SPECIAL) && runes.specials % 3 === 0) {
    triggerPerk(actor, Perk.THIRD_SPECIAL, events)
    power *= 2
  }

  if (perkOf(actor, Perk.FULL_CUP) && actor.focus >= actor.stats.maxFocus) {
    power *= 1 + perkOf(actor, Perk.FULL_CUP)
  }

  return power
}

/** How much the runes of a hero change the damage of a hit. */
function runeDamage(
  state: BattleState,
  actor: Combatant,
  target: Combatant,
  critical: boolean,
  events: BattleEvent[]
): number {
  if (!actor.runeState) {
    return 1
  }

  const runes = actor.runeState
  const health = actor.health / actor.stats.maxHealth
  const heroes = getFighters(state, 'hero')
  let bonus = perkOf(actor, Perk.DAMAGE_DEALT) + perkOf(actor, Perk.WARM_UP) * Math.min(WARM_UP_TURNS, runes.turns)

  if (!runes.struck) {
    bonus += perkOf(actor, Perk.FIRST_STRIKE)
  }

  if (health >= 1) {
    bonus += perkOf(actor, Perk.FULL_HEALTH)
  }

  if (!runes.hurt) {
    bonus += perkOf(actor, Perk.UNTOUCHED)
  }

  if (health < LAST_BREATH_HEALTH) {
    bonus += perkOf(actor, Perk.LAST_BREATH)
  }

  if (actor.side === 'hero' && heroes.length === 1) {
    bonus += perkOf(actor, Perk.LONE_WOLF)
  }

  if (heroes.length >= ACTIVE_HEROES) {
    bonus += perkOf(actor, Perk.TEAMWORK)
  }

  if (hasStatus(target, StatusType.BURN)) {
    bonus += perkOf(actor, Perk.BURN_HUNTER)
  }

  if (hasStatus(target, StatusType.FREEZE)) {
    bonus += perkOf(actor, Perk.FROST_BREAKER)
  }

  bonus += perkOf(actor, Perk.CRUCIBLE) * actor.statuses.length

  let factor = Math.max(0.1, 1 + bonus) * (1 - perkOf(actor, Perk.TWIN))

  if (perkOf(actor, Perk.COUNTERPOINT)) {
    if (critical) {
      runes.afterCrit = true
    } else if (runes.afterCrit) {
      runes.afterCrit = false
      triggerPerk(actor, Perk.COUNTERPOINT, events)
      factor *= 2
    }
  }

  runes.hits++
  runes.struck = true

  if (perkOf(actor, Perk.JUDGMENT) && runes.hits % JUDGMENT_EVERY === 0) {
    triggerPerk(actor, Perk.JUDGMENT, events)
    factor *= 1 + perkOf(actor, Perk.JUDGMENT)
  }

  if (perkOf(actor, Perk.COIN)) {
    factor *= roll(state) < 0.5 ? 0.5 : 2
  }

  return factor
}

/** A hero defeated an enemy: what its runes give it for it. */
function onKill(state: BattleState, actor: Combatant, poisoned: boolean, events: BattleEvent[]): void {
  if (!actor.runeState || state.outcome || !isAlive(actor)) {
    return
  }

  const runes = actor.runeState
  const healing = perkOf(actor, Perk.KILL_HEAL)
  const focus = perkOf(actor, Perk.KILL_FOCUS)
  const initiative = perkOf(actor, Perk.LIGHTNING)

  if (healing) {
    heal(actor, Math.ceil(actor.stats.maxHealth * healing), events)
  }

  if (focus) {
    restoreFocus(actor, focus, events)
  }

  if (initiative) {
    actor.initiative = Math.min(INITIATIVE_FULL - 1, actor.initiative + initiative)
  }

  if (perkOf(actor, Perk.ECLIPSE) && !runes.eclipse) {
    runes.eclipse = true
    runes.actAgain = true
    triggerPerk(actor, Perk.ECLIPSE, events)
  }

  const others = getFighters(state, 'enemy').filter((enemy) => !hasStatus(enemy, StatusType.POISON))

  if (perkOf(actor, Perk.PLAGUE) && poisoned && others.length > 0) {
    const victim = others[Math.floor(roll(state) * others.length)]

    triggerPerk(actor, Perk.PLAGUE, events)
    addStatus(victim, StatusType.POISON, PLAGUE_TURNS, events, actor)
  }
}

/** A hero fell for good: what its runes leave to its allies. */
function onHeroFall(state: BattleState, hero: Combatant, events: BattleEvent[]): void {
  if (!hero.bonuses) {
    return
  }

  const allies = getFighters(state, 'hero')
  const martyr = perkOf(hero, Perk.MARTYR)
  const wrath = perkOf(hero, Perk.WRATH)
  const blast = perkOf(hero, Perk.LAST_BLAST)

  if (perkOf(hero, Perk.LEGACY) && allies.length > 0) {
    triggerPerk(hero, Perk.LEGACY, events)

    for (const ally of allies) {
      heal(ally, ally.stats.maxHealth, events)
      restoreFocus(ally, 1, events)
    }
  } else if (martyr && allies.length > 0) {
    triggerPerk(hero, Perk.MARTYR, events)

    for (const ally of allies) {
      heal(ally, Math.round(ally.stats.maxHealth * martyr), events)
    }
  }

  const unshielded = allies.filter((ally) => !ally.shields)

  if (perkOf(hero, Perk.SHELTER) && unshielded.length > 0) {
    triggerPerk(hero, Perk.SHELTER, events)

    for (const ally of unshielded) {
      addShields(ally, 1, events)
    }
  }

  if (wrath && allies.length > 0) {
    triggerPerk(hero, Perk.WRATH, events)

    for (const ally of allies) {
      addStatus(ally, StatusType.ATTACK_UP, wrath, events, hero)
    }
  }

  if (blast) {
    const weapon = getSkill(hero.skills[0])
    const burst: Skill = {
      id: 'final-blast',
      cost: 0,
      target: TargetType.ALL_ENEMIES,
      power: blast,
      stat: 'attack',
      damageType: weapon.damageType
    }

    triggerPerk(hero, Perk.LAST_BLAST, events)

    for (const enemy of getFighters(state, 'enemy')) {
      if (state.outcome) {
        break
      }

      strike(state, hero, enemy, burst, events, true)
    }
  }
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
 * it takes its damage over time and loses the turn if it is
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
    events.push({ type: 'turn', actorId: actor.id })

    // An extra action given by a rune is not a new turn: no regeneration, damage over time nor turn effects.
    const bonus = actor.runeState?.bonus ?? false

    if (actor.runeState) {
      actor.runeState.bonus = false
      actor.runeState.inBonus = bonus
    }

    if (!bonus) {
      if (actor.runeState) {
        beginRuneTurn(state, actor, events)
      }

      if (actor.bonuses?.regen && actor.health < actor.stats.maxHealth) {
        heal(actor, Math.ceil(actor.stats.maxHealth * actor.bonuses.regen), events)
      }

      if (hasStatus(actor, StatusType.REGEN) && actor.health < actor.stats.maxHealth) {
        heal(actor, Math.ceil(actor.stats.maxHealth * REGEN_SHARE * (isBoss(actor) ? BOSS_DOT_FACTOR : 1)), events)
      }

      for (const status of actor.statuses) {
        const share = DOT_SHARE[status.type]

        if (share) {
          const amount = Math.max(
            1,
            Math.round(actor.stats.maxHealth * share * (status.power ?? 1) * (isBoss(actor) ? BOSS_DOT_FACTOR : 1))
          )

          events.push({ type: 'statusTick', targetId: actor.id, status: status.type, amount })
          hurt(state, actor, amount, events)
        }
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
    state.itemsUsed = 0
    break
  }

  return { state, events }
}

/** A skill as a fighter uses it: with the levels it has in its skill tree. */
function skillOf(combatant: Combatant, skillId: string): Skill {
  let skill = upgradedSkill(combatant, skillId)
  const economy = perkOf(combatant, Perk.ECONOMY)
  const element = skillId === combatant.skills[0] && WEAPON_ELEMENTS.find(([perk]) => perkOf(combatant, perk) > 0)

  if (economy && skill.cost > 0) {
    skill = { ...skill, cost: Math.max(1, Math.round(skill.cost * (1 - economy))) }
  }

  if (element && PHYSICAL.has(skill.damageType)) {
    skill = { ...skill, damageType: element[1] }
  }

  const imbued = skillId === combatant.skills[0] ? imbueOf(combatant)?.damageType : undefined

  if (imbued) {
    skill = { ...skill, damageType: imbued }
  }

  return skill
}

/** The imbuement of the weapon of a fighter, if it has one. */
function imbueOf(combatant: Combatant): (typeof IMBUES)[StatusType] {
  const status = combatant.statuses.find((candidate) => isImbue(candidate.type))

  return status ? IMBUES[status.type] : undefined
}

/** A skill with the levels its user has in its skill tree. */
function upgradedSkill(combatant: Combatant, skillId: string): Skill {
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
      chance: Math.min(1, status.chance + (upgrade.statusChance ?? 0)),
      turns: status.turns >= 2 ? status.turns + (upgrade.turns ?? 0) : status.turns
    }))
  }
}

/** The skills of a fighter as it uses them (upgrades included), usable or not. */
export function getCombatantSkills(state: BattleState, combatantId: string): Skill[] {
  const combatant = getCombatant(state, combatantId)

  return combatant.skills.map((id) => skillOf(combatant, id))
}

/** Whether the stance of a fighter lets it use a skill (Kael: some only in one stance). */
export function isStanceMet(combatant: Combatant, skill: Skill): boolean {
  return !skill.requires || (!!combatant.stance && skill.requires.includes(combatant.stance))
}

/** Skills a fighter can use now (enough focus, and in the stance they ask for). */
export function getUsableSkills(state: BattleState, combatantId: string): Skill[] {
  const combatant = getCombatant(state, combatantId)

  return getCombatantSkills(state, combatantId).filter(
    (skill) => skill.cost <= combatant.focus && isStanceMet(combatant, skill)
  )
}

/** Fallen heroes on the field (not in reserve): a revival potion can bring them back. */
function getFallenHeroes(state: BattleState): Combatant[] {
  return state.combatants.filter((combatant) => combatant.side === 'hero' && !combatant.reserve && !isAlive(combatant))
}

/** Who an item can be used on. */
export function getItemTargets(state: BattleState, item: Item): string[] {
  const target: ItemTarget = item.target ?? 'ally'

  switch (target) {
    case 'enemy':
    case 'allEnemies':
      return getFighters(state, 'enemy').map((enemy) => enemy.id)
    case 'fallenAlly':
      return getFallenHeroes(state).map((hero) => hero.id)
    default:
      return getFighters(state, 'hero').map((hero) => hero.id)
  }
}

/** Items the hero whose turn it is can still use in it. */
export function getItemsLeft(state: BattleState): number {
  return Math.max(0, MAX_ITEMS_PER_TURN - (state.itemsUsed ?? 0))
}

/** Items the party can use now: carried, and with someone to use them on. */
export function getUsableItems(state: BattleState): Item[] {
  if (getItemsLeft(state) <= 0) {
    return []
  }

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
 * an item or a retreat. Then the turn ends, except after an item: the hero
 * keeps the turn (`actorId` stays) until it uses MAX_ITEMS_PER_TURN of them
 * or does anything else.
 */
export function performAction(battle: BattleState, action: BattleAction): BattleStep {
  const state = structuredClone(battle)
  const events: BattleEvent[] = []
  const actor = getCombatant(state, state.actorId ?? '')

  if (action.type === 'item') {
    if (getItemsLeft(state) <= 0) {
      throw new Error(`${actor.id} cannot use more items this turn`)
    }

    applyItem(state, actor, action.itemId, action.targetIds, events)
    state.itemsUsed = (state.itemsUsed ?? 0) + 1

    if (perkOf(actor, Perk.ITEM_FOCUS) && !state.outcome && isAlive(actor)) {
      restoreFocus(actor, perkOf(actor, Perk.ITEM_FOCUS), events)
    }

    // The turn goes on until the last item it can use.
    if (!state.outcome && isAlive(actor) && getItemsLeft(state) > 0) {
      return { state, events }
    }

    if (!state.outcome && isAlive(actor) && !actor.runeState?.inBonus) {
      tickStatuses(actor, events)
    }

    endRuneAction(actor)
    state.actorId = null
    state.itemsUsed = 0

    return { state, events }
  }

  if (action.type === 'retreat') {
    if (actor.side !== 'hero' || !canRetreat(state)) {
      throw new Error('Retreating is not allowed')
    }

    state.outcome = 'retreat'
    state.actorId = null
    state.itemsUsed = 0
    events.push({ type: 'end', outcome: 'retreat' })

    return { state, events }
  }

  if (!actor.skills.includes(action.skillId)) {
    throw new Error(`${actor.id} cannot use ${action.skillId}`)
  }

  const base = skillOf(actor, action.skillId)

  if (base.cost > actor.focus || !isStanceMet(actor, base)) {
    throw new Error(`${actor.id} cannot use ${base.id}`)
  }

  // Spending fury or charges adds power to this use of the skill.
  const spent =
    base.consumes === 'fury'
      ? 1 + (actor.fury ?? 0) / 100
      : base.consumes === 'charges'
        ? 1 + (actor.charges?.length ?? 0) * CHARGE_SPEND
        : 1
  // The runes add power to the specials (in a row, every third one, with full focus).
  const runePower = base.heal ? 1 : runeSkillPower(actor, base, base.id === actor.skills[0], events)
  const skill = spent * runePower !== 1 ? { ...base, power: base.power * spent * runePower } : base
  const valid = getTargets(state, actor.id, skill)
  const single = skill.target === TargetType.ENEMY || skill.target === TargetType.ALLY
  const targetIds = single ? action.targetIds.filter((id) => valid.includes(id)).slice(0, 1) : valid

  if (targetIds.length === 0) {
    throw new Error(`No valid target for ${skill.id}`)
  }

  actor.focus -= skill.cost
  events.push({ type: 'action', actorId: actor.id, skillId: skill.id, targetIds })

  // The weapon attack is how focus comes back.
  if (skill.id === actor.skills[0]) {
    const restored = Math.min(
      actor.stats.maxFocus - actor.focus,
      Math.ceil(actor.stats.maxFocus * (ATTACK_FOCUS + (actor.bonuses?.focusRegen ?? 0)))
    )

    if (restored > 0) {
      actor.focus += restored
      events.push({ type: 'focus', targetId: actor.id, amount: restored })
    }
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
        const healed = heal(target, amount, events)

        afterHeal(actor, target, healed, events)
      } else {
        // A rune can make the weapon attack hit twice, each hit with part of the power.
        const double = skill.id === actor.skills[0] ? perkOf(actor, Perk.DOUBLE_STRIKE) : 0
        const hit = double ? { ...skill, power: skill.power * double } : skill
        let landed = strike(state, actor, target, hit, events)

        if (double && isAlive(target) && isAlive(actor) && !state.outcome) {
          landed = strike(state, actor, target, hit, events) || landed
        }

        if (!landed) {
          continue
        }
      }
    }

    applyStatuses(state, actor, target, skill, events)

    if (skill.shields && skill.target !== TargetType.ENEMY && skill.target !== TargetType.ALL_ENEMIES) {
      addShields(target, skill.shields, events)
    }

    if (state.outcome) {
      break
    }
  }

  if (actor.charges && skill.cost > 0 && CHARGING.includes(skill.damageType) && !skill.consumes) {
    actor.charges = [...new Set([...actor.charges, skill.damageType])]
  }

  // Kael: the skill hit in the stance he was in, and leaves him in its own.
  if (skill.stance && actor.stance && actor.stance !== skill.stance && isAlive(actor)) {
    actor.stance = skill.stance
    events.push({ type: 'stance', targetId: actor.id, stance: actor.stance })
  }

  if (!state.outcome && isAlive(actor) && !actor.runeState?.inBonus) {
    tickStatuses(actor, events)
  }

  endRuneAction(actor)
  state.actorId = null
  state.itemsUsed = 0

  return { state, events }
}

/** Gives shields to a fighter (they stack, up to MAX_SHIELDS). */
function addShields(target: Combatant, count: number, events: BattleEvent[]): void {
  const shields = Math.min(MAX_SHIELDS, (target.shields ?? 0) + count)
  const change = shields - (target.shields ?? 0)

  if (!isAlive(target) || change <= 0) {
    return
  }

  target.shields = shields
  events.push({ type: 'shields', targetId: target.id, change, shields })
}

/** A hero healed someone: what its runes add (a share of the healing for itself, a buff, a shield). */
function afterHeal(actor: Combatant, target: Combatant, healed: number, events: BattleEvent[]): void {
  if (!actor.runeState || !isAlive(target)) {
    return
  }

  const share = perkOf(actor, Perk.HEAL_SHARE)
  const buff = perkOf(actor, Perk.HEAL_BUFF)

  if (share && target !== actor && healed > 0) {
    heal(actor, Math.max(1, Math.round(healed * share)), events)
  }

  if (buff) {
    addStatus(target, StatusType.ATTACK_UP, buff, events, actor)
  }

  if (perkOf(actor, Perk.AEGIS) && !target.shields) {
    triggerPerk(target, Perk.AEGIS, events)
    addShields(target, 1, events)
  }
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
      addStatus(bearer, effect.type, effect.turns, events, actor)
    }
  }
}

/**
 * Leaves a status on a fighter, unless a rune makes it immune. The runes of
 * whoever leaves it can make it last longer or hurt more, and the ones of
 * the bearer make its buffs last longer.
 */
function addStatus(
  bearer: Combatant,
  type: StatusType,
  turns: number,
  events: BattleEvent[],
  source?: Combatant
): void {
  if (
    IMMUNITIES.some(([perk, types]) => types.includes(type) && perkOf(bearer, perk) > 0) ||
    (HARMFUL.has(type) && hasStatus(bearer, StatusType.WARD))
  ) {
    events.push({ type: 'immune', targetId: bearer.id })

    return
  }

  // The weapon holds one imbuement: a new one takes the place of the old.
  if (isImbue(type)) {
    for (const old of bearer.statuses.filter((status) => isImbue(status.type) && status.type !== type)) {
      events.push({ type: 'statusEnd', targetId: bearer.id, status: old.type })
    }

    bearer.statuses = bearer.statuses.filter((status) => !isImbue(status.type) || status.type === type)
  }

  const lasting =
    turns +
    (type === StatusType.BURN && source ? perkOf(source, Perk.LONG_BURN) : 0) +
    (BUFFS.has(type) ? perkOf(bearer, Perk.PERSISTENCE) : 0)
  const power = source && DOT_SHARE[type] ? 1 + perkOf(source, Perk.FEVER) : 1
  const existing = bearer.statuses.find((status) => status.type === type)

  if (existing) {
    existing.turns = Math.max(existing.turns, lasting)

    if (power > (existing.power ?? 1)) {
      existing.power = power
    }
  } else {
    bearer.statuses.push(power > 1 ? { type, turns: lasting, power } : { type, turns: lasting })
  }

  events.push({ type: 'status', targetId: bearer.id, status: type, turns: lasting })

  const focus = source ? perkOf(source, Perk.STATUS_FOCUS) : 0

  if (focus && source && source.side !== bearer.side && HARMFUL.has(type) && !runeStateOf(source).statusFocus) {
    runeStateOf(source).statusFocus = true
    restoreFocus(source, focus, events)
  }
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
  const single = item.target === 'ally' || item.target === 'fallenAlly' || item.target === 'enemy'
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

    if (target.side === 'enemy') {
      const thrown: Skill = {
        id: itemId,
        cost: 0,
        target: item.target === 'enemy' ? TargetType.ENEMY : TargetType.ALL_ENEMIES,
        power: item.power ?? 0,
        stat: 'attack',
        damageType: item.damageType ?? DamageType.FIRE,
        statuses: item.status ? [item.status] : undefined
      }
      let landed = !item.power

      // A thrown weapon can hit more than once, each time with all its power.
      for (let hit = 0; hit < (item.power ? (item.hits ?? 1) : 0) && isAlive(target) && !state.outcome; hit++) {
        landed = strike(state, actor, target, thrown, events) || landed
      }

      if (landed && isAlive(target) && !state.outcome) {
        applyStatuses(state, actor, target, thrown, events)
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

    for (const effect of item.buffs ?? []) {
      addStatus(target, effect.type, effect.turns, events, actor)
    }

    if (item.shields) {
      addShields(target, item.shields, events)
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

/** A damaging hit: false when it missed or did nothing. A counterattack (or a blast) cannot be countered. */
function strike(
  state: BattleState,
  actor: Combatant,
  target: Combatant,
  skill: Skill,
  events: BattleEvent[],
  counter = false
): boolean {
  if (PHYSICAL.has(skill.damageType) && skill.stat === 'attack' && hasStatus(actor, StatusType.BLIND)) {
    if (roll(state) < BLIND_MISS_CHANCE) {
      events.push({ type: 'miss', targetId: target.id })

      return false
    }
  }

  // A shield stops the whole hit, and breaks.
  if (target.shields) {
    target.shields--
    events.push({ type: 'shields', targetId: target.id, change: -1, shields: target.shields })

    return false
  }

  // A rune can ignore resistances: what is resisted hits as normal, what is immune or absorbs takes half.
  const natural = target.affinities[skill.damageType] ?? Affinity.NORMAL
  const pierce = perkOf(actor, Perk.VOID_PIERCE) > 0
  const affinity = pierce && natural === Affinity.RESIST ? Affinity.NORMAL : natural
  const halved = pierce && (natural === Affinity.IMMUNE || natural === Affinity.ABSORB)

  if (affinity === Affinity.IMMUNE && !halved) {
    events.push({ type: 'immune', targetId: target.id })

    return false
  }

  const marks = actor.marks?.[target.id] ?? 0
  const controlled = hasStatus(target, StatusType.FREEZE) || hasStatus(target, StatusType.STUN)
  const runeCrit =
    (actor.health < actor.stats.maxHealth * LOW_HEALTH ? perkOf(actor, Perk.LOW_HEALTH_CRIT) : 0) +
    (target.statuses.some((status) => HARMFUL.has(status.type)) ? perkOf(actor, Perk.CRIT_VS_DEBUFFED) : 0)
  const critical =
    (controlled && perkOf(actor, Perk.CONTROLLED_CRIT) > 0) ||
    roll(state) <
      actor.stats.critChance +
        (skill.critBonus ?? 0) +
        marks * MARK_CRIT +
        runeCrit +
        (hasStatus(actor, StatusType.CRIT_UP) ? CRIT_UP_CHANCE : 0)

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
        (halved ? 0.5 : Math.abs(AFFINITY_MULTIPLIER[affinity])) *
        (critical ? actor.stats.critDamage : 1) *
        (1 + (actor.bonuses?.damage[skill.damageType] ?? 0)) *
        (weak ? 1 + (actor.bonuses?.weakness ?? 0) : 1) *
        (1 - Math.min(MAX_GUARD, target.bonuses?.guard ?? 0)) *
        runeDamage(state, actor, target, critical, events) *
        Math.max(0.1, 1 + perkOf(target, Perk.DAMAGE_TAKEN)) *
        (0.95 + roll(state) * 0.1)
    )
  )

  if (affinity === Affinity.ABSORB && !halved) {
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
  const poisoned = hasStatus(target, StatusType.POISON)

  if (target.runeState) {
    target.runeState.hurt = true
  }

  hurt(state, target, amount, events)

  if (actor.bonuses?.lifesteal && isAlive(actor) && !state.outcome) {
    heal(actor, Math.max(1, Math.round(amount * actor.bonuses.lifesteal)), events)
  }

  // The weapon attack can leave the statuses of the weapon, the runes and the tree.
  if (skill.id === actor.skills[0] && isAlive(target) && !state.outcome) {
    const imbue = imbueOf(actor)?.onHit

    for (const effect of [...(actor.bonuses?.onHit ?? []), ...(imbue ? [imbue] : [])]) {
      const chance = effect.chance * (CONTROL.has(effect.type) && isBoss(target) ? BOSS_CONTROL_FACTOR : 1)

      if (roll(state) < chance) {
        addStatus(target, effect.type, effect.turns, events, actor)
      }
    }
  }

  if (actor.runeState) {
    afterStrike(state, actor, target, { critical, weak, poisoned }, events)
  }

  // A rune can strike back with the weapon.
  const reprisal = perkOf(target, Perk.COUNTER)

  if (
    reprisal &&
    !counter &&
    target.side !== actor.side &&
    isAlive(target) &&
    isAlive(actor) &&
    !state.outcome &&
    !target.statuses.some((status) => CONTROL.has(status.type)) &&
    roll(state) < reprisal
  ) {
    triggerPerk(target, Perk.COUNTER, events)
    strike(state, target, actor, skillOf(target, target.skills[0]), events, true)
  }

  return true
}

/** What the runes of a hero do after it hits: on a kill, a critical hit or a weakness. */
function afterStrike(
  state: BattleState,
  actor: Combatant,
  target: Combatant,
  hit: { critical: boolean; weak: boolean; poisoned: boolean },
  events: BattleEvent[]
): void {
  const runes = runeStateOf(actor)

  if (!isAlive(target) && target.side !== actor.side) {
    onKill(state, actor, hit.poisoned, events)
  }

  if (state.outcome) {
    return
  }

  if (hit.critical) {
    const focus = perkOf(actor, Perk.CRIT_FOCUS)
    const bleed = perkOf(actor, Perk.CRIT_BLEED)

    if (focus && !runes.critFocus && isAlive(actor)) {
      runes.critFocus = true
      restoreFocus(actor, focus, events)
    }

    if (bleed && isAlive(target)) {
      addStatus(target, StatusType.BLEED, bleed, events, actor)
    }
  }

  const breach = perkOf(actor, Perk.BREACH)

  if (breach && hit.weak && isAlive(target)) {
    addStatus(target, StatusType.DEFENSE_DOWN, breach, events, actor)
  }
}

/** Heals a fighter (its runes can double it or forbid it) and returns how much. */
function heal(target: Combatant, amount: number, events: BattleEvent[]): number {
  if (perkOf(target, Perk.NO_HEALING)) {
    return 0
  }

  const boosted = Math.round(amount * (1 + perkOf(target, Perk.HEALING_RECEIVED)))
  const healed = Math.min(boosted, target.stats.maxHealth - target.health)

  target.health += healed
  events.push({ type: 'heal', targetId: target.id, amount: healed })

  return healed
}

/** Takes health from a fighter and handles its fall: next health bar, next phase, reserves or the end. */
function hurt(state: BattleState, target: Combatant, amount: number, events: BattleEvent[]): void {
  const runes = target.runeState

  if (runes) {
    runes.damagedSinceTurn = true

    // Once per battle a rune keeps the hero standing with 1 health.
    if (perkOf(target, Perk.SURVIVE) && !runes.survived && target.health > 1 && amount >= target.health) {
      runes.survived = true
      amount = target.health - 1
      triggerPerk(target, Perk.SURVIVE, events)
    }
  }

  target.health = Math.max(0, target.health - amount)

  if (target.fury !== undefined) {
    target.fury = Math.min(MAX_FURY, target.fury + Math.round((amount / target.stats.maxHealth) * 100))
  }

  if (target.health > 0) {
    if (runes && perkOf(target, Perk.SOS) && !runes.sos && target.health < target.stats.maxHealth * SOS_HEALTH) {
      runes.sos = true
      triggerPerk(target, Perk.SOS, events)
      addStatus(target, StatusType.DEFENSE_UP, perkOf(target, Perk.SOS), events, target)
    }

    return
  }

  // Once per battle a rune makes the hero rise again.
  if (runes && perkOf(target, Perk.SECOND_FLAME) && !runes.rose) {
    runes.rose = true
    target.health = Math.max(1, Math.round(target.stats.maxHealth * perkOf(target, Perk.SECOND_FLAME)))
    triggerPerk(target, Perk.SECOND_FLAME, events)
    events.push({ type: 'heal', targetId: target.id, amount: target.health })

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
  target.shields = 0
  target.initiative = 0
  events.push({ type: 'fall', targetId: target.id })

  // Kael loses his stance when he falls.
  if (target.stance) {
    target.stance = Stance.NONE
  }

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
  } else {
    onHeroFall(state, target, events)

    if (state.outcome || getFighters(state, 'hero').length > 0) {
      return
    }

    const reserves = state.combatants.filter((combatant) => combatant.reserve && isAlive(combatant))

    if (reserves.length > 0) {
      // All the reserves enter together.
      for (const reserve of reserves) {
        reserve.reserve = false
        reserve.fought = true
        reserve.initiative = 0
        startRunes(reserve)
      }

      events.push({ type: 'reserves', heroIds: reserves.map((reserve) => reserve.id) })
    } else {
      state.outcome = 'defeat'
      state.actorId = null
      events.push({ type: 'end', outcome: 'defeat' })
    }
  }
}

/**
 * What a defeated enemy leaves: smithing stones of the biome, now and then
 * something of BIOME_DROPS (always for bosses), and very rarely an Echo.
 */
function dropLoot(state: BattleState, enemy: Combatant): void {
  const species = getSpecies(enemy.speciesId!)

  const add = (itemId: string, count = 1) => {
    state.loot[itemId] = (state.loot[itemId] ?? 0) + count
  }

  const drops = BIOME_DROPS[state.biome]

  if (species.strength > 1) {
    add(BIOME_STONE[state.biome], BOSS_STONES * species.bars)
  } else {
    const stoneId = BIOME_STONE[state.biome]
    const rough = stoneId === StoneId.ROUGH
    const chance = enemy.elite
      ? DROP_CHANCE[rough ? 'eliteRoughStone' : 'eliteStone']
      : DROP_CHANCE[rough ? 'roughStone' : 'stone']

    if (roll(state) < chance) {
      add(stoneId)
    }
  }

  if (species.strength > 1) {
    for (let index = 0; index < BOSS_ITEMS; index++) {
      add(drops[Math.floor(roll(state) * drops.length)])
    }
  } else if (roll(state) < (enemy.elite ? DROP_CHANCE.eliteItem : DROP_CHANCE.item)) {
    add(drops[Math.floor(roll(state) * drops.length)])
  }

  // Each basic potion on its own, while the party can still carry more.
  for (const itemId of BASIC_POTIONS) {
    const chance = enemy.elite || species.strength > 1 ? BASIC_POTION_CHANCE.elite : BASIC_POTION_CHANCE.normal

    if ((state.items[itemId] ?? 0) + (state.loot[itemId] ?? 0) < MAX_BASIC_POTIONS && roll(state) < chance) {
      add(itemId)
    }
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
