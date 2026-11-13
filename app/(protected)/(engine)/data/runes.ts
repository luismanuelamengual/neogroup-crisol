import { BonusesPart } from '@/app/(protected)/(engine)/models/Bonuses'
import { Perk } from '@/app/(protected)/(engine)/models/Perk'
import { Rune, RuneStat } from '@/app/(protected)/(engine)/models/Rune'
import { RuneTier } from '@/app/(protected)/(engine)/models/RuneTier'
import { StatusType } from '@/app/(protected)/(engine)/models/StatusType'

/**
 * The 70 runes, one per sanctuary, ordered by power: each one with an effect
 * of its own (see Perk) and a shift of one or two attributes, often a gain
 * against a loss (+8% speed, -5% defense), that grows with its number.
 */

export const RUNE_SLOTS = 3
/** Battles won with a rune equipped (by an active hero) to master it. */
export const RUNE_MASTERY_WINS = 4

interface RuneDefinition {
  id: string
  effect: BonusesPart
  gain: RuneStat
  loss?: RuneStat
}

const perk = (perks: Partial<Record<Perk, number>>): BonusesPart => ({ perks })
/** In order of power: the lesser ones (1..12), the greater (13..33), the ancestral (34..62) and the abyssal (63..70). */
const DEFINITIONS: RuneDefinition[] = [
  // Lesser: Meadows and Forest.
  { id: 'first-cut', effect: perk({ [Perk.FIRST_STRIKE]: 0.5 }), gain: 'attack' },
  { id: 'breath', effect: perk({ [Perk.START_FOCUS]: 0.3 }), gain: 'maxFocus' },
  { id: 'sprout', effect: perk({ [Perk.OPENING_REGEN]: 0.05 }), gain: 'maxHealth' },
  { id: 'light-step', effect: perk({ [Perk.START_SPEED_UP]: 3 }), gain: 'speed' },
  { id: 'carapace', effect: perk({ [Perk.START_DEFENSE_UP]: 3 }), gain: 'defense' },
  { id: 'impetus', effect: perk({ [Perk.START_ATTACK_UP]: 3 }), gain: 'attack', loss: 'defense' },
  { id: 'live-ember', effect: perk({ [Perk.BURN_HUNTER]: 0.25 }), gain: 'special' },
  { id: 'finisher', effect: perk({ [Perk.KILL_HEAL]: 0.15 }), gain: 'maxHealth' },
  { id: 'true-pulse', effect: perk({ [Perk.CRIT_FOCUS]: 0.1 }), gain: 'critChance' },
  { id: 'fang', effect: { onHit: [{ type: StatusType.POISON, chance: 0.2, turns: 3 }] }, gain: 'speed' },
  { id: 'pause', effect: perk({ [Perk.ITEM_FOCUS]: 0.15 }), gain: 'maxFocus' },
  { id: 'whole-body', effect: perk({ [Perk.FULL_HEALTH]: 0.2 }), gain: 'defense' },
  // Greater: Tropics, Desert and Mountains.
  { id: 'double-edge', effect: perk({ [Perk.DOUBLE_STRIKE]: 0.6 }), gain: 'attack', loss: 'defense' },
  { id: 'stubborn-ember', effect: perk({ [Perk.LONG_BURN]: 2 }), gain: 'special' },
  { id: 'contagion', effect: perk({ [Perk.STATUS_FOCUS]: 0.1 }), gain: 'maxFocus' },
  { id: 'warm-up', effect: perk({ [Perk.WARM_UP]: 0.05 }), gain: 'attack' },
  { id: 'untouched-skin', effect: perk({ [Perk.UNTOUCHED]: 0.3 }), gain: 'speed', loss: 'defense' },
  { id: 'last-breath', effect: perk({ [Perk.LAST_BREATH]: 0.5 }), gain: 'attack', loss: 'maxHealth' },
  { id: 'right-moment', effect: perk({ [Perk.LOW_HEALTH_CRIT]: 0.3 }), gain: 'critChance', loss: 'maxHealth' },
  { id: 'rescue', effect: perk({ [Perk.SOS]: 3 }), gain: 'defense' },
  { id: 'clean-blow', effect: perk({ [Perk.CONTROLLED_CRIT]: 1 }), gain: 'critChance' },
  { id: 'icebreaker', effect: perk({ [Perk.FROST_BREAKER]: 0.4 }), gain: 'special' },
  { id: 'open-wound', effect: perk({ [Perk.CRIT_BLEED]: 3 }), gain: 'critChance' },
  { id: 'full-healing', effect: perk({ [Perk.HEALING_RECEIVED]: 1 }), gain: 'maxHealth' },
  { id: 'generous-hand', effect: perk({ [Perk.HEAL_SHARE]: 0.3 }), gain: 'special' },
  { id: 'cheer', effect: perk({ [Perk.HEAL_BUFF]: 2 }), gain: 'special' },
  { id: 'harvest', effect: perk({ [Perk.KILL_FOCUS]: 0.3 }), gain: 'maxFocus' },
  { id: 'hunter-eye', effect: perk({ [Perk.CRIT_VS_DEBUFFED]: 0.25 }), gain: 'critChance' },
  { id: 'burning-iron', effect: perk({ [Perk.FIRE_WEAPON]: 1 }), gain: 'attack' },
  { id: 'frozen-iron', effect: perk({ [Perk.ICE_WEAPON]: 1 }), gain: 'attack' },
  { id: 'thunder-iron', effect: perk({ [Perk.LIGHTNING_WEAPON]: 1 }), gain: 'speed' },
  { id: 'reprisal', effect: perk({ [Perk.COUNTER]: 0.25 }), gain: 'defense' },
  { id: 'clean-blood', effect: perk({ [Perk.IMMUNE_DOTS]: 1 }), gain: 'maxHealth' },
  // Ancestral: Wastelands, Snow and the volcanic lands.
  { id: 'temper', effect: perk({ [Perk.IMMUNE_CONTROL]: 1 }), gain: 'defense', loss: 'speed' },
  { id: 'clear-sight', effect: perk({ [Perk.IMMUNE_BLIND]: 1 }), gain: 'speed' },
  {
    id: 'glass',
    effect: perk({ [Perk.DAMAGE_DEALT]: 0.35, [Perk.DAMAGE_TAKEN]: 0.25 }),
    gain: 'attack',
    loss: 'defense'
  },
  { id: 'pride', effect: perk({ [Perk.DAMAGE_TAKEN]: -0.4, [Perk.NO_HEALING]: 1 }), gain: 'defense', loss: 'speed' },
  {
    id: 'recklessness',
    effect: perk({ [Perk.DAMAGE_DEALT]: 0.35, [Perk.NO_HEALING]: 1 }),
    gain: 'attack',
    loss: 'maxHealth'
  },
  { id: 'coin', effect: perk({ [Perk.COIN]: 1 }), gain: 'critChance' },
  { id: 'endurance', effect: perk({ [Perk.SURVIVE]: 1 }), gain: 'maxHealth' },
  { id: 'second-flame', effect: perk({ [Perk.SECOND_FLAME]: 0.5 }), gain: 'maxHealth' },
  { id: 'martyr', effect: perk({ [Perk.MARTYR]: 0.4 }), gain: 'special' },
  { id: 'posthumous-wrath', effect: perk({ [Perk.WRATH]: 3 }), gain: 'attack' },
  { id: 'final-blast', effect: perk({ [Perk.LAST_BLAST]: 2 }), gain: 'special' },
  { id: 'lone-wolf', effect: perk({ [Perk.LONE_WOLF]: 0.5 }), gain: 'speed' },
  { id: 'company', effect: perk({ [Perk.TEAMWORK]: 0.12 }), gain: 'defense' },
  { id: 'frenzy', effect: perk({ [Perk.FRENZY]: 0.15 }), gain: 'special', loss: 'defense' },
  { id: 'thrift', effect: perk({ [Perk.ECONOMY]: 0.15 }), gain: 'maxFocus' },
  { id: 'spring', effect: perk({ [Perk.TURN_FOCUS]: 0.08 }), gain: 'maxFocus' },
  { id: 'dawn', effect: perk({ [Perk.DAWN]: 1 }), gain: 'speed' },
  { id: 'lightning', effect: perk({ [Perk.LIGHTNING]: 50 }), gain: 'speed', loss: 'defense' },
  { id: 'third-blow', effect: perk({ [Perk.THIRD_SPECIAL]: 1 }), gain: 'special' },
  { id: 'counterpoint', effect: perk({ [Perk.COUNTERPOINT]: 1 }), gain: 'critChance' },
  { id: 'fever', effect: perk({ [Perk.FEVER]: 0.5 }), gain: 'special' },
  { id: 'plague', effect: perk({ [Perk.PLAGUE]: 1 }), gain: 'special' },
  { id: 'barrier', effect: perk({ [Perk.BARRIER]: 1 }), gain: 'defense' },
  { id: 'aegis', effect: perk({ [Perk.AEGIS]: 1 }), gain: 'maxHealth' },
  { id: 'blood-echo', effect: { lifesteal: 0.12 }, gain: 'attack' },
  { id: 'shelter', effect: perk({ [Perk.SHELTER]: 1 }), gain: 'defense' },
  { id: 'breach', effect: perk({ [Perk.BREACH]: 2 }), gain: 'attack' },
  { id: 'persistence', effect: perk({ [Perk.PERSISTENCE]: 2 }), gain: 'defense' },
  { id: 'full-cup', effect: perk({ [Perk.FULL_CUP]: 0.3 }), gain: 'maxFocus' },
  // Abyssal: the Abyss (and the two brought from it to the Snow and the volcanic lands).
  { id: 'twin', effect: perk({ [Perk.TWIN]: 0.4 }), gain: 'speed' },
  {
    id: 'abyss-edge',
    effect: { stats: { maxHealth: -0.7 }, perks: { [Perk.DAMAGE_DEALT]: 0.8 } },
    gain: 'attack'
  },
  { id: 'perfect-instant', effect: perk({ [Perk.PERFECT_INSTANT]: 1 }), gain: 'maxHealth' },
  { id: 'void', effect: perk({ [Perk.VOID_PIERCE]: 1 }), gain: 'special' },
  { id: 'crucible', effect: perk({ [Perk.CRUCIBLE]: 0.15 }), gain: 'critChance' },
  { id: 'eclipse', effect: perk({ [Perk.ECLIPSE]: 1 }), gain: 'speed' },
  { id: 'legacy', effect: perk({ [Perk.LEGACY]: 1 }), gain: 'maxHealth' },
  { id: 'judgment', effect: perk({ [Perk.JUDGMENT]: 3 }), gain: 'attack' }
]

