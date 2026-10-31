import { Biome } from '@/app/(protected)/(engine)/models/Biome'
import { Terrain } from '@/app/(protected)/(engine)/models/Terrain'

/**
 * Every terrain, from the bottom layer to the top one: where two meet, the
 * upper one draws its border over the lower one.
 */
export const TERRAINS: Terrain[] = [
  Terrain.GRASS,
  Terrain.MOSS,
  Terrain.SNOW,
  Terrain.SAND,
  Terrain.ASH,
  Terrain.DIRT,
  Terrain.ROCK,
  Terrain.ICE,
  Terrain.STONE,
  Terrain.COBBLESTONE,
  Terrain.WATER,
  Terrain.LAVA
]

/** Terrains of the lakes (frozen in the snow), kept away from points and trails. */
export const LAKES = new Set([Terrain.WATER, Terrain.LAVA, Terrain.ICE])

/** Every biome, in the order TileMap.biomes refers to them. */
export const BIOMES_ORDER = Object.values(Biome)

/** Levels of the ground (see TileMap.heights). */
export const LEVELS = 4

/** How much each biome rises over the rest (mountains are mostly plateaus, the desert mostly flat). */
export const BIOME_RISE: Record<Biome, number> = {
  [Biome.MEADOWS]: 0,
  [Biome.FOREST]: 0.02,
  [Biome.TROPICAL]: 0.01,
  [Biome.DESERT]: -0.03,
  [Biome.MOUNTAINS]: 0.06,
  [Biome.SNOW]: 0.04,
  [Biome.VOLCANIC]: 0.03,
  [Biome.WASTELANDS]: -0.01,
  [Biome.ABYSS]: 0.02
}

/** Terrains of a biome: its plain ground, the patches over it, its trails and its lakes (none in the desert). */
export interface BiomeTerrains {
  ground: Terrain
  patches: Terrain
  trail: Terrain
  lake: Terrain | null
}

export const BIOME_TERRAINS: Record<Biome, BiomeTerrains> = {
  [Biome.MEADOWS]: { ground: Terrain.GRASS, patches: Terrain.DIRT, trail: Terrain.COBBLESTONE, lake: Terrain.WATER },
  [Biome.FOREST]: { ground: Terrain.MOSS, patches: Terrain.GRASS, trail: Terrain.DIRT, lake: Terrain.WATER },
  [Biome.TROPICAL]: { ground: Terrain.GRASS, patches: Terrain.MOSS, trail: Terrain.SAND, lake: Terrain.WATER },
  [Biome.DESERT]: { ground: Terrain.SAND, patches: Terrain.ROCK, trail: Terrain.STONE, lake: null },
  [Biome.MOUNTAINS]: { ground: Terrain.ROCK, patches: Terrain.SNOW, trail: Terrain.DIRT, lake: Terrain.WATER },
  [Biome.SNOW]: { ground: Terrain.SNOW, patches: Terrain.ROCK, trail: Terrain.STONE, lake: Terrain.ICE },
  [Biome.VOLCANIC]: { ground: Terrain.ASH, patches: Terrain.ROCK, trail: Terrain.STONE, lake: Terrain.LAVA },
  [Biome.WASTELANDS]: { ground: Terrain.ASH, patches: Terrain.DIRT, trail: Terrain.COBBLESTONE, lake: Terrain.WATER },
  [Biome.ABYSS]: { ground: Terrain.ASH, patches: Terrain.ROCK, trail: Terrain.STONE, lake: Terrain.LAVA }
}
