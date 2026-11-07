import { SceneryDensity } from '@/app/(protected)/(engine)/data/scenery'
import { Biome } from '@/app/(protected)/(engine)/models/Biome'
import { Terrain } from '@/app/(protected)/(engine)/models/Terrain'
import { Zone } from '@/app/(protected)/(engine)/models/Zone'

/**
 * The zones of a biome (see Zone): where they lie, their ground and how thick
 * their scenery grows. Their drawings are in the world map (sceneryTextures).
 */
export interface ZoneDefinition {
  zone: Zone
  biome: Biome
  /**
   * How often a stretch of the biome is of this zone, against the others and
   * against its plain look (BIOME_PLAIN_WEIGHT). A lair has none: it is only
   * around its captor (see LAIRS).
   */
  weight: number
  /** Its ground and patches, instead of the ones of the biome (BIOME_TERRAINS). */
  ground?: Terrain
  patches?: Terrain
  /** How thick its scenery grows, instead of the biome's (SCENERY_DENSITY). */
  density?: SceneryDensity
}

/** Weight of the plain look of a biome that has zones, against its zones. */
export const BIOME_PLAIN_WEIGHT = 3

export const ZONES: ZoneDefinition[] = [
  {
    zone: Zone.AUTUMN,
    biome: Biome.FOREST,
    weight: 2,
    patches: Terrain.LEAVES,
    density: { tall: 0.75, low: 0.26, ground: 1.6 }
  },
  {
    zone: Zone.PINEWOOD,
    biome: Biome.FOREST,
    weight: 2,
    patches: Terrain.NEEDLES,
    density: { tall: 1, low: 0.2, ground: 1.2 }
  },
  {
    zone: Zone.BLOSSOM,
    biome: Biome.FOREST,
    weight: 1.8,
    ground: Terrain.GRASS,
    patches: Terrain.MOSS,
    density: { tall: 0.5, low: 0.22, ground: 2.2 }
  },
  {
    zone: Zone.WITCHWOOD,
    biome: Biome.FOREST,
    weight: 0,
    ground: Terrain.BLIGHT,
    patches: Terrain.GLOOM,
    density: { tall: 0.8, low: 0.34, ground: 1.8 }
  },
  {
    zone: Zone.NECROPOLIS,
    biome: Biome.DESERT,
    weight: 0,
    ground: Terrain.REDSAND,
    patches: Terrain.DIRT,
    density: { tall: 0.5, low: 0.42, ground: 1.3 }
  },
  {
    zone: Zone.VILLAGE,
    biome: Biome.MEADOWS,
    weight: 0,
    density: { tall: 0.1, low: 0.08, ground: 2 }
  }
]

/**
 * The lair around the captor of a biome: its zone, how far it reaches from
 * the captor (world pixels, a little wobbly) and how far its ring of standing
 * stones (see the world map) stands.
 */
export interface LairDefinition {
  zone: Zone
  radius: number
}

export const LAIRS: Partial<Record<Biome, LairDefinition>> = {
  [Biome.FOREST]: { zone: Zone.WITCHWOOD, radius: 1000 },
  [Biome.DESERT]: { zone: Zone.NECROPOLIS, radius: 1150 }
}

/**
 * The village around the merchant of a biome (see placeVillages): its zone,
 * how far it reaches from the merchant (world pixels, a little wobbly) and
 * how many cottages it has at most.
 */
export interface VillageDefinition {
  zone: Zone
  radius: number
  houses: number
}

export const VILLAGES: Partial<Record<Biome, VillageDefinition>> = {
  [Biome.MEADOWS]: { zone: Zone.VILLAGE, radius: 850, houses: 12 }
}

/** Every zone, in the order TileMap.zones refers to them (0 is none, 1 the first one...). */
export const ZONES_ORDER = ZONES.map(({ zone }) => zone)

export function getZoneDefinition(zone: Zone): ZoneDefinition {
  return ZONES.find((definition) => definition.zone === zone)!
}
