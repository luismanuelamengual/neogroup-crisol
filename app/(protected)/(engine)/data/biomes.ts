import { Biome } from '@/app/(protected)/(engine)/models/Biome'
import { CharacterId } from '@/app/(protected)/(engine)/models/CharacterId'
import { MerchantId } from '@/app/(protected)/(engine)/models/MerchantId'
import { RuneTier } from '@/app/(protected)/(engine)/models/RuneTier'

/** Design of a biome: what the world generator places in it. */
export interface BiomeDefinition {
  biome: Biome
  /** Level of its enemies in the first cycle, from its entrance to its deepest point. */
  levelMin: number
  levelMax: number
  /** Points of the biome. */
  nodes: number
  /**
   * Centers of its region on the 16,000 × 12,000 px world (y grows southwards).
   * A biome with several anchors stretches between them.
   */
  anchors: [number, number][]
  /** The captor boss of the biome and the character it holds. */
  captor?: { bossId: string; captive: CharacterId }
  /** The Seal of the biome (one of the three that close the Abyss). */
  sealId?: string
  /** Camps opened by a mini boss. */
  minibossCamps: number
  sanctuaries: number
  runeTier: RuneTier
  merchant?: MerchantId
  /** Whether a Tear of Oblivion is hidden in the biome. */
  tear: boolean
  chests: number
  /** Color of the biome in the debug viewer. */
  color: string
}

export const WORLD_WIDTH = 16_000
export const WORLD_HEIGHT = 12_000

/** The biomes, from the starting one to the final zone. */
export const BIOMES: BiomeDefinition[] = [
  {
    biome: Biome.MEADOWS,
    levelMin: 1,
    levelMax: 8,
    nodes: 140,
    anchors: [
      [8000, 7600],
      [8000, 9600]
    ],
    minibossCamps: 2,
    sanctuaries: 4,
    runeTier: RuneTier.LESSER,
    merchant: MerchantId.PEDDLER,
    tear: false,
    chests: 3,
    color: '#7bd36b'
  },
  {
    biome: Biome.FOREST,
    levelMin: 6,
    levelMax: 14,
    nodes: 130,
    anchors: [
      [3200, 9600],
      [4600, 8000]
    ],
    captor: { bossId: 'morgrath', captive: CharacterId.SERA },
    minibossCamps: 3,
    sanctuaries: 5,
    runeTier: RuneTier.LESSER,
    tear: true,
    chests: 2,
    color: '#2f8f4e'
  },
  {
    biome: Biome.TROPICAL,
    levelMin: 10,
    levelMax: 18,
    nodes: 120,
    anchors: [
      [12600, 10200],
      [11000, 10800]
    ],
    sealId: 'xalqui',
    minibossCamps: 3,
    sanctuaries: 6,
    runeTier: RuneTier.GREATER,
    merchant: MerchantId.ALCHEMIST,
    tear: false,
    chests: 2,
    color: '#18c3a4'
  },
  {
    biome: Biome.DESERT,
    levelMin: 14,
    levelMax: 22,
    nodes: 120,
    anchors: [
      [13000, 6600],
      [10800, 5600]
    ],
    captor: { bossId: 'sahrak', captive: CharacterId.BRANN },
    minibossCamps: 3,
    sanctuaries: 6,
    runeTier: RuneTier.GREATER,
    tear: true,
    chests: 2,
    color: '#e8c25a'
  },
  {
    biome: Biome.MOUNTAINS,
    levelMin: 18,
    levelMax: 26,
    nodes: 120,
    anchors: [
      [3200, 5800],
      [5400, 5000]
    ],
    sealId: 'colossus',
    minibossCamps: 3,
    sanctuaries: 7,
    runeTier: RuneTier.GREATER,
    merchant: MerchantId.SMITH,
    tear: false,
    chests: 2,
    color: '#9a8f86'
  },
  {
    biome: Biome.SNOW,
    levelMin: 22,
    levelMax: 30,
    nodes: 110,
    anchors: [
      [2600, 2400],
      [4400, 2000]
    ],
    captor: { bossId: 'vorneth', captive: CharacterId.OREN },
    minibossCamps: 2,
    sanctuaries: 7,
    runeTier: RuneTier.ANCESTRAL,
    merchant: MerchantId.SCHOLAR,
    tear: true,
    chests: 2,
    color: '#dff3ff'
  },
  {
    biome: Biome.VOLCANIC,
    levelMin: 26,
    levelMax: 34,
    nodes: 110,
    anchors: [
      [13400, 2400],
      [11600, 2200]
    ],
    captor: { bossId: 'ignaroth', captive: CharacterId.YSOLDE },
    minibossCamps: 2,
    sanctuaries: 8,
    runeTier: RuneTier.ANCESTRAL,
    tear: true,
    chests: 2,
    color: '#ff5a2c'
  },
  {
    biome: Biome.WASTELANDS,
    levelMin: 32,
    levelMax: 40,
    nodes: 120,
    anchors: [
      [8000, 4000],
      [6400, 2600],
      [9600, 2600]
    ],
    sealId: 'vael',
    minibossCamps: 2,
    sanctuaries: 9,
    runeTier: RuneTier.ANCESTRAL,
    merchant: MerchantId.THRESHOLD,
    tear: true,
    chests: 2,
    color: '#8a6f5a'
  },
  {
    biome: Biome.ABYSS,
    levelMin: 40,
    levelMax: 50,
    nodes: 50,
    anchors: [[8000, 1300]],
    minibossCamps: 2,
    sanctuaries: 8,
    runeTier: RuneTier.ABYSSAL,
    tear: false,
    chests: 0,
    color: '#7a3cff'
  }
]

/**
 * Biomes joined by trails (always through very few border points: passes,
 * bridges). Any other pair of neighboring regions is closed (cliffs, rivers).
 * The Abyss is only reached through the Wastelands, by the door of the Abyss.
 */
export const BIOME_LINKS: [Biome, Biome][] = [
  [Biome.MEADOWS, Biome.FOREST],
  [Biome.MEADOWS, Biome.TROPICAL],
  [Biome.MEADOWS, Biome.DESERT],
  [Biome.MEADOWS, Biome.MOUNTAINS],
  [Biome.FOREST, Biome.MOUNTAINS],
  [Biome.TROPICAL, Biome.DESERT],
  [Biome.MOUNTAINS, Biome.SNOW],
  [Biome.DESERT, Biome.VOLCANIC],
  [Biome.SNOW, Biome.WASTELANDS],
  [Biome.VOLCANIC, Biome.WASTELANDS],
  [Biome.WASTELANDS, Biome.ABYSS]
]

export function getBiomeDefinition(biome: Biome): BiomeDefinition {
  return BIOMES.find((definition) => definition.biome === biome)!
}
