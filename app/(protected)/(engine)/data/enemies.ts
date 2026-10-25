import { Affinity } from '@/app/(protected)/(engine)/models/Affinity'
import { Archetype } from '@/app/(protected)/(engine)/models/Archetype'
import { Biome } from '@/app/(protected)/(engine)/models/Biome'
import { CombatStats } from '@/app/(protected)/(engine)/models/CombatStats'
import { DamageType } from '@/app/(protected)/(engine)/models/DamageType'
import { EnemySpecies } from '@/app/(protected)/(engine)/models/EnemySpecies'

/**
 * Catalog of enemies (names in i18n, enemies.<id>). The Meadows are complete
 * for the vertical slice; the other biomes have a provisional roster of three
 * species each, until the content of phase 6.
 */

/** Attributes of each archetype at level 1. */
const ARCHETYPE_STATS: Record<Archetype, CombatStats> = {
  [Archetype.BRUTE]: {
    maxHealth: 46,
    maxFocus: 20,
    defense: 8,
    speed: 88,
    attack: 13,
    special: 6,
    critChance: 0.05,
    critDamage: 1.5
  },
  [Archetype.AGILE]: {
    maxHealth: 32,
    maxFocus: 20,
    defense: 6,
    speed: 120,
    attack: 11,
    special: 6,
    critChance: 0.12,
    critDamage: 1.5
  },
  [Archetype.TANK]: {
    maxHealth: 60,
    maxFocus: 20,
    defense: 16,
    speed: 75,
    attack: 10,
    special: 6,
    critChance: 0.03,
    critDamage: 1.5
  },
  [Archetype.CASTER]: {
    maxHealth: 30,
    maxFocus: 40,
    defense: 6,
    speed: 100,
    attack: 6,
    special: 14,
    critChance: 0.05,
    critDamage: 1.5
  },
  [Archetype.HEALER]: {
    maxHealth: 34,
    maxFocus: 40,
    defense: 8,
    speed: 95,
    attack: 7,
    special: 12,
    critChance: 0.03,
    critDamage: 1.5
  }
}
/** Growth of the attributes per level (on the level 1 value). */
const GROWTH_PER_LEVEL = 0.11
/** Elite variants: health and the rest of the attributes. */
const ELITE_HEALTH = 1.5
const ELITE_POWER = 1.25
/** Multiplier of the attributes per New Game+ cycle (speed grows less). */
const CYCLE_POWER = 0.5
const CYCLE_SPEED = 0.1
const { WEAK, RESIST, IMMUNE, ABSORB } = Affinity
const { SLASH, PIERCE, BLUNT, FIRE, ICE, LIGHTNING, EARTH, LIGHT, DARKNESS } = DamageType

function species(
  id: string,
  biome: Biome,
  archetype: Archetype,
  skills: string[],
  affinities: EnemySpecies['affinities'],
  color: number,
  extra: Partial<EnemySpecies> = {}
): EnemySpecies {
  return { id, biome, archetype, skills, affinities, strength: 1, bars: 1, color, size: 1, ...extra }
}

