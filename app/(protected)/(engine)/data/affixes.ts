import { Biome } from '@/app/(protected)/(engine)/models/Biome'
import { EliteAffix } from '@/app/(protected)/(engine)/models/EliteAffix'

/**
 * The traits of the elites (see EliteAffix and utils/battle.ts): how many
 * each one gets and how strong each one is.
 */

export const ELITE_AFFIXES: EliteAffix[] = Object.values(EliteAffix)

/** The first biomes, where the party is one or two heroes, only meet the gentler traits. */
const GENTLE_BIOMES = new Set([Biome.MEADOWS, Biome.FOREST])
const GENTLE_AFFIXES = [EliteAffix.VAMPIRIC, EliteAffix.REGENERATING, EliteAffix.UNSHAKABLE, EliteAffix.VENGEFUL]

/** The traits an elite of this biome and cycle can come with. */
export function getAffixPool(biome: Biome, cycle: number): EliteAffix[] {
  return cycle === 0 && GENTLE_BIOMES.has(biome) ? GENTLE_AFFIXES : ELITE_AFFIXES
}

/** From these biomes on (and in every biome of New Game+) the elites come with two traits. */
const TWO_AFFIX_BIOMES = new Set([Biome.WASTELANDS, Biome.SNOW, Biome.VOLCANIC, Biome.ABYSS])

/** How many traits an elite of this biome and cycle comes with. */
export function getAffixCount(biome: Biome, cycle: number): number {
  return cycle > 0 || TWO_AFFIX_BIOMES.has(biome) ? 2 : 1
}

/** Vampiric: share of the damage dealt that it heals. */
export const VAMPIRIC_SHARE = 0.2
/** Thorny: share of the damage of a hit that goes back to the attacker. */
export const THORNY_SHARE = 0.1
/** Explosive: share of the maximum health every hero standing loses. */
export const EXPLOSIVE_SHARE = 0.1
/** Armored: shields it enters with. */
export const ARMORED_SHIELDS = 1
/** Swift: multiplier of its speed. */
export const SWIFT_SPEED = 1.2
/** Regenerating: share of its maximum health recovered at the start of each turn. */
export const REGENERATING_SHARE = 0.04
/** Vengeful: turns of raised attack each fallen ally gives it. */
export const VENGEFUL_TURNS = 3
/** Each trait makes the elite give this share more experience and gold. */
export const AFFIX_REWARD = 0.25
