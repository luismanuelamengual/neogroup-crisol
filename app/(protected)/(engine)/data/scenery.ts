import { Biome } from '@/app/(protected)/(engine)/models/Biome'

/**
 * How thick the scenery of each biome grows (see placeScenery): the chance of
 * a tall piece (a tree, a cactus...) and of a low one (a bush, a rock) on each
 * free tile where the noise of the woods is at its thickest, and how many
 * small things (tufts, flowers, pebbles) lie on a tile.
 */
export interface SceneryDensity {
  tall: number
  low: number
  ground: number
}

export const SCENERY_DENSITY: Record<Biome, SceneryDensity> = {
  [Biome.MEADOWS]: { tall: 0.45, low: 0.18, ground: 1.6 },
  [Biome.FOREST]: { tall: 0.9, low: 0.22, ground: 1.4 },
  [Biome.TROPICAL]: { tall: 0.8, low: 0.3, ground: 1.6 },
  [Biome.DESERT]: { tall: 0.12, low: 0.14, ground: 0.5 },
  [Biome.MOUNTAINS]: { tall: 0.35, low: 0.3, ground: 0.8 },
  [Biome.SNOW]: { tall: 0.4, low: 0.16, ground: 0.5 },
  [Biome.VOLCANIC]: { tall: 0.2, low: 0.26, ground: 0.8 },
  [Biome.WASTELANDS]: { tall: 0.16, low: 0.2, ground: 0.7 },
  [Biome.ABYSS]: { tall: 0.32, low: 0.3, ground: 1 }
}
