import { BonusesPart } from '@/app/(protected)/(engine)/models/Bonuses'
import { CombatStats } from '@/app/(protected)/(engine)/models/CombatStats'
import { DamageType } from '@/app/(protected)/(engine)/models/DamageType'
import { Rune } from '@/app/(protected)/(engine)/models/Rune'
import { RuneTier } from '@/app/(protected)/(engine)/models/RuneTier'
import { StatusType } from '@/app/(protected)/(engine)/models/StatusType'

/**
 * The 60 runes, one per sanctuary, ordered by power. Twelve families repeat
 * five times (ranks I to V), each time stronger; every rune also shifts one or
 * two attributes, often a gain against a loss (+8% speed, -5% defense).
 */

export const RUNE_COUNT = 60
export const RUNE_SLOTS = 3
/** Battles won with a rune equipped (by an active hero) to master it. */
export const RUNE_MASTERY_WINS = 4

/** Index ranges of each tier, as the world generator spreads them. */
const TIER_RANGES: [RuneTier, number, number][] = [
  [RuneTier.LESSER, 1, 9],
  [RuneTier.GREATER, 10, 28],
  [RuneTier.ANCESTRAL, 29, 52],
  [RuneTier.ABYSSAL, 53, 60]
]
/** Echoes a rune costs as an echo, from the weakest to the strongest of its tier. */
const ECHO_COSTS: Record<RuneTier, [number, number]> = {
  [RuneTier.LESSER]: [1, 8],
  [RuneTier.GREATER]: [6, 20],
  [RuneTier.ANCESTRAL]: [15, 35],
  [RuneTier.ABYSSAL]: [30, 50]
}
/** Each family: its effect at a strength from 0 (rune 1) to 1 (rune 60). */
const FAMILIES: { id: string; effect: (strength: number) => BonusesPart }[] = [
  { id: 'leech', effect: (s) => ({ lifesteal: share(0.03, 0.15, s) }) },
  { id: 'ember', effect: (s) => ({ damage: { [DamageType.FIRE]: share(0.1, 0.5, s) } }) },
  { id: 'wellspring', effect: (s) => ({ focusRegen: share(0.03, 0.12, s) }) },
  { id: 'edge', effect: (s) => ({ stats: { critChance: share(0.03, 0.15, s) } }) },
  { id: 'ward', effect: (s) => ({ guard: share(0.04, 0.2, s) }) },
  { id: 'frost', effect: (s) => ({ damage: { [DamageType.ICE]: share(0.1, 0.5, s) } }) },
  { id: 'vigor', effect: (s) => ({ regen: share(0.02, 0.06, s) }) },
  { id: 'haste', effect: (s) => ({ initiative: Math.round(15 + 45 * s) }) },
  { id: 'venom', effect: (s) => ({ onHit: [{ type: StatusType.POISON, chance: share(0.08, 0.3, s), turns: 3 }] }) },
  { id: 'fury', effect: (s) => ({ stats: { critDamage: share(0.1, 0.5, s) } }) },
  { id: 'storm', effect: (s) => ({ damage: { [DamageType.LIGHTNING]: share(0.1, 0.5, s) } }) },
  { id: 'hunter', effect: (s) => ({ weakness: share(0.1, 0.4, s) }) }
]
/** The attribute shifts, in turn: a gain, and sometimes a loss. */
const SHIFTS: [keyof CombatStats, keyof CombatStats | null][] = [
  ['attack', null],
  ['speed', 'defense'],
  ['maxHealth', null],
  ['special', 'maxHealth'],
  ['defense', 'speed'],
  ['maxFocus', null],
  ['attack', 'defense'],
  ['special', null]
]

/** A value between two shares, in whole percents. */
function share(from: number, to: number, strength: number): number {
  return Math.round((from + (to - from) * strength) * 100) / 100
}

function tierOf(index: number): RuneTier {
  return TIER_RANGES.find(([, from, to]) => index >= from && index <= to)![0]
}

function createRune(index: number): Rune {
  const tier = tierOf(index)
  const [, from, to] = TIER_RANGES.find(([candidate]) => candidate === tier)!
  const [minCost, maxCost] = ECHO_COSTS[tier]
  const strength = (index - 1) / (RUNE_COUNT - 1)
  const family = FAMILIES[(index - 1) % FAMILIES.length]
  const [gain, loss] = SHIFTS[(index * 5) % SHIFTS.length]
  const stats: Rune['stats'] = { [gain]: share(0.04, 0.15, strength) }

  if (loss) {
    stats[loss] = -share(0.03, 0.06, strength)
  }

  return {
    index,
    tier,
    family: family.id,
    rank: Math.floor((index - 1) / FAMILIES.length) + 1,
    effect: family.effect(strength),
    stats,
    echoCost: Math.round(minCost + ((maxCost - minCost) * (index - from)) / Math.max(1, to - from))
  }
}

export const RUNES: Rune[] = Array.from({ length: RUNE_COUNT }, (_, position) => createRune(position + 1))

export function getRune(index: number): Rune {
  const rune = RUNES[index - 1]

  if (!rune) {
    throw new Error(`Unknown rune ${index}`)
  }

  return rune
}

export const RUNE_FAMILIES = FAMILIES.map((family) => family.id)