/** Common enemies of each biome. */
const COMMON: EnemySpecies[] = [
  // Meadows: weak to fire.
  species('thorn-boar', Biome.MEADOWS, Archetype.BRUTE, ['claw', 'gore'], { [FIRE]: WEAK }, 0x8b5a2b),
  species(
    'road-bandit',
    Biome.MEADOWS,
    Archetype.AGILE,
    ['bite', 'rend'],
    { [FIRE]: WEAK, [DARKNESS]: RESIST },
    0x6b7280
  ),
  species(
    'wheat-spirit',
    Biome.MEADOWS,
    Archetype.CASTER,
    ['earth-bolt', 'earth-wave'],
    { [FIRE]: WEAK, [EARTH]: RESIST },
    0xe5c24a
  ),
  species(
    'hedge-sprite',
    Biome.MEADOWS,
    Archetype.HEALER,
    ['peck', 'mend', 'hex'],
    { [FIRE]: WEAK, [LIGHT]: RESIST },
    0x7bd36b
  ),
  // Forests: poisons, weak to fire.
  species(
    'shadow-wolf',
    Biome.FOREST,
    Archetype.AGILE,
    ['bite', 'lunge'],
    { [FIRE]: WEAK, [DARKNESS]: RESIST },
    0x374151
  ),
  species('rotten-ent', Biome.FOREST, Archetype.TANK, ['bash', 'harden'], { [FIRE]: WEAK, [BLUNT]: RESIST }, 0x4d3b22),
  species('weaver-spider', Biome.FOREST, Archetype.AGILE, ['bite', 'venom-bite'], { [FIRE]: WEAK }, 0x581c87),
  // Tropics: poisons and heals.
  species('jade-viper', Biome.TROPICAL, Archetype.AGILE, ['bite', 'venom-bite'], { [ICE]: WEAK }, 0x10b981),
  species('fungal-shaman', Biome.TROPICAL, Archetype.HEALER, ['peck', 'mend', 'hex'], { [FIRE]: WEAK }, 0xd946ef),
  species(
    'toxic-frog',
    Biome.TROPICAL,
    Archetype.CASTER,
    ['earth-bolt', 'earth-wave'],
    { [ICE]: WEAK, [EARTH]: RESIST },
    0x65a30d
  ),
  // Deserts: resist fire.
  species(
    'giant-scorpion',
    Biome.DESERT,
    Archetype.BRUTE,
    ['claw', 'venom-bite'],
    { [FIRE]: RESIST, [ICE]: WEAK },
    0xb45309
  ),
  species(
    'wandering-mummy',
    Biome.DESERT,
    Archetype.TANK,
    ['bash', 'harden'],
    { [FIRE]: RESIST, [LIGHT]: WEAK },
    0xd6c7a1
  ),
  species(
    'sand-worm',
    Biome.DESERT,
    Archetype.BRUTE,
    ['claw', 'gore'],
    { [FIRE]: RESIST, [EARTH]: IMMUNE, [ICE]: WEAK },
    0xc2a14d
  ),
  // Mountains: high defense, weak to blunt.
  species(
    'rock-golem',
    Biome.MOUNTAINS,
    Archetype.TANK,
    ['bash', 'harden'],
    { [BLUNT]: WEAK, [SLASH]: RESIST, [PIERCE]: RESIST },
    0x78716c
  ),
  species(
    'harpy',
    Biome.MOUNTAINS,
    Archetype.AGILE,
    ['claw', 'lunge'],
    { [LIGHTNING]: WEAK, [EARTH]: IMMUNE },
    0x9ca3af
  ),
  species(
    'renegade-dwarf',
    Biome.MOUNTAINS,
    Archetype.BRUTE,
    ['bash', 'roar'],
    { [BLUNT]: WEAK, [SLASH]: RESIST },
    0x92400e
  ),
  // Snowlands: freeze, weak to fire.
  species('yeti', Biome.SNOW, Archetype.BRUTE, ['claw', 'gore'], { [FIRE]: WEAK, [ICE]: RESIST }, 0xe2e8f0),
  species('frost-wolf', Biome.SNOW, Archetype.AGILE, ['bite', 'lunge'], { [FIRE]: WEAK, [ICE]: RESIST }, 0x93c5fd),
  species(
    'ice-wisp',
    Biome.SNOW,
    Archetype.CASTER,
    ['ice-bolt', 'ice-wave'],
    { [FIRE]: WEAK, [ICE]: ABSORB },
    0xbae6fd
  ),
  // Volcanic lands: absorb fire, weak to ice.
  species(
    'salamander',
    Biome.VOLCANIC,
    Archetype.AGILE,
    ['bite', 'fire-bolt'],
    { [FIRE]: ABSORB, [ICE]: WEAK },
    0xf97316
  ),
  species(
    'magma-elemental',
    Biome.VOLCANIC,
    Archetype.CASTER,
    ['fire-bolt', 'fire-wave'],
    { [FIRE]: ABSORB, [ICE]: WEAK },
    0xdc2626
  ),
  species(
    'young-dragon',
    Biome.VOLCANIC,
    Archetype.BRUTE,
    ['claw', 'fire-wave'],
    { [FIRE]: RESIST, [ICE]: WEAK },
    0x991b1b
  ),
  // Wastelands: darkness, weak to light.
  species(
    'ghoul',
    Biome.WASTELANDS,
    Archetype.BRUTE,
    ['claw', 'rend'],
    { [LIGHT]: WEAK, [DARKNESS]: RESIST },
    0x6b7280
  ),
  species(
    'bone-knight',
    Biome.WASTELANDS,
    Archetype.TANK,
    ['bash', 'harden'],
    { [LIGHT]: WEAK, [DARKNESS]: RESIST, [PIERCE]: RESIST },
    0xd1d5db
  ),
  species(
    'devourer',
    Biome.WASTELANDS,
    Archetype.AGILE,
    ['bite', 'darkness-bolt'],
    { [LIGHT]: WEAK, [DARKNESS]: ABSORB },
    0x3f1d4f
  ),
  // Abyss: the strongest, few weaknesses.
  species(
    'crucible-horror',
    Biome.ABYSS,
    Archetype.BRUTE,
    ['claw', 'slam'],
    { [DARKNESS]: RESIST, [FIRE]: RESIST, [LIGHT]: WEAK },
    0x7f1d1d
  ),
  species(
    'castle-warden',
    Biome.ABYSS,
    Archetype.TANK,
    ['bash', 'harden'],
    { [SLASH]: RESIST, [PIERCE]: RESIST, [LIGHTNING]: WEAK },
    0x312e81
  ),
  species(
    'abyss-eye',
    Biome.ABYSS,
    Archetype.CASTER,
    ['darkness-bolt', 'darkness-wave'],
    { [DARKNESS]: ABSORB, [LIGHT]: WEAK },
    0x4c1d95
  )
]
/** Named bosses: the camp bosses of the Meadows, the captors, the Seals and Crisol. */
const BOSSES: EnemySpecies[] = [
  species('boar-matriarch', Biome.MEADOWS, Archetype.BRUTE, ['claw', 'gore', 'roar'], { [FIRE]: WEAK }, 0x6b3f1d, {
    strength: 4.2,
    size: 1.6
  }),
  species('bandit-chief', Biome.MEADOWS, Archetype.AGILE, ['bite', 'rend', 'lunge'], { [FIRE]: WEAK }, 0x4b5563, {
    strength: 2.6,
    bars: 2,
    size: 1.4
  }),
  species(
    'morgrath',
    Biome.FOREST,
    Archetype.CASTER,
    ['darkness-bolt', 'earth-wave', 'hex'],
    { [FIRE]: WEAK, [DARKNESS]: ABSORB },
    0x365314,
    {
      strength: 4,
      bars: 2,
      size: 1.8
    }
  ),
  species(
    'sahrak',
    Biome.DESERT,
    Archetype.BRUTE,
    ['claw', 'venom-bite', 'slam'],
    { [FIRE]: IMMUNE, [ICE]: WEAK },
    0x9a3412,
    {
      strength: 4.4,
      bars: 2,
      size: 2
    }
  ),
  species(
    'vorneth',
    Biome.SNOW,
    Archetype.CASTER,
    ['ice-bolt', 'ice-wave', 'claw'],
    { [ICE]: ABSORB, [FIRE]: WEAK },
    0x7dd3fc,
    {
      strength: 4.6,
      bars: 2,
      size: 2.1
    }
  ),
  species(
    'ignaroth',
    Biome.VOLCANIC,
    Archetype.CASTER,
    ['fire-bolt', 'fire-wave', 'roar'],
    { [FIRE]: ABSORB, [ICE]: WEAK },
    0xb91c1c,
    {
      strength: 4.8,
      bars: 2,
      size: 2.1
    }
  ),
  species(
    'xalqui',
    Biome.TROPICAL,
    Archetype.AGILE,
    ['venom-bite', 'lunge', 'earth-wave'],
    { [ICE]: WEAK, [EARTH]: RESIST },
    0x059669,
    {
      strength: 4.4,
      bars: 2,
      size: 2
    }
  ),
  species(
    'colossus',
    Biome.MOUNTAINS,
    Archetype.TANK,
    ['bash', 'slam', 'harden'],
    { [BLUNT]: WEAK, [SLASH]: RESIST, [PIERCE]: RESIST, [EARTH]: IMMUNE },
    0x44403c,
    {
      strength: 4.6,
      bars: 2,
      size: 2.3
    }
  ),
  species(
    'vael',
    Biome.WASTELANDS,
    Archetype.BRUTE,
    ['rend', 'darkness-wave', 'roar'],
    { [LIGHT]: WEAK, [DARKNESS]: ABSORB },
    0x1f2937,
    {
      strength: 4.8,
      bars: 2,
      size: 2
    }
  ),
  species(
    'crisol',
    Biome.ABYSS,
    Archetype.CASTER,
    ['fire-bolt', 'darkness-wave', 'fire-wave', 'slam'],
    { [DARKNESS]: RESIST, [FIRE]: RESIST },
    0xff2a2a,
    {
      strength: 5.5,
      bars: 3,
      size: 2.6
    }
  )
]
/**
 * The provisional camp bosses and sanctuary guardians of the other biomes: a
 * stronger version of one of the common species ("champion" and "guardian").
 */
