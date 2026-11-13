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
  /**
   * Where the first sanctuaries go: at the dead end closest to each place (the rest are spread out). A third value
   * keeps the tier of a rune brought from another biome.
   */
  sanctuariesAt?: ([number, number] | [number, number, RuneTier])[]
  runeTier: RuneTier
  merchant?: MerchantId
  /** Where the merchant waits: at this point, a dead end right off a camp (otherwise, beside the camp chosen for it). */
  merchantAt?: [number, number]
  /** Whether a Tear of Oblivion is hidden in the biome. */
  tear: boolean
  /** Where it is: at the dead end closest to this place (otherwise, at its deepest one). */
  tearAt?: [number, number]
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
    sanctuaries: 6,
    // A rune at the old way to the desert, in the far south; its chest goes to the north.
    sanctuariesAt: [
      [8510, 11690],
      // The ones the generator had spread out, kept where they were.
      [9052, 7241],
      [6809, 7442],
      [6089, 11483],
      // Sanctuaries added by hand on points of the way through.
      [9745, 9788],
      [7655, 9729]
    ],
    runeTier: RuneTier.LESSER,
    merchant: MerchantId.PEDDLER,
    tear: false,
    chests: 2,
    // The chest of the old rune in the north, and one that was already there (the old way to the desert stays free to
    // open up into a new trail; the third one gave its place to an Amber Ember).
    chestsAt: [
      [7900, 6340],
      [9150, 9550]
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
    sanctuaries: 6,
    sanctuariesAt: [
      [3549, 8398],
      [5032, 6219],
      [844, 8219],
      [2989, 11350],
      [322, 11627],
      // Sanctuaries added by hand on points of the way through.
      [2340, 9994]
    ],
    reliquariesAt: [[6925, 8061]],
    runeTier: RuneTier.LESSER,
    tear: true,
    tearAt: [2721, 11696],
    chests: 4,
    chestsAt: [
      [3079, 9593],
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
    sanctuaries: 7,
    sanctuariesAt: [
      [15625, 9241],
      [11754, 11576],
      [13295, 9891],
      [9059, 11630],
      [14014, 11243],
      [10248, 8498],
      // Sanctuaries added by hand on points of the way through.
      [11349, 10923]
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
    campsAt: [
      [14015, 6589],
      [10190, 5577],
      [11784, 7488]
    ],
    sanctuaries: 6,
    sanctuariesAt: [
      [11960, 4086],
      [12124, 5521],
      [12254, 8335],
      [9928, 6917],
      [12972, 6413],
      [14579, 8402]
    ],
    reliquariesAt: [[15618, 8769]],
    runeTier: RuneTier.GREATER,
    tear: true,
    tearAt: [15109, 8537],
    chests: 2,
    chestsAt: [
      [15684, 6230],
      [14858, 8085]
    ],
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
    captorAt: [1389, 6704],
    minibossCamps: 3,
    campsAt: [
      [2199, 5104],
      [5623, 4903],
      [2164, 7808]
    ],
    sanctuaries: 8,
    sanctuariesAt: [
      [5581, 3855],
      [6956, 5186],
      [1163, 4669],
      [4584, 4716],
      [2211, 6211],
      [3573, 5316],
      [3343, 7460],
      // Sanctuaries added by hand on points of the way through.
      [3491, 4468]
    ],
    reliquariesAt: [
      [4510, 5416],
      [493, 7975]
    ],
    runeTier: RuneTier.GREATER,
    merchant: MerchantId.SMITH,
    merchantAt: [5645, 4458],
    tear: false,
    chests: 2,
    chestsAt: [
      [1995, 4397],
      [4279, 4944]
    ],
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
    campsAt: [
      [9543, 2296],
      [6782, 3087]
    ],
    sanctuaries: 9,
    sanctuariesAt: [
      [10923, 3306],
      [5508, 1160],
      [5038, 2829],
      [5708, 3093],
      [10646, 2474],
      [10033, 3804],
      [7869, 5611],
      [8525, 5491],
      // Sanctuaries added by hand on points of the way through.
      [8378, 3204]
    ],
    runeTier: RuneTier.ANCESTRAL,
    reliquariesAt: [
      [5876, 964],
      [10640, 761]
    ],
    merchant: MerchantId.THRESHOLD,
    merchantAt: [9632, 2816],
    tear: true,
    tearAt: [5425, 3522],
    chests: 4,
    chestsAt: [
      [7545, 2977],
      [5965, 2089],
      [6312, 848],
      [6864, 4869]
    ],
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
    minibossCamps: 2,
    campsAt: [
      [3021, 1271],
      [1324, 3558]
    ],
    sanctuaries: 11,
    sanctuariesAt: [
      [5430, 755],
      [422, 1043],
      [4964, 1673],
      [2040, 2118],
      [1607, 2635],
      [393, 4037],
      [302, 4673],
      // The rune of n261, brought from the Wastelands, and the one of n45, from the Abyss (where its chest was).
      [4678, 3331],
      [512, 2148, RuneTier.ABYSSAL],
      // Sanctuaries added by hand on points of the way through.
      [3493, 2277],
      [1579, 357]
    ],
    reliquariesAt: [[4567, 380]],
    runeTier: RuneTier.ANCESTRAL,
    merchant: MerchantId.SCHOLAR,
    merchantAt: [978, 3185],
    tear: true,
    tearAt: [5053, 1138],
    chests: 1,
    chestsAt: [[3091, 2531]],
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
    campsAt: [
      [14852, 3193],
      [11614, 1574]
    ],
    sanctuaries: 11,
    sanctuariesAt: [
      [10525, 301],
      [13618, 1646],
      [14466, 307],
      [12442, 505],
      [13638, 964],
      [12041, 1886],
      [11279, 3425],
      [12997, 3444],
      // The rune of n187, brought from the Abyss.
      [14298, 4355, RuneTier.ABYSSAL],
      // Sanctuaries added by hand on points of the way through.
      [13881, 2115],
      [15147, 1859]
    ],
    reliquariesAt: [[12870, 4957]],
    runeTier: RuneTier.ANCESTRAL,
    tear: true,
    tearAt: [15203, 360],
    chests: 2,
    chestsAt: [
      [10985, 848],
      [10957, 2722]
    ],
    color: '#ff5a2c'
  },
  {
    biome: Biome.ABYSS,
    levelMin: 78,
    levelMax: 90,
    nodes: 50,
    anchors: [[8000, 1300]],
    minibossCamps: 1,
    campsAt: [[8121, 1174]],
    sanctuaries: 6,
    sanctuariesAt: [
      [10004, 325],
      [8484, 344],
      [8816, 357],
      [9719, 965],
      [8336, 1883],
      [9066, 1932]
    ],
    reliquariesAt: [[10247, 666]],
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
  // With the Amber Flasks and Embers: n972–n998 and n969–n1001 (Desert), n665–n645 (Tropics), n280–n316, n273–n306
  // and n284–n294 (Snow); then n761–n737.
  [
    [8595, 8899],
    [8903, 8635]
  ],
  [
    [11498, 11311],
    [11754, 11576]
  ],
  [
    [12313, 11292],
    [12154, 11614]
  ],
  [
    [12887, 7753],
    [13560, 7479]
  ],
  [
    [2627, 3198],
    [2608, 3547]
  ],
  [
    [3331, 3125],
    [3504, 3450]
  ],
  [
    [4254, 3234],
    [4678, 3331]
  ],
  // Forest: n644–n624, n678–n676, n721–n676, n721–n689 (the rune of n689 at the end of a dead end), n779–n812 and
  // n855–n886; then n745–n702, n988–n978 and n995–n1014. Desert: n943–n975, n979–n1017, n748–n725, n743–n789,
  // n782–n757 and n728–n682 (the way to the Tropics, closed; see CLOSED_LINKS); then n947–n961 (the way from the
  // Meadows, moved to n920–n903), n903–n923, n885–n865, n885–n895 and n856–n821; then n941–n964, n964–n982 and
  // n770–n814; then n814–n830. Tropics: n507–n496 (the way from the Meadows, moved to n566–n550), n483–n454, n433–n444,
  // n645–n610 and n555–n585; then n575–n555 and n667–n672. Forest and Mountains: n523–n551 (the way between them,
  // moved to n551–n514), n551–n544, n544–n587, n552–n587, n403–n399 and n399–n369; then n591–n593, n637–n622 and
  // n435–n464. Mountains and Wastelands: n461–n437 (the way between them, moved to n356–n342). Wastelands: n291–n292,
  // n456–n497 and n223–n209. Snow: n235–n206, n278–n235, n278–n307, n324–n340 and n207–n171; then n60–n19.
  // Wastelands and Volcanic: n143–n169 (the way between them, moved to n123–n95). Volcanic: n78–n49 and n163–n134; then
  // n346–n388, n370–n375 and n344–n375. Abyss: n86–n126 (so the camp of n86 keeps its distance to the others).
  [
    [8121, 1174],
    [8174, 1575]
  ],
  [
    [14469, 3889],
    [14298, 4355]
  ],
  [
    [14761, 4139],
    [15306, 4212]
  ],
  [
    [15084, 3863],
    [15306, 4212]
  ],
  [
    [4369, 863],
    [4567, 380]
  ],
  [
    [10731, 1759],
    [11341, 2059]
  ],
  [
    [12433, 1049],
    [12731, 762]
  ],
  [
    [13450, 1982],
    [13618, 1646]
  ],
  [
    [1275, 2730],
    [831, 2396]
  ],
  [
    [978, 3185],
    [1275, 2730]
  ],
  [
    [978, 3185],
    [765, 3457]
  ],
  [
    [388, 3682],
    [703, 3847]
  ],
  [
    [2371, 2419],
    [2539, 2064]
  ],
  [
    [6956, 5186],
    [7200, 4944]
  ],
  [
    [10561, 3279],
    [10923, 3306]
  ],
  [
    [7898, 5129],
    [7869, 5611]
  ],
  [
    [10223, 2571],
    [10646, 2474]
  ],
  [
    [733, 4935],
    [862, 5239]
  ],
  [
    [2778, 6785],
    [3289, 6791]
  ],
  [
    [411, 7380],
    [711, 7186]
  ],
  [
    [4161, 5972],
    [4625, 6298]
  ],
  [
    [4625, 6298],
    [5032, 6219]
  ],
  [
    [5032, 6219],
    [5082, 6748]
  ],
  [
    [5487, 6310],
    [5082, 6748]
  ],
  [
    [5325, 4540],
    [5645, 4458]
  ],
  [
    [5645, 4458],
    [5866, 4133]
  ],
  [
    [14015, 6589],
    [14495, 6330]
  ],
  [
    [14624, 7776],
    [15153, 7845]
  ],
  [
    [8513, 5831],
    [9136, 5599]
  ],
  [
    [13255, 5462],
    [13714, 5122]
  ],
  [
    [14072, 4897],
    [14673, 5037]
  ],
  [
    [13560, 7479],
    [13762, 7064]
  ],
  [
    [14495, 6330],
    [14417, 6722]
  ],
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
  // With the Amber Flasks and Embers: n665–n700 (Tropics) and n263–n284 (Snow), plus n316–n330 (the way to the Amber
  // Flask of n316), n1001–n998 (the way to the rune of n998) and n1002–n1004, kept as they were.
  [
    [2608, 3547],
    [3110, 3755]
  ],
  [
    [12154, 11614],
    [11754, 11576]
  ],
  [
    [13331, 11614],
    [12657, 11629]
  ],
  [
    [12887, 7753],
    [13083, 8186]
  ],
  [
    [3868, 3060],
    [4254, 3234]
  ],
  // Tropics: n566–n550 (the way from the Meadows), n454–n433 (the way to the rune of n454), n404–n433 (the only way to
  // them now), n575–n585, n562–n524 and n620–n651. Forest and Mountains: n552–n544 (the way to the chest of n544),
  // n590–n551, n551–n514 (the way between them), n434–n399 (the way to the Smith) and n418–n411; then n499–n530 and
  // n530–n549, plus n530–n561, n600–n629 and n480–n521 so the generator does not draw them elsewhere; then n442–n479,
  // and n479–n489 kept. Mountains and Wastelands: n356–n342 (the way between them). Wastelands: n309–n335, n209–n251
  // and n292–n327 (the ways to the runes of n209 and n292). Snow: n249–n266 and n386–n340, plus n144–n216, n188–n201,
  // n266–n324 and n253–n294, kept as they were (without them that part of the snow is cut off); then n34–n19.
  // Wastelands and Volcanic: n123–n95 (the way between them). Volcanic: n130–n95 and n105–n153, kept as they were
  // (without them that part of the volcanic lands is cut off). Abyss: n187–n160 and n45–n22. Volcanic: n314–n366,
  // n375–n396 and n165–n191, kept as they were. Abyss: n126–n103.
  [
    [8174, 1575],
    [8392, 1319]
  ],
  [
    [15560, 3543],
    [15693, 4079]
  ],
  [
    [15306, 4212],
    [15001, 4440]
  ],
  [
    [7988, 2032],
    [7730, 2255]
  ],
  [
    [8532, 2218],
    [8695, 1911]
  ],
  [
    [7891, 752],
    [7563, 398]
  ],
  [
    [11231, 1607],
    [11099, 1247]
  ],
  [
    [13835, 1346],
    [14154, 1852]
  ],
  [
    [5120, 572],
    [4567, 380]
  ],
  [
    [10556, 1514],
    [11099, 1247]
  ],
  [
    [451, 1782],
    [361, 2522]
  ],
  [
    [1705, 2219],
    [1217, 2355]
  ],
  [
    [569, 3071],
    [388, 3682]
  ],
  [
    [4535, 2916],
    [4678, 3331]
  ],
  [
    [882, 2844],
    [569, 3071]
  ],
  [
    [635, 4346],
    [703, 3847]
  ],
  [
    [10646, 2474],
    [10606, 2894]
  ],
  [
    [10923, 3306],
    [10457, 3718]
  ],
  [
    [6259, 4005],
    [6563, 3858]
  ],
  [
    [7154, 3479],
    [7365, 3796]
  ],
  [
    [3015, 5443],
    [3349, 5521]
  ],
  [
    [3213, 5021],
    [3015, 5443]
  ],
  [
    [1412, 6068],
    [1612, 6420]
  ],
  [
    [1939, 6922],
    [1545, 7260]
  ],
  [
    [5727, 5453],
    [5827, 5941]
  ],
  [
    [1581, 5677],
    [1412, 6068]
  ],
  [
    [1412, 6068],
    [1005, 6255]
  ],
  [
    [5487, 6310],
    [5032, 6219]
  ],
  [
    [4450, 6769],
    [4625, 6298]
  ],
  [
    [4625, 6298],
    [4844, 5888]
  ],
  [
    [5623, 4903],
    [5645, 4458]
  ],
  [
    [2724, 4715],
    [3087, 4625]
  ],
  [
    [15689, 7170],
    [15690, 7608]
  ],
  [
    [15270, 6435],
    [15315, 5978]
  ],
  [
    [14641, 4558],
    [14072, 4897]
  ],
  [
    [8835, 6491],
    [9274, 6272]
  ],
  [
    [13714, 5122],
    [14072, 4897]
  ],
  [
    [14015, 6589],
    [14417, 6722]
  ],
  // Tropics and Wastelands: n368–n377, n484–n524, n469–n508, n623–n627, n636–n657 and n657–n665, kept as they were
  // when n560–n515 went away (the generator would draw them elsewhere), and n108–n79.
  [
    [10046, 1356],
    [10240, 1057]
  ],
  [
    [9861, 4089],
    [9369, 4235]
  ],
  [
    [15615, 5470],
    [15315, 5978]
  ],
  [
    [12727, 5309],
    [12662, 5854]
  ],
  [
    [12621, 7190],
    [13034, 7248]
  ],
  [
    [12160, 7343],
    [12416, 7655]
  ],
  [
    [12416, 7655],
    [12887, 7753]
  ],
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
  // Drawn here so the rest of the map keeps its random numbers; moved by hand to n566–n550.
  { link: [Biome.MEADOWS, Biome.TROPICAL], side: 'north' },
  // Far from Sahrak, who waits at the deepest point of the desert.
  { link: [Biome.DESERT, Biome.TROPICAL], side: 'west' }
]

export function getBiomeDefinition(biome: Biome): BiomeDefinition {
  return BIOMES.find((definition) => definition.biome === biome)!
}