export const RUNE_COUNT = DEFINITIONS.length

/** Index ranges of each tier, as the world generator spreads them. */
const TIER_RANGES: [RuneTier, number, number][] = [
  [RuneTier.LESSER, 1, 12],
  [RuneTier.GREATER, 13, 33],
  [RuneTier.ANCESTRAL, 34, 62],
  [RuneTier.ABYSSAL, 63, 70]
]
/** Echoes a rune costs as an echo, from the weakest to the strongest of its tier. */
const ECHO_COSTS: Record<RuneTier, [number, number]> = {
  [RuneTier.LESSER]: [1, 8],
  [RuneTier.GREATER]: [6, 20],
  [RuneTier.ANCESTRAL]: [15, 35],
  [RuneTier.ABYSSAL]: [30, 50]
}
/** The attribute shifts, from the first rune to the last: critical chance adds up as is, so it moves less. */
const GAIN: [number, number] = [0.04, 0.15]
const CRIT_GAIN: [number, number] = [0.03, 0.1]
const LOSS: [number, number] = [0.03, 0.06]

/** A value between two shares, in whole percents. */
function share([from, to]: [number, number], strength: number): number {
  return Math.round((from + (to - from) * strength) * 100) / 100
}

function tierOf(index: number): RuneTier {
  return TIER_RANGES.find(([, from, to]) => index >= from && index <= to)![0]
}

