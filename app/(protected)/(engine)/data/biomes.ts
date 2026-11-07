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
  /** Where the captor waits: at the point of the biome closest to this place (otherwise, at its deepest point). */
  captorAt?: [number, number]
  /** The Seal of the biome (one of the two that close the Abyss). */
  sealId?: string
  /** Where the Seal waits: at the point of the biome closest to this place (a far corner of the world). */
  sealAt?: [number, number]
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

/** The biomes, from the easiest (the starting one) to the hardest (the final zone). */
export const BIOMES: BiomeDefinition[] = [
  {
    biome: Biome.MEADOWS,
    levelMin: 1,
    levelMax: 10,
    nodes: 140,
    anchors: [
      [8000, 7600],
      [8000, 9600]
    ],
    minibossCamps: 3,
    sanctuaries: 4,
    runeTier: RuneTier.LESSER,
    merchant: MerchantId.PEDDLER,
    tear: false,
    chests: 3,
    color: '#7bd36b'
  },
  {
    biome: Biome.FOREST,
    levelMin: 8,
    levelMax: 20,
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
    biome: Biome.DESERT,
    levelMin: 18,
    levelMax: 30,
    nodes: 120,
    anchors: [
      [12600, 10200],
      [11000, 10800]
    ],
    captor: { bossId: 'sahrak', captive: CharacterId.BRANN },
    minibossCamps: 3,
    sanctuaries: 6,
    runeTier: RuneTier.GREATER,
    merchant: MerchantId.ALCHEMIST,
    tear: false,
    chests: 2,
    color: '#e8c25a'
  },
  {
    biome: Biome.TROPICAL,
    levelMin: 28,
    levelMax: 40,
    nodes: 120,
    anchors: [
      [13000, 6600],
      [10800, 5600]
    ],
    captor: { bossId: 'xalqui', captive: CharacterId.OREN },
    captorAt: [WORLD_WIDTH, 3800],
    minibossCamps: 3,
    sanctuaries: 6,
    runeTier: RuneTier.GREATER,
    tear: true,
    chests: 2,
    color: '#18c3a4'
  },
  {
    biome: Biome.MOUNTAINS,
    levelMin: 38,
    levelMax: 50,
    nodes: 120,
    anchors: [
      [3200, 5800],
      [5400, 5000]
    ],
    captor: { bossId: 'colossus', captive: CharacterId.YSOLDE },
    minibossCamps: 3,
    sanctuaries: 7,
    runeTier: RuneTier.GREATER,
    merchant: MerchantId.SMITH,
    tear: false,
    chests: 2,
    color: '#9a8f86'
  },
  {
    biome: Biome.WASTELANDS,
    levelMin: 48,
    levelMax: 60,
    nodes: 120,
    anchors: [
      [8000, 4000],
      [6400, 2600],
      [9600, 2600]
    ],
    minibossCamps: 2,
    sanctuaries: 9,
    runeTier: RuneTier.ANCESTRAL,
    merchant: MerchantId.THRESHOLD,
    tear: true,
    chests: 2,
    color: '#8a6f5a'
  },
  {
    biome: Biome.SNOW,
    levelMin: 58,
    levelMax: 70,
    nodes: 110,
    anchors: [
      [2600, 2400],
      [4400, 2000]
    ],
    sealId: 'vorneth',
    sealAt: [0, 0],
    minibossCamps: 3,
    sanctuaries: 7,
    runeTier: RuneTier.ANCESTRAL,
    merchant: MerchantId.SCHOLAR,
    tear: true,
    chests: 2,
    color: '#dff3ff'
  },
  {
    biome: Biome.VOLCANIC,
    levelMin: 68,
    levelMax: 80,
    nodes: 110,
    anchors: [
      [13400, 2400],
      [11600, 2200]
    ],
    sealId: 'ignaroth',
    sealAt: [WORLD_WIDTH, 0],
    minibossCamps: 2,
    sanctuaries: 8,
    runeTier: RuneTier.ANCESTRAL,
    tear: true,
    chests: 2,
    color: '#ff5a2c'
  },
  {
    biome: Biome.ABYSS,
    levelMin: 78,
    levelMax: 90,
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
 * Snow (a Seal) is only reached through the Mountains; the volcanic lands (the
 * other Seal) and the Abyss only through the Wastelands, the Abyss by the door
 * of the Abyss, in the middle of its southern edge.
 */
export const BIOME_LINKS: [Biome, Biome][] = [
  [Biome.MEADOWS, Biome.FOREST],
  [Biome.MEADOWS, Biome.DESERT],
  [Biome.MEADOWS, Biome.TROPICAL],
  [Biome.MEADOWS, Biome.MOUNTAINS],
  [Biome.FOREST, Biome.MOUNTAINS],
  [Biome.DESERT, Biome.TROPICAL],
  [Biome.MOUNTAINS, Biome.WASTELANDS],
  [Biome.TROPICAL, Biome.WASTELANDS],
  [Biome.MOUNTAINS, Biome.SNOW],
  [Biome.WASTELANDS, Biome.VOLCANIC],
  [Biome.WASTELANDS, Biome.ABYSS]
]

/** A side of a biome. */
export type BiomeSide = 'north' | 'south' | 'west'

/**
 * The passes that are not left to chance: the border trail of the link that
 * lies farthest towards a side of the world.
 */
export const BIOME_PASSES: { link: [Biome, Biome]; side: BiomeSide }[] = [
  { link: [Biome.MEADOWS, Biome.DESERT], side: 'south' },
  { link: [Biome.MEADOWS, Biome.TROPICAL], side: 'north' },
  // Far from Sahrak, who waits at the deepest point of the desert.
  { link: [Biome.DESERT, Biome.TROPICAL], side: 'west' }
]

export function getBiomeDefinition(biome: Biome): BiomeDefinition {
  return BIOMES.find((definition) => definition.biome === biome)!
}
