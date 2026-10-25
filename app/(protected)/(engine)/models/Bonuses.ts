import { CombatStats } from '@/app/(protected)/(engine)/models/CombatStats'
import { DamageType } from '@/app/(protected)/(engine)/models/DamageType'
import { StatusType } from '@/app/(protected)/(engine)/models/StatusType'

/** A status that the weapon attacks can leave on a hit. */
export interface OnHitStatus {
  type: StatusType
  /** 0..1. */
  chance: number
  turns: number
}

/** A change to a special, bought in a skill tree. */
export interface SkillUpgrade {
  /** Extra share of power (0.25 = +25%). */
  power?: number
  /** Focus it saves. */
  cost?: number
  /** Extra chance of its statuses, 0..1. */
  statusChance?: number
}

/**
 * Everything a hero gains on top of its attributes: the passives of its skill
 * tree, its weapon, its runes and its echoes. All of them add up.
 */
export interface Bonuses {
  /** Share added to each attribute (0.08 = +8%; can be negative). */
  stats: Partial<Record<keyof CombatStats, number>>
  /** Share of the damage dealt that heals the hero. */
  lifesteal: number
  /** Extra share of focus recovered at the start of each turn. */
  focusRegen: number
  /** Share of the maximum health recovered at the start of each turn. */
  regen: number
  /** Initiative it starts the battle with (out of 100). */
  initiative: number
  /** Share of the damage it takes that it avoids. */
  guard: number
  /** Extra damage by type (0.15 = +15%). */
  damage: Partial<Record<DamageType, number>>
  /** Extra damage on a weakness. */
  weakness: number
  /** Extra chance of the statuses it applies, 0..1. */
  statusChance: number
  onHit: OnHitStatus[]
  upgrades: Record<string, SkillUpgrade>
}

export function emptyBonuses(): Bonuses {
  return {
    stats: {},
    lifesteal: 0,
    focusRegen: 0,
    regen: 0,
    initiative: 0,
    guard: 0,
    damage: {},
    weakness: 0,
    statusChance: 0,
    onHit: [],
    upgrades: {}
  }
}

/** A part of the bonuses, as the catalogs write them. */
export type BonusesPart = Partial<Omit<Bonuses, 'onHit' | 'upgrades'>> & {
  onHit?: OnHitStatus[]
  upgrades?: Record<string, SkillUpgrade>
}

/** Adds some bonuses to others (in place) and returns them. */
export function addBonuses(total: Bonuses, part: BonusesPart): Bonuses {
  for (const [stat, value] of Object.entries(part.stats ?? {}) as [keyof CombatStats, number][]) {
    total.stats[stat] = (total.stats[stat] ?? 0) + value
  }

  for (const [type, value] of Object.entries(part.damage ?? {}) as [DamageType, number][]) {
    total.damage[type] = (total.damage[type] ?? 0) + value
  }

  for (const [skillId, upgrade] of Object.entries(part.upgrades ?? {})) {
    const current = total.upgrades[skillId] ?? {}

    total.upgrades[skillId] = {
      power: (current.power ?? 0) + (upgrade.power ?? 0),
      cost: (current.cost ?? 0) + (upgrade.cost ?? 0),
      statusChance: (current.statusChance ?? 0) + (upgrade.statusChance ?? 0)
    }
  }

  total.lifesteal += part.lifesteal ?? 0
  total.focusRegen += part.focusRegen ?? 0
  total.regen += part.regen ?? 0
  total.initiative += part.initiative ?? 0
  total.guard += part.guard ?? 0
  total.weakness += part.weakness ?? 0
  total.statusChance += part.statusChance ?? 0
  total.onHit.push(...(part.onHit ?? []))

  return total
}