function createRune(definition: RuneDefinition, index: number): Rune {
  const tier = tierOf(index)
  const [, from, to] = TIER_RANGES.find(([candidate]) => candidate === tier)!
  const [minCost, maxCost] = ECHO_COSTS[tier]
  const strength = (index - 1) / (RUNE_COUNT - 1)
  const stats: Rune['stats'] = {
    [definition.gain]: share(definition.gain === 'critChance' ? CRIT_GAIN : GAIN, strength)
  }

  if (definition.loss) {
    stats[definition.loss] = -share(LOSS, strength)
  }

  return {
    index,
    id: definition.id,
    tier,
    effect: definition.effect,
    gain: definition.gain,
    loss: definition.loss,
    stats,
    echoCost: Math.round(minCost + ((maxCost - minCost) * (index - from)) / Math.max(1, to - from))
  }
}

export const RUNES: Rune[] = DEFINITIONS.map((definition, position) => createRune(definition, position + 1))

export function getRune(index: number): Rune {
  const rune = RUNES[index - 1]

  if (!rune) {
    throw new Error(`Unknown rune ${index}`)
  }

  return rune
}

/** The rune a perk comes from (the first one that has it), to name it when it acts in battle. */
export function getRuneOfPerk(perk: Perk): Rune | undefined {
  return RUNES.find((rune) => (rune.effect.perks?.[perk] ?? 0) !== 0)
}
