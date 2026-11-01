import { Biome } from '@/app/(protected)/(engine)/models/Biome'
import { hashText } from '@/app/(protected)/(engine)/utils/encounters'
import { createRandom, Random } from '@/app/(protected)/(engine)/utils/random'

/**
 * What the battle scenery of each biome is made of, and the plan of the scene
 * of each point of the map: a pure choice from its id (no drawing here), so
 * the same point always looks the same and no two points look alike.
 */

export type ParticleKind = 'pollen' | 'fireflies' | 'snow' | 'embers' | 'ash' | 'dust' | 'leaves' | 'motes' | 'mist'

/** The silhouette of a band of land on the horizon. */
export type RangeKind =
  'hills' | 'mountains' | 'peaks' | 'crags' | 'pines' | 'jungle' | 'dunes' | 'mesas' | 'volcanoes' | 'spires' | 'drifts'

/** Something big in the distance that gives a place its character. */
export type LandmarkKind =
  | 'tower'
  | 'windmill'
  | 'castle'
  | 'bigTree'
  | 'arch'
  | 'pyramid'
  | 'obelisk'
  | 'floatingRocks'
  | 'iceSpire'
  | 'waterfall'
  | 'lavaFall'
  | 'skullRock'

/** Details drawn on the ground (besides the biome's scattered tufts, flowers and pebbles). */
export type GroundFeature = 'stones' | 'ripples' | 'cracks' | 'lava' | 'drifts' | 'runes' | 'puddles'

export type CloudKind = 'puffy' | 'wisps' | 'smoke'

/** The light of a battle: the sky, a color grade over everything, the haze of the distance, a glow and what floats in the air. */
export interface Mood {
  /** Top and bottom (horizon) of the sky. */
  sky: [number, number]
  celestial: 'sun' | 'moon' | 'eclipse' | 'none'
  stars?: boolean
  aurora?: boolean
  /** Multiplied over the scene (white leaves it as painted) and how strongly. */
  grade: number
  gradeAlpha: number
  haze: number
  light: number
  lightAlpha: number
  particles: ParticleKind
  /** Color of the particles, when it is not the kind's own. */
  particleColor?: number
  /** Light shafts falling from the top. */
  rays?: boolean
}

export interface BiomeLook {
  /** The options for each band of land: far, middle and near. */
  ranges: [RangeKind[], RangeKind[], RangeKind[]]
  /** Colors of the far, middle and near bands. */
  land: [number, number, number]
  ground: number
  groundLight: number
  groundDark: number
  /** The floor the fighters stand on: a trail crossing the field from side to side. */
  floor: number
  /** Stone, wood and an accent (roofs, flags, runes) of the landmarks. */
  stone: number
  wood: number
  accent: number
  /** Something that glows in the biome (lava, runes, toxic puddles). */
  glow?: number
  /** Snow on the tips of the peaks. */
  snowCaps?: boolean
  /** Landmarks it can have (`null`: an open horizon). */
  landmarks: (LandmarkKind | null)[]
  groundFeatures: GroundFeature[]
  clouds: CloudKind
  /** Whether the foreground is grass (otherwise rocks). */
  grassy: boolean
}

