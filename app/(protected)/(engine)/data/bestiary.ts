import { getSpecies, getVariantBase } from '@/app/(protected)/(engine)/data/enemies'

/**
 * The bestiary: each species shows more about itself as the party defeats
 * more of it. 0 = name, look and biome (once seen); 1 = its main weakness;
 * 2 = all its weaknesses and resistances; 3 = attributes, skills and drops.
 * Kills count forever, across the New Game+ cycles too.
 */

const COMMON_THRESHOLDS = [10, 50, 150]
/** Champions and guardians (rare). */
const RARE_THRESHOLDS = [3, 15, 40]
/** Bosses: by victories. */
const BOSS_THRESHOLDS = [1, 2, 3]

export function getBestiaryThresholds(speciesId: string): number[] {
  if (getVariantBase(speciesId)) {
    return RARE_THRESHOLDS
  }

  return getSpecies(speciesId).strength > 1 ? BOSS_THRESHOLDS : COMMON_THRESHOLDS
}

/** How much the bestiary shows of a species (0..3), or -1 when it was never seen. */
export function getBestiaryLevel(speciesId: string, kills: Record<string, number>): number {
  const count = kills[speciesId]

  if (count === undefined) {
    return -1
  }

  return getBestiaryThresholds(speciesId).filter((threshold) => count >= threshold).length
}
