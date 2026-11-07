import { Biome } from '@/app/(protected)/(engine)/models/Biome'
import { Terrain } from '@/app/(protected)/(engine)/models/Terrain'

/**
 * Every terrain, from the bottom layer to the top one: where two meet, the
 * upper one draws its border over the lower one.
 */
export const TERRAINS: Terrain[] = [
  Terrain.GRASS,
  Terrain.MOSS,
  Terrain.LEAVES,
  Terrain.SNOW,
  Terrain.SAND,
  Terrain.REDSAND,
  Terrain.ASH,
  Terrain.BASALT,
  Terrain.SCORCHED,
  Terrain.GLOOM,
  Terrain.BLIGHT,
  Terrain.NEEDLES,
  Terrain.DIRT,
  Terrain.ROCK,
  Terrain.MAGMA,
  Terrain.MYCELIUM,
  Terrain.GLACIER,
  Terrain.ICE,
  Terrain.STONE,
  Terrain.COBBLESTONE,
  Terrain.FIRESTONE,
  Terrain.RUNESTONE,
  Terrain.WATER,
  Terrain.LAVA,
  Terrain.ICHOR
]

/** Terrains of the lakes (frozen in the snow), kept away from points and trails. */
export const LAKES = new Set([Terrain.WATER, Terrain.LAVA, Terrain.ICE, Terrain.ICHOR])

/** Every biome, in the order TileMap.biomes refers to them. */
export const BIOMES_ORDER = Object.values(Biome)

/** Levels of the ground (see TileMap.heights). */
export const LEVELS = 4

/**
 * How much each biome rises over the rest (mountains are mostly plateaus, the
 * desert mostly flat, the volcano a high plateau over its neighbors).
 */
export const BIOME_RISE: Record<Biome, number> = {
  [Biome.MEADOWS]: 0,
  [Biome.FOREST]: 0.02,
  [Biome.TROPICAL]: 0.01,
  [Biome.DESERT]: -0.03,
  [Biome.MOUNTAINS]: 0.06,
  [Biome.SNOW]: 0.04,
  [Biome.VOLCANIC]: 0.3,
  [Biome.WASTELANDS]: -0.01,
  [Biome.ABYSS]: 0.02
}

/**
 * Terrains of a biome: its plain ground, the patches over it, its trails and
 * its lakes (none in the desert). Some biomes have more lakes than the rest
 * (`lakes`, the share of the noise over which they lie, 0.56 by default) and
 * rivers of them winding between the trails (`rivers`, their width in shares
 * of the noise). The biomes of the Seals change on the way to it (`seal`):
 * past `from` (0 at the edge of the biome, 1 at the Seal) their ground and
 * patches turn into these, and their lakes and rivers grow steadily from the
 * edge to the Seal, up to these.
 */
export interface BiomeTerrains {
  ground: Terrain
  patches: Terrain
  trail: Terrain
  lake: Terrain | null
  lakes?: number
  rivers?: number
  seal?: { from: number; ground: Terrain; patches: Terrain; lakes: number; rivers: number }
}

export const BIOME_TERRAINS: Record<Biome, BiomeTerrains> = {
  [Biome.MEADOWS]: { ground: Terrain.GRASS, patches: Terrain.DIRT, trail: Terrain.COBBLESTONE, lake: Terrain.WATER },
  [Biome.FOREST]: { ground: Terrain.MOSS, patches: Terrain.GRASS, trail: Terrain.DIRT, lake: Terrain.WATER },
  [Biome.TROPICAL]: { ground: Terrain.GRASS, patches: Terrain.MOSS, trail: Terrain.SAND, lake: Terrain.WATER },
  [Biome.DESERT]: { ground: Terrain.SAND, patches: Terrain.ROCK, trail: Terrain.STONE, lake: null },
  [Biome.MOUNTAINS]: { ground: Terrain.ROCK, patches: Terrain.SNOW, trail: Terrain.DIRT, lake: Terrain.WATER },
  [Biome.SNOW]: {
    ground: Terrain.SNOW,
    patches: Terrain.ROCK,
    trail: Terrain.STONE,
    lake: Terrain.ICE,
    seal: { from: 0.5, ground: Terrain.GLACIER, patches: Terrain.SNOW, lakes: 0.46, rivers: 0.03 }
  },
  [Biome.VOLCANIC]: {
    ground: Terrain.BASALT,
    patches: Terrain.SCORCHED,
    trail: Terrain.FIRESTONE,
    lake: Terrain.LAVA,
    lakes: 0.66,
    seal: { from: 0.45, ground: Terrain.SCORCHED, patches: Terrain.MAGMA, lakes: 0.44, rivers: 0.05 }
  },
  [Biome.WASTELANDS]: { ground: Terrain.ASH, patches: Terrain.DIRT, trail: Terrain.COBBLESTONE, lake: Terrain.WATER },
  [Biome.ABYSS]: {
    ground: Terrain.GLOOM,
    patches: Terrain.MYCELIUM,
    trail: Terrain.RUNESTONE,
    lake: Terrain.ICHOR,
    lakes: 0.52,
    rivers: 0.025
  }
}