export const LOOKS: Record<Biome, BiomeLook> = {
  [Biome.MEADOWS]: {
    ranges: [['mountains', 'hills'], ['hills'], ['hills']],
    land: [0x8fb8c8, 0x7cc35a, 0x5fae3e],
    ground: 0x6cbf45,
    groundLight: 0x9edb74,
    groundDark: 0x3f8a2e,
    floor: 0xd9a866,
    stone: 0xc8bca8,
    wood: 0x9a6a40,
    accent: 0xd7263d,
    landmarks: ['windmill', 'tower', 'castle', 'bigTree', null],
    groundFeatures: ['stones', 'puddles'],
    clouds: 'puffy',
    grassy: true
  },
  [Biome.FOREST]: {
    ranges: [['mountains', 'hills'], ['pines', 'hills'], ['pines']],
    land: [0x6a9a98, 0x2f7a3a, 0x1f6b34],
    ground: 0x3f8f3e,
    groundLight: 0x6cbf62,
    groundDark: 0x1f4f2a,
    floor: 0xb08a5a,
    stone: 0x9aa494,
    wood: 0x6b4423,
    accent: 0xe0a030,
    landmarks: ['bigTree', 'tower', 'waterfall', null],
    groundFeatures: ['stones', 'puddles'],
    clouds: 'puffy',
    grassy: true
  },
  [Biome.TROPICAL]: {
    ranges: [['peaks', 'volcanoes'], ['jungle'], ['jungle', 'hills']],
    land: [0x4aa89a, 0x2faa6a, 0x13977c],
    ground: 0x52b85a,
    groundLight: 0x8fe08a,
    groundDark: 0x1f7a4a,
    floor: 0xe0c48a,
    stone: 0xb8a888,
    wood: 0x7a5030,
    accent: 0xff4fb0,
    landmarks: ['waterfall', 'bigTree', 'obelisk', null],
    groundFeatures: ['puddles', 'stones'],
    clouds: 'puffy',
    grassy: true
  },
  [Biome.DESERT]: {
    ranges: [['mesas', 'dunes'], ['dunes', 'mesas'], ['dunes']],
    land: [0xe8b088, 0xeab868, 0xdca448],
    ground: 0xe6b25a,
    groundLight: 0xf8d890,
    groundDark: 0xb07a32,
    floor: 0xf0cc88,
    stone: 0xe0c08a,
    wood: 0x8a6a40,
    accent: 0x3a8ad0,
    landmarks: ['pyramid', 'arch', 'obelisk', null],
    groundFeatures: ['ripples', 'stones'],
    clouds: 'wisps',
    grassy: false
  },
  [Biome.MOUNTAINS]: {
    ranges: [['peaks'], ['peaks', 'crags'], ['crags', 'hills']],
    land: [0xa8b4d0, 0x8a92a4, 0x6c7382],
    ground: 0x8a929c,
    groundLight: 0xb4bac4,
    groundDark: 0x5c626e,
    floor: 0xb59c78,
    stone: 0xb0b4bc,
    wood: 0x6b4a30,
    accent: 0x3a6ad0,
    snowCaps: true,
    landmarks: ['castle', 'tower', 'waterfall', null],
    groundFeatures: ['stones', 'cracks'],
    clouds: 'puffy',
    grassy: false
  },
  [Biome.SNOW]: {
    ranges: [['peaks'], ['pines', 'peaks'], ['drifts']],
    land: [0xbccbe8, 0x8fa8c8, 0xe8f0fa],
    ground: 0xdfeaf6,
    groundLight: 0xffffff,
    groundDark: 0xa0b4d0,
    floor: 0xb4c6e0,
    stone: 0xc8d4e4,
    wood: 0x6b4a30,
    accent: 0x4ac0e0,
    snowCaps: true,
    landmarks: ['iceSpire', 'castle', null],
    groundFeatures: ['drifts', 'stones', 'puddles'],
    clouds: 'puffy',
    grassy: false
  },
  [Biome.VOLCANIC]: {
    ranges: [['volcanoes'], ['crags'], ['crags']],
    land: [0x3e1c20, 0x4a2420, 0x3a1a16],
    ground: 0x5a2418,
    groundLight: 0x8c3a20,
    groundDark: 0x2a0e0a,
    floor: 0x4a2a24,
    stone: 0x5a4040,
    wood: 0x3a2018,
    accent: 0xff8a1a,
    glow: 0xff8a1a,
    landmarks: ['lavaFall', 'tower', null],
    groundFeatures: ['lava', 'cracks', 'stones'],
    clouds: 'smoke',
    grassy: false
  },
  [Biome.WASTELANDS]: {
    ranges: [['mesas', 'crags'], ['crags'], ['hills']],
    land: [0x8a7a96, 0x6a5a70, 0x5a4560],
    ground: 0x6a5a6a,
    groundLight: 0x8f7f92,
    groundDark: 0x3a2e40,
    floor: 0x8a7a70,
    stone: 0x9a8e9a,
    wood: 0x5a4a40,
    accent: 0x9aff70,
    glow: 0x9aff70,
    landmarks: ['skullRock', 'tower', 'arch', null],
    groundFeatures: ['cracks', 'stones', 'puddles'],
    clouds: 'wisps',
    grassy: true
  },
  [Biome.ABYSS]: {
    ranges: [['spires'], ['crags', 'spires'], ['crags']],
    land: [0x4a2a6a, 0x3a1a56, 0x2b0c3d],
    ground: 0x341048,
    groundLight: 0x5a2a80,
    groundDark: 0x14061e,
    floor: 0x4a3a62,
    stone: 0x3a2a50,
    wood: 0x2a1a3a,
    accent: 0xc070ff,
    glow: 0xc070ff,
    landmarks: ['floatingRocks', 'obelisk', 'castle', null],
    groundFeatures: ['runes', 'cracks', 'stones'],
    clouds: 'wisps',
    grassy: false
  }
}

const MORNING: Mood = {
  sky: [0x5fb8f0, 0xd6f0ff],
  celestial: 'sun',
  grade: 0xffffff,
  gradeAlpha: 0,
  haze: 0xfff1d6,
  light: 0xffd9a0,
  lightAlpha: 0.35,
  particles: 'pollen'
}

