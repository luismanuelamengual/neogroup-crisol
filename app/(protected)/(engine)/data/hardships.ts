import { Biome } from '@/app/(protected)/(engine)/models/Biome'

/**
 * The hardships of the map: from the Desert on, every biome wears the party
 * down a little with each step it walks on its trails. They pile up while the
 * party walks the same biome, and they fade when it rests at a camp (or wakes
 * up at one after a defeat) or crosses into another biome. The Meadows and
 * the Forest have none.
 */
export enum HardshipKind {
  /** Desert: thirst. Every heal it gets is weaker (in battle and the Amber Flask). */
  THIRST = 'thirst',
  /** Tropics: spores. The heroes start each battle poisoned for some turns. */
  SPORES = 'spores',
  /** Mountains: thin air. Weapon attacks give back less focus. */
  THIN_AIR = 'thinAir',
  /** Wastelands: rust. Its armor wears down: less defense. */
  RUST = 'rust',
  /** Snow: cold. The heroes get slower. */
  COLD = 'cold',
  /** Volcanic lands: heat. Each step burns a little of the health of every hero (never below 1). */
  HEAT = 'heat',
  /** Abyss: the void. Weapon attacks deal less damage. */
  VOID = 'void'
}

export interface HardshipDefinition {
  biome: Biome
  kind: HardshipKind
  /**
   * What each step adds: a share (0.03 = 3%) for the lasting ones, turns of
   * poison for the spores (they can be fractions) and the share of the maximum
   * health burnt by each step of heat.
   */
  perStep: number
  /** The most it can reach (none for the heat: each step burns the same). */
  max?: number
}

export const HARDSHIPS: HardshipDefinition[] = [
  { biome: Biome.DESERT, kind: HardshipKind.THIRST, perStep: 0.03, max: 0.45 },
  { biome: Biome.TROPICAL, kind: HardshipKind.SPORES, perStep: 0.25, max: 3 },
  { biome: Biome.MOUNTAINS, kind: HardshipKind.THIN_AIR, perStep: 0.01, max: 0.15 },
  { biome: Biome.WASTELANDS, kind: HardshipKind.RUST, perStep: 0.02, max: 0.3 },
  { biome: Biome.SNOW, kind: HardshipKind.COLD, perStep: 0.02, max: 0.3 },
  { biome: Biome.VOLCANIC, kind: HardshipKind.HEAT, perStep: 0.02 },
  { biome: Biome.ABYSS, kind: HardshipKind.VOID, perStep: 0.03, max: 0.45 }
]

/** Steps kept at most (enough for every hardship to reach its maximum). */
export const MAX_HARDSHIP_STEPS = 99

export function getHardshipDefinition(biome: Biome): HardshipDefinition | null {
  return HARDSHIPS.find((definition) => definition.biome === biome) ?? null
}
