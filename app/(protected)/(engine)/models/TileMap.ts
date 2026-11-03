/** The ground of the world map as a grid of square tiles (see buildTileMap). Only for the look: the rules use the points and trails. */
export interface TileMap {
  columns: number
  rows: number
  /** Side of a tile, in world pixels. */
  tileSize: number
  /** Terrain of each tile, row by row, as its index in TERRAINS (data/terrains.ts). */
  terrains: Uint8Array
  /** Level of the ground of each tile, row by row, from 0 to LEVELS - 1: a higher tile is a plateau with a cliff down to its lower neighbors. Neighbors never differ by more than one level. */
  heights: Uint8Array
  /** 1 for the tiles paved by a trail or the clearing of a point, 0 for the rest. */
  paved: Uint8Array
  /** Biome of each tile (the one of its closest point), as its index in BIOMES_ORDER (data/terrains.ts). */
  biomes: Uint8Array
  /**
   * How close each tile is to the Seal of its biome, from 0 (the edge of the biome) to 255 (the Seal), in the biomes
   * that change on the way to it (BiomeTerrains.seal); 0 elsewhere.
   */
  nearSeal: Uint8Array
}