/** Two or three moods per biome; each point of the map always gets the same one. */
export const MOODS: Record<Biome, Mood[]> = {
  [Biome.MEADOWS]: [
    MORNING,
    {
      sky: [0x6a5aa8, 0xffb070],
      celestial: 'sun',
      grade: 0xffb784,
      gradeAlpha: 0.21,
      haze: 0xffb070,
      light: 0xff9a50,
      lightAlpha: 0.45,
      particles: 'pollen'
    },
    {
      sky: [0x141a48, 0x4a5a98],
      celestial: 'moon',
      stars: true,
      grade: 0x5a6aa8,
      gradeAlpha: 0.36,
      haze: 0x34406e,
      light: 0x9fb4ff,
      lightAlpha: 0.2,
      particles: 'fireflies'
    }
  ],
  [Biome.FOREST]: [
    {
      sky: [0x6cc0e8, 0xd8f0e0],
      celestial: 'sun',
      grade: 0xd8ffd0,
      gradeAlpha: 0.09,
      haze: 0xbfe0c0,
      light: 0xfff0b0,
      lightAlpha: 0.3,
      particles: 'leaves',
      rays: true
    },
    {
      sky: [0x9ab0c0, 0xdde6ea],
      celestial: 'none',
      grade: 0xb8c8d0,
      gradeAlpha: 0.18,
      haze: 0xc8d6dc,
      light: 0xe0f0ff,
      lightAlpha: 0.15,
      particles: 'mist'
    },
    {
      sky: [0x0e1630, 0x2a3a5a],
      celestial: 'moon',
      stars: true,
      grade: 0x4a5a8a,
      gradeAlpha: 0.33,
      haze: 0x2a3a4a,
      light: 0xb0d0ff,
      lightAlpha: 0.15,
      particles: 'fireflies'
    }
  ],
  [Biome.TROPICAL]: [
    {
      sky: [0x3fb0f0, 0xbff0e8],
      celestial: 'sun',
      grade: 0xfff4d0,
      gradeAlpha: 0.09,
      haze: 0xe0f0d0,
      light: 0xfff0b0,
      lightAlpha: 0.3,
      particles: 'mist',
      rays: true
    },
    {
      sky: [0x7a4a9a, 0xff9a6a],
      celestial: 'sun',
      grade: 0xff9a7a,
      gradeAlpha: 0.21,
      haze: 0xd08070,
      light: 0xff8a50,
      lightAlpha: 0.35,
      particles: 'fireflies'
    }
  ],
  [Biome.DESERT]: [
    {
      sky: [0x4aa8e8, 0xffe8c0],
      celestial: 'sun',
      grade: 0xfff0d0,
      gradeAlpha: 0.12,
      haze: 0xffe8c0,
      light: 0xffffff,
      lightAlpha: 0.3,
      particles: 'dust'
    },
    {
      sky: [0x8a4a6a, 0xffa060],
      celestial: 'sun',
      grade: 0xff9a6a,
      gradeAlpha: 0.21,
      haze: 0xff9a60,
      light: 0xff7a40,
      lightAlpha: 0.45,
      particles: 'dust'
    },
    {
      sky: [0x16163e, 0x4a4a80],
      celestial: 'moon',
      stars: true,
      grade: 0x4a5a9a,
      gradeAlpha: 0.33,
      haze: 0x3a4a7a,
      light: 0xc0d0ff,
      lightAlpha: 0.2,
      particles: 'dust'
    }
  ],
  [Biome.MOUNTAINS]: [
    {
      sky: [0x5aa0e0, 0xdde8f5],
      celestial: 'sun',
      grade: 0xe8f0ff,
      gradeAlpha: 0.09,
      haze: 0xdde8f5,
      light: 0xffffff,
      lightAlpha: 0.25,
      particles: 'mist'
    },
    {
      sky: [0x5a6478, 0xa8b0c0],
      celestial: 'none',
      grade: 0x8090a8,
      gradeAlpha: 0.24,
      haze: 0xa0a8b8,
      light: 0xd0e0ff,
      lightAlpha: 0.1,
      particles: 'snow'
    }
  ],
  [Biome.SNOW]: [
    {
      sky: [0x7ab8f0, 0xf0f6ff],
      celestial: 'sun',
      grade: 0xe0ecff,
      gradeAlpha: 0.12,
      haze: 0xf0f6ff,
      light: 0xffffff,
      lightAlpha: 0.25,
      particles: 'snow'
    },
    {
      sky: [0x8a9cbf, 0xd8e4f4],
      celestial: 'none',
      grade: 0x9ab0d8,
      gradeAlpha: 0.24,
      haze: 0xc8d8f0,
      light: 0xd0e0ff,
      lightAlpha: 0.15,
      particles: 'snow'
    },
    {
      sky: [0x0a1434, 0x2a4070],
      celestial: 'moon',
      stars: true,
      aurora: true,
      grade: 0x5070b0,
      gradeAlpha: 0.3,
      haze: 0x3a5080,
      light: 0x80ffd0,
      lightAlpha: 0.3,
      particles: 'snow'
    }
  ],
  [Biome.VOLCANIC]: [
    {
      sky: [0x3a0e14, 0xff6a3a],
      celestial: 'none',
      grade: 0xff9070,
      gradeAlpha: 0.18,
      haze: 0xff6a3a,
      light: 0xff5a20,
      lightAlpha: 0.4,
      particles: 'embers'
    },
    {
      sky: [0x2a1a1a, 0x8a6050],
      celestial: 'sun',
      grade: 0xa08070,
      gradeAlpha: 0.21,
      haze: 0x806050,
      light: 0xff7a40,
      lightAlpha: 0.25,
      particles: 'ash'
    }
  ],
  [Biome.WASTELANDS]: [
    {
      sky: [0x6a6a5a, 0xc8ccaa],
      celestial: 'sun',
      grade: 0xb0b8a0,
      gradeAlpha: 0.21,
      haze: 0xa8b098,
      light: 0xd0ffb0,
      lightAlpha: 0.15,
      particles: 'ash'
    },
    {
      sky: [0x1e2a1e, 0x7a9468],
      celestial: 'moon',
      stars: true,
      grade: 0x90c080,
      gradeAlpha: 0.21,
      haze: 0x8aa070,
      light: 0x9aff70,
      lightAlpha: 0.2,
      particles: 'motes',
      particleColor: 0x9aff70
    }
  ],
  [Biome.ABYSS]: [
    {
      sky: [0x14061e, 0x80203e],
      celestial: 'eclipse',
      stars: true,
      grade: 0xc06080,
      gradeAlpha: 0.21,
      haze: 0x601830,
      light: 0xff3040,
      lightAlpha: 0.35,
      particles: 'embers'
    },
    {
      sky: [0x0c0620, 0x4a2a80],
      celestial: 'moon',
      stars: true,
      grade: 0x6040a0,
      gradeAlpha: 0.24,
      haze: 0x302050,
      light: 0xb070ff,
      lightAlpha: 0.3,
      particles: 'motes',
      particleColor: 0xb070ff
    }
  ]
}

