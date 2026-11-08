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
  /** Where they go, in order: at the crossroads closest to each place (otherwise, spread out by the generator). */
  campsAt?: [number, number][]
  sanctuaries: number
  /** Where the first sanctuaries go: at the dead end closest to each place (the rest are spread out). */
  sanctuariesAt?: [number, number][]
  runeTier: RuneTier
  merchant?: MerchantId
  /** Whether a Tear of Oblivion is hidden in the biome. */
  tear: boolean
  chests: number
  /** Where the reliquaries of its weapons go, in the order of WEAPONS: at the dead end closest to each place. */
  reliquariesAt?: [number, number][]
  /** Where some of the chests go: at the dead end closest to each place (the rest, at random). */
  chestsAt?: [number, number][]
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
    // Two towards the south (the first one keeps a dead end for the merchant) and one in the middle of the north.
    campsAt: [
      [6647, 9599],
      [8092, 10501],
      [7546, 6660]
    ],
    sanctuaries: 4,
    // A rune at the old way to the desert, in the far south; its chest goes to the north.
    sanctuariesAt: [[8510, 11690]],
    runeTier: RuneTier.LESSER,
    merchant: MerchantId.PEDDLER,
    tear: false,
    chests: 3,
    // The chest of the old rune in the north, and the two that were already there (the old way to the desert stays
    // free to open up into a new trail).
    chestsAt: [
      [7900, 6340],
      [9150, 9550],
      [6590, 10980]
    ],
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
    campsAt: [
      [2320, 10746],
      [4704, 7860],
      [3210, 9214]
    ],
    sanctuaries: 5,
    sanctuariesAt: [
      [3549, 8398],
      [6925, 8061],
      [844, 8219],
      [2989, 11350],
      [5067, 11634]
    ],
    runeTier: RuneTier.LESSER,
    tear: true,
    chests: 4,
    chestsAt: [
      [322, 11627],
      [1543, 8342],
      [833, 9674],
      [4297, 11667]
    ],
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
    captorAt: [15650, 10360],
    minibossCamps: 3,
    campsAt: [
      [14156, 9852],
      [11977, 11222],
      [10321, 10025]
    ],
    sanctuaries: 6,
    sanctuariesAt: [
      [15625, 9241],
      [11982, 8723],
      [13295, 9891],
      [9059, 11630],
      [14014, 11243],
      [10248, 8498]
    ],
    reliquariesAt: [[14739, 11644]],
    runeTier: RuneTier.GREATER,
    merchant: MerchantId.ALCHEMIST,
    tear: false,
    chests: 2,
    chestsAt: [
      [10940, 10120],
      [13670, 11420]
    ],
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

/**
 * Links whose border trail was taken away by hand (see REMOVED_TRAILS). The
 * generator still draws their trail, so the rest of the map keeps its random
 * numbers, and it is removed right after. The Desert and the Tropics are not
 * joined any more: the Tropics are reached from the Meadows and the Wastelands.
 */
export const CLOSED_LINKS: [Biome, Biome][] = [[Biome.DESERT, Biome.TROPICAL]]

/** A side of a biome. */
export type BiomeSide = 'north' | 'south' | 'west'

/** A trail by the places of its two ends (points of the world). */
export type TrailEnds = [[number, number], [number, number]]

/** Trails taken away from the maze by hand (and never opened again by the generator). */
export const REMOVED_TRAILS: TrailEnds[] = [
  // Forest: n644–n624, n678–n676, n721–n676, n721–n689 (the rune of n689 at the end of a dead end), n779–n812 and
  // n855–n886; then n745–n702, n988–n978 and n995–n1014. Desert: n943–n975, n979–n1017, n748–n725, n743–n789,
  // n782–n757 and n728–n682 (the way to the Tropics, closed; see CLOSED_LINKS); then n947–n961 (the way from the
  // Meadows, moved to n920–n903), n903–n923, n885–n865, n885–n895 and n856–n821; then n941–n964, n964–n982 and
  // n770–n814; then n814–n830.
  [
    [10529, 9542],
    [10989, 9686]
  ],
  [
    [9396, 10927],
    [9971, 11215]
  ],
  [
    [9971, 11215],
    [10337, 11403]
  ],
  [
    [10138, 9068],
    [10529, 9542]
  ],
  [
    [8683, 10983],
    [9048, 11171]
  ],
  [
    [9428, 10427],
    [9929, 10707]
  ],
  [
    [9944, 10256],
    [10321, 10025]
  ],
  [
    [9944, 10256],
    [10288, 10361]
  ],
  [
    [10015, 9953],
    [10181, 9606]
  ],
  [
    [15178, 10954],
    [15281, 11325]
  ],
  [
    [14954, 11376],
    [15117, 11689]
  ],
  [
    [10750, 8770],
    [10999, 8476]
  ],
  [
    [11982, 8723],
    [12087, 9253]
  ],
  [
    [12424, 9196],
    [12555, 8849]
  ],
  [
    [10248, 8498],
    [10430, 7992]
  ],
  [
    [5586, 7473],
    [6118, 7199]
  ],
  [
    [6024, 7974],
    [6391, 7945]
  ],
  [
    [6323, 8402],
    [6391, 7945]
  ],
  [
    [6323, 8402],
    [6925, 8061]
  ],
  [
    [4382, 9139],
    [4563, 9516]
  ],
  [
    [4427, 9936],
    [3918, 10271]
  ],
  [
    [538, 8758],
    [844, 8219]
  ],
  [
    [3492, 11458],
    [2989, 11350]
  ],
  [
    [3881, 11522],
    [3186, 11679]
  ]
]