const CHAMPION_STRENGTH = 2.8
const GUARDIAN_STRENGTH = 4.5
const VARIANTS: EnemySpecies[] = COMMON.flatMap((common) => [
  { ...common, id: `${common.id}-champion`, strength: CHAMPION_STRENGTH, size: 1.5 },
  { ...common, id: `${common.id}-guardian`, strength: GUARDIAN_STRENGTH, size: 1.35 }
])

export const ENEMIES: EnemySpecies[] = [...COMMON, ...BOSSES, ...VARIANTS]

const ENEMIES_BY_ID = new Map(ENEMIES.map((enemy) => [enemy.id, enemy]))

/** Camp bosses with their own species; the rest use a champion of their biome. */
export const BOSS_SPECIES: Record<string, string> = {
  'meadows-miniboss-1': 'boar-matriarch',
  'meadows-miniboss-2': 'bandit-chief',
  morgrath: 'morgrath',
  sahrak: 'sahrak',
  vorneth: 'vorneth',
  ignaroth: 'ignaroth',
  xalqui: 'xalqui',
  colossus: 'colossus',
  vael: 'vael'
}

export const FINAL_BOSS_SPECIES = 'crisol'

export function getSpecies(id: string): EnemySpecies {
  const found = ENEMIES_BY_ID.get(id)

  if (!found) {
    throw new Error(`Unknown enemy ${id}`)
  }

  return found
}

