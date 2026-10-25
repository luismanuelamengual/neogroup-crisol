import { getSpecies } from '@/app/(protected)/(engine)/data/enemies'
import { EnemySpecies } from '@/app/(protected)/(engine)/models/EnemySpecies'

/**
 * The bestiary: each species shows more about itself as the party defeats
 * more of it. 0 = name, look and biome (once seen); 1 = its main weakness;
 * 2 = all its weaknesses and resistances; 3 = attributes, skills and drops.
 * The rarer the species, the fewer kills it asks for (bosses: by victories).
 * Kills count forever, across the New Game+ cycles too.
 */
const THRESHOLDS: Record<EnemySpecies['rarity'], number[]> = {
  common: [10, 50, 150],
  uncommon: [5, 25, 75],
  rare: [3, 15, 40],
  boss: [1, 2, 3]
}

export function getBestiaryThresholds(speciesId: string): number[] {
  return THRESHOLDS[getSpecies(speciesId).rarity]
}

/** How much the bestiary shows of a species (0..3), or -1 when it was never seen. */
export function getBestiaryLevel(speciesId: string, kills: Record<string, number>): number {
  const count = kills[speciesId]

  if (count === undefined) {
    return -1
  }

  return getBestiaryThresholds(speciesId).filter((threshold) => count >= threshold).length
}