/** Trails added to the maze by hand. */
export const ADDED_TRAILS: TrailEnds[] = [
  // Forest: n624–n652 and n676–n689 (the way to the rune of n689, once its other trails are gone), n855–n901,
  // n786–n829 (the camp of n786 a crossroads), n709–n740, n717–n702 (the way to the rune of n702) and n1014–n978 (the
  // way to the rune of n978). Desert: n955–n979, n732–n725, n748–n771 and n757–n743; then n920–n903 (the way from
  // the Meadows), n903–n885 and n856–n865; then n930–n964, n923–n930 and n993–n1013 (with n770–n814 and n964–n982 gone,
  // the only ways between the west of the desert and the rest); then n814–n852, plus n852–n899, n926–n962 and n926–n980
  // so the generator does not draw that corner again.
  [
    [10636, 9928],
    [10764, 10386]
  ],
  [
    [11024, 10754],
    [10594, 11178]
  ],
  [
    [11024, 10754],
    [10943, 11377]
  ],
  [
    [10529, 9542],
    [10636, 9928]
  ],
  [
    [9753, 11503],
    [10152, 11678]
  ],
  [
    [9929, 10707],
    [10317, 10801]
  ],
  [
    [10317, 10801],
    [9971, 11215]
  ],
  [
    [8925, 10666],
    [9428, 10427]
  ],
  [
    [9428, 10427],
    [9944, 10256]
  ],
  [
    [10015, 9953],
    [10321, 10025]
  ],
  [
    [14717, 11060],
    [14954, 11376]
  ],
  [
    [11427, 8526],
    [10999, 8476]
  ],
  [
    [10750, 8770],
    [11100, 9088]
  ],
  [
    [12555, 8849],
    [11982, 8723]
  ],
  [
    [3210, 9214],
    [3524, 9686]
  ],
  [
    [4661, 8318],
    [4806, 8679]
  ],
  [
    [376, 8378],
    [844, 8219]
  ],
  [
    [3186, 11679],
    [2989, 11350]
  ],
  [
    [6118, 7199],
    [6201, 7612]
  ],
  [
    [6391, 7945],
    [6925, 8061]
  ],
  [
    [4427, 9936],
    [4269, 10414]
  ]
]

/**
 * The passes that are not left to chance: the border trail of the link that
 * lies farthest towards a side of the world, the closest one to a place, or
 * a trail set by hand.
 */
export const BIOME_PASSES: {
  link: [Biome, Biome]
  side?: BiomeSide
  at?: [number, number]
  /** The trail itself, by the places of its two ends. */
  between?: [[number, number], [number, number]]
}[] = [
  // Drawn here so the rest of the map keeps its random numbers; moved by hand to n920–n903 (see REMOVED_TRAILS and
  // ADDED_TRAILS).
  {
    link: [Biome.MEADOWS, Biome.DESERT],
    between: [
      [8680, 10980],
      [9050, 11170]
    ]
  },
  { link: [Biome.MEADOWS, Biome.TROPICAL], side: 'north' },
  // Far from Sahrak, who waits at the deepest point of the desert.
  { link: [Biome.DESERT, Biome.TROPICAL], side: 'west' }
]

export function getBiomeDefinition(biome: Biome): BiomeDefinition {
  return BIOMES.find((definition) => definition.biome === biome)!
}