/** The common species of a biome. */
export function getBiomeSpecies(biome: Biome): EnemySpecies[] {
  return COMMON.filter((common) => common.biome === biome)
}

/** The species a provisional variant comes from (e.g. thorn-boar for thorn-boar-champion), or null. */
export function getVariantBase(id: string): { baseId: string; variant: 'champion' | 'guardian' } | null {
  const match = /^(.*)-(champion|guardian)$/.exec(id)

  return match ? { baseId: match[1], variant: match[2] as 'champion' | 'guardian' } : null
}

/**
 * Attributes of an enemy: those of its archetype grown with the level, times
 * its strength (mostly health: bosses last long without killing in one hit),
 * the elite variant and the New Game+ cycle.
 */
export function getEnemyStats(speciesId: string, level: number, elite = false, cycle = 0): CombatStats {
  const { archetype, strength } = getSpecies(speciesId)
  const base = ARCHETYPE_STATS[archetype]
  const levelFactor = 1 + GROWTH_PER_LEVEL * (level - 1)
  const power = (1 + (strength - 1) * 0.3) * (elite ? ELITE_POWER : 1) * (1 + CYCLE_POWER * cycle)
  const health = strength * (elite ? ELITE_HEALTH : 1) * (1 + CYCLE_POWER * cycle)

  return {
    maxHealth: Math.round(base.maxHealth * levelFactor * health),
    maxFocus: base.maxFocus,
    defense: Math.round(base.defense * levelFactor * power),
    speed: Math.round(base.speed * (1 + 0.01 * (level - 1)) * (1 + CYCLE_SPEED * cycle)),
    attack: Math.round(base.attack * levelFactor * power),
    special: Math.round(base.special * levelFactor * power),
    critChance: base.critChance,
    critDamage: base.critDamage
  }
}

/** Experience and gold an enemy gives when it falls. */
export function getEnemyRewards(
  speciesId: string,
  level: number,
  elite = false,
  cycle = 0
): { xp: number; gold: number } {
  const { strength, bars } = getSpecies(speciesId)
  const boss = strength > 1
  const multiplier = (elite ? 2 : 1) * (boss ? strength * bars * 2 : 1) * (1 + 0.75 * cycle)

  return {
    xp: Math.round((4 + 2.2 * level) * multiplier),
    gold: Math.round((boss ? 80 + 5 * level * bars : 2 + 0.35 * level) * (elite ? 2 : 1) * (1 + 0.75 * cycle))
  }
}