/** The scene of one point of the map. */
export interface LandscapePlan {
  mood: Mood
  /** Index of the mood among the biome's (to tell scenes apart). */
  moodIndex: number
  /** Far, middle and near bands of land. */
  ranges: [RangeKind, RangeKind, RangeKind]
  landmark: { kind: LandmarkKind; x: number; size: number } | null
  groundFeatures: GroundFeature[]
  clouds: number
  /** Where the sun or the moon is: a share of the width, and how high (0 high, 1 low). */
  celestial: { x: number; y: number }
  lightFromLeft: boolean
  /** Shifts the colors of the land towards lighter (positive) or darker (negative), from -1 to 1. */
  shade: number
}

/** The scene of the point with this id in this biome: the same every time, different from its neighbours. */
export function planLandscape(seed: string, biome: Biome): LandscapePlan {
  const random = createRandom(hashText(`${seed}:landscape`))
  const look = LOOKS[biome]
  const moods = MOODS[biome]
  // Its own stream, so adding options to the plan never changes the mood of a point.
  const moodIndex = Math.floor(createRandom(hashText(`${seed}:mood`))() * moods.length)
  const landmark = pick(random, look.landmarks)
  const celestial = { x: 0.12 + random() * 0.76, y: random() }
  const features = look.groundFeatures.filter(() => random() < 0.6)

  return {
    mood: moods[moodIndex],
    moodIndex,
    ranges: [pick(random, look.ranges[0]), pick(random, look.ranges[1]), pick(random, look.ranges[2])],
    landmark: landmark && {
      kind: landmark,
      // Away from the middle, where it would hide behind the fighters' heads.
      x: random() < 0.5 ? 0.12 + random() * 0.26 : 0.62 + random() * 0.26,
      size: 0.8 + random() * 0.4
    },
    groundFeatures: features.length ? features : [look.groundFeatures[0]],
    clouds: look.clouds === 'smoke' ? 2 + Math.floor(random() * 3) : 1 + Math.floor(random() * 5),
    celestial,
    lightFromLeft: celestial.x < 0.5,
    shade: random() * 2 - 1
  }
}

function pick<T>(random: Random, options: readonly T[]): T {
  return options[Math.floor(random() * options.length)]
}
