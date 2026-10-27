import { Affinity } from '@/app/(protected)/(engine)/models/Affinity'
import { Archetype } from '@/app/(protected)/(engine)/models/Archetype'
import { Biome } from '@/app/(protected)/(engine)/models/Biome'
import { CombatStats } from '@/app/(protected)/(engine)/models/CombatStats'
import { DamageType } from '@/app/(protected)/(engine)/models/DamageType'
import { EnemySpecies } from '@/app/(protected)/(engine)/models/EnemySpecies'

/**
 * Catalog of enemies (names in i18n, enemies.<id>): nine species per biome
 * (four common, three uncommon and two rare) and the 52 bosses: 22 mini
 * bosses, 4 captors, 3 Seals, 12 sanctuary guardians, 10 reliquary wardens
 * and Crisol.
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
const CYCLE_POWER = 0.25
const CYCLE_SPEED = 0.1
/** How much of the gap to the scale of the last biome the first ones close in New Game+ (0..1). */
const CYCLE_CATCH_UP = 0.7
/**
 * Health and power of the enemies of each biome on top of their level: the
 * party grows from Kael alone to five heroes, and the fights grow with it.
 */
const BIOME_HEALTH: Record<Biome, number> = {
  [Biome.MEADOWS]: 1,
  [Biome.FOREST]: 1,
  [Biome.TROPICAL]: 2.6,
  [Biome.DESERT]: 2.6,
  [Biome.MOUNTAINS]: 5,
  [Biome.SNOW]: 5.5,
  [Biome.VOLCANIC]: 8,
  [Biome.WASTELANDS]: 12,
  [Biome.ABYSS]: 14
}
const BIOME_POWER: Record<Biome, number> = {
  [Biome.MEADOWS]: 1,
  [Biome.FOREST]: 1,
  [Biome.TROPICAL]: 1.8,
  [Biome.DESERT]: 1.8,
  [Biome.MOUNTAINS]: 2.7,
  [Biome.SNOW]: 2.8,
  [Biome.VOLCANIC]: 3.4,
  [Biome.WASTELANDS]: 4.3,
  [Biome.ABYSS]: 4.7
}
/** A lone boss takes this power of the biome scale (a group of commons takes all of it). */
const BOSS_BIOME_SCALE = 0.9
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
  return { id, biome, archetype, skills, affinities, strength: 1, bars: 1, rarity: 'common', color, size: 1, ...extra }
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
  ),
  // The rest of each roster: uncommon and rare species.
  species('field-rat', Biome.MEADOWS, Archetype.AGILE, ['bite', 'rend'], { [FIRE]: WEAK }, 0x9c8a6b, {
    rarity: 'uncommon'
  }),
  species(
    'scarecrow',
    Biome.MEADOWS,
    Archetype.TANK,
    ['bash', 'harden'],
    { [FIRE]: WEAK, [PIERCE]: RESIST },
    0xc9a227,
    { rarity: 'uncommon' }
  ),
  species('meadow-wasp', Biome.MEADOWS, Archetype.AGILE, ['bite', 'sting'], { [FIRE]: WEAK, [ICE]: WEAK }, 0xfacc15, {
    rarity: 'uncommon'
  }),
  species(
    'bandit-archer',
    Biome.MEADOWS,
    Archetype.AGILE,
    ['arrow', 'impale'],
    { [FIRE]: WEAK, [DARKNESS]: RESIST },
    0x4b5563,
    { rarity: 'rare' }
  ),
  species(
    'giant-toad',
    Biome.MEADOWS,
    Archetype.BRUTE,
    ['bash', 'venom-bite'],
    { [FIRE]: WEAK, [EARTH]: RESIST },
    0x4d7c0f,
    { rarity: 'rare' }
  ),
  species(
    'thorn-dryad',
    Biome.FOREST,
    Archetype.HEALER,
    ['peck', 'mend', 'chorus'],
    { [FIRE]: WEAK, [EARTH]: RESIST },
    0x65a30d
  ),
  species(
    'bog-wight',
    Biome.FOREST,
    Archetype.CASTER,
    ['darkness-bolt', 'curse'],
    { [FIRE]: WEAK, [LIGHT]: WEAK, [DARKNESS]: RESIST },
    0x334155,
    { rarity: 'uncommon' }
  ),
  species('moss-bear', Biome.FOREST, Archetype.BRUTE, ['claw', 'crush', 'roar'], { [FIRE]: WEAK }, 0x3f6212, {
    rarity: 'uncommon'
  }),
  species('forest-goblin', Biome.FOREST, Archetype.AGILE, ['bite', 'sting'], { [FIRE]: WEAK }, 0x84cc16, {
    rarity: 'uncommon'
  }),
  species(
    'cursed-stag',
    Biome.FOREST,
    Archetype.BRUTE,
    ['bash', 'gore', 'impale'],
    { [FIRE]: WEAK, [DARKNESS]: RESIST },
    0x57534e,
    { rarity: 'rare' }
  ),
  species(
    'creeping-vine',
    Biome.FOREST,
    Archetype.TANK,
    ['bash', 'web', 'harden'],
    { [FIRE]: WEAK, [EARTH]: RESIST },
    0x166534,
    { rarity: 'rare' }
  ),
  species('jungle-panther', Biome.TROPICAL, Archetype.AGILE, ['claw', 'pounce', 'rend'], { [ICE]: WEAK }, 0x1c1917),
  species(
    'giant-mosquito',
    Biome.TROPICAL,
    Archetype.AGILE,
    ['bite', 'sting', 'venom-bite'],
    { [ICE]: WEAK, [FIRE]: WEAK },
    0x7c2d12,
    { rarity: 'uncommon' }
  ),
  species(
    'carnivorous-plant',
    Biome.TROPICAL,
    Archetype.TANK,
    ['bite', 'spore-cloud'],
    { [FIRE]: WEAK, [EARTH]: RESIST },
    0xbe123c,
    { rarity: 'uncommon' }
  ),
  species(
    'lizard-warrior',
    Biome.TROPICAL,
    Archetype.BRUTE,
    ['arrow', 'impale', 'war-cry'],
    { [ICE]: WEAK },
    0x15803d,
    { rarity: 'uncommon' }
  ),
  species(
    'mangrove-croc',
    Biome.TROPICAL,
    Archetype.TANK,
    ['bite', 'crush', 'harden'],
    { [ICE]: WEAK, [PIERCE]: RESIST },
    0x365314,
    { rarity: 'rare' }
  ),
  species(
    'tribal-witch',
    Biome.TROPICAL,
    Archetype.CASTER,
    ['lightning-bolt', 'curse', 'hex'],
    { [ICE]: WEAK, [DARKNESS]: RESIST },
    0xa16207,
    { rarity: 'rare' }
  ),
  species(
    'dune-raider',
    Biome.DESERT,
    Archetype.AGILE,
    ['claw', 'pounce', 'sandstorm'],
    { [ICE]: WEAK, [FIRE]: RESIST },
    0xd97706
  ),
  species(
    'sun-priest',
    Biome.DESERT,
    Archetype.HEALER,
    ['light-bolt', 'mend', 'chorus'],
    { [DARKNESS]: WEAK, [FIRE]: RESIST, [LIGHT]: RESIST },
    0xfde047,
    { rarity: 'uncommon' }
  ),
  species(
    'desert-djinn',
    Biome.DESERT,
    Archetype.CASTER,
    ['fire-bolt', 'fire-wave', 'sandstorm'],
    { [ICE]: WEAK, [FIRE]: ABSORB },
    0xf59e0b,
    { rarity: 'uncommon' }
  ),
  species('vulture', Biome.DESERT, Archetype.AGILE, ['peck', 'rend'], { [ICE]: WEAK, [LIGHTNING]: WEAK }, 0x78350f, {
    rarity: 'uncommon'
  }),
  species(
    'tomb-guardian',
    Biome.DESERT,
    Archetype.TANK,
    ['bash', 'bulwark'],
    { [LIGHT]: WEAK, [FIRE]: RESIST, [SLASH]: RESIST },
    0xa8a29e,
    { rarity: 'rare' }
  ),
  species(
    'scarab-swarm',
    Biome.DESERT,
    Archetype.BRUTE,
    ['bite', 'spore-cloud'],
    { [ICE]: WEAK, [FIRE]: RESIST },
    0x0f766e,
    { rarity: 'rare' }
  ),
  species(
    'mountain-troll',
    Biome.MOUNTAINS,
    Archetype.BRUTE,
    ['bash', 'crush', 'roar'],
    { [BLUNT]: WEAK, [FIRE]: WEAK },
    0x57534e
  ),
  species(
    'storm-eagle',
    Biome.MOUNTAINS,
    Archetype.AGILE,
    ['peck', 'lightning-bolt'],
    { [EARTH]: IMMUNE, [ICE]: WEAK, [LIGHTNING]: RESIST },
    0xe7e5e4,
    { rarity: 'uncommon' }
  ),
  species(
    'crystal-sprite',
    Biome.MOUNTAINS,
    Archetype.CASTER,
    ['light-bolt', 'light-wave'],
    { [BLUNT]: WEAK, [DARKNESS]: WEAK, [LIGHT]: ABSORB },
    0xa5f3fc,
    { rarity: 'uncommon' }
  ),
  species(
    'dwarf-runepriest',
    Biome.MOUNTAINS,
    Archetype.HEALER,
    ['earth-bolt', 'mend', 'bulwark'],
    { [BLUNT]: WEAK, [EARTH]: RESIST },
    0xb45309,
    { rarity: 'uncommon' }
  ),
  species(
    'cave-bat',
    Biome.MOUNTAINS,
    Archetype.AGILE,
    ['bite', 'shriek'],
    { [LIGHT]: WEAK, [EARTH]: IMMUNE },
    0x44403c,
    { rarity: 'rare' }
  ),
  species(
    'stone-basilisk',
    Biome.MOUNTAINS,
    Archetype.TANK,
    ['bite', 'quake'],
    { [BLUNT]: WEAK, [SLASH]: RESIST, [PIERCE]: RESIST },
    0x6b7280,
    { rarity: 'rare' }
  ),
  species(
    'snow-troll',
    Biome.SNOW,
    Archetype.BRUTE,
    ['bash', 'crush', 'frost-breath'],
    { [FIRE]: WEAK, [ICE]: RESIST },
    0xcbd5e1
  ),
  species(
    'ice-wraith',
    Biome.SNOW,
    Archetype.CASTER,
    ['ice-bolt', 'soul-drain'],
    { [FIRE]: WEAK, [LIGHT]: WEAK, [ICE]: ABSORB },
    0x93c5fd,
    { rarity: 'uncommon' }
  ),
  species(
    'frost-giant',
    Biome.SNOW,
    Archetype.TANK,
    ['bash', 'crush', 'quake', 'harden'],
    { [FIRE]: WEAK, [ICE]: IMMUNE },
    0x7dd3fc,
    { rarity: 'uncommon' }
  ),
  species(
    'polar-bear',
    Biome.SNOW,
    Archetype.BRUTE,
    ['claw', 'blood-howl'],
    { [FIRE]: WEAK, [ICE]: RESIST },
    0xf8fafc,
    { rarity: 'uncommon' }
  ),
  species(
    'snow-harpy',
    Biome.SNOW,
    Archetype.AGILE,
    ['peck', 'frost-breath'],
    { [FIRE]: WEAK, [LIGHTNING]: WEAK, [ICE]: RESIST },
    0xe0f2fe,
    { rarity: 'rare' }
  ),
  species(
    'frozen-shaman',
    Biome.SNOW,
    Archetype.HEALER,
    ['ice-bolt', 'mend', 'chorus'],
    { [FIRE]: WEAK, [ICE]: RESIST },
    0x38bdf8,
    { rarity: 'rare' }
  ),
  species(
    'fire-imp',
    Biome.VOLCANIC,
    Archetype.AGILE,
    ['fire-bolt', 'lunge'],
    { [ICE]: WEAK, [FIRE]: ABSORB },
    0xfb923c
  ),
  species(
    'lava-golem',
    Biome.VOLCANIC,
    Archetype.TANK,
    ['bash', 'crush', 'harden', 'fire-wave'],
    { [ICE]: WEAK, [FIRE]: ABSORB, [SLASH]: RESIST },
    0x9a3412,
    { rarity: 'uncommon' }
  ),
  species(
    'ash-wraith',
    Biome.VOLCANIC,
    Archetype.CASTER,
    ['darkness-bolt', 'fire-wave'],
    { [ICE]: WEAK, [LIGHT]: WEAK, [FIRE]: RESIST },
    0x52525b,
    { rarity: 'uncommon' }
  ),
  species(
    'hellhound',
    Biome.VOLCANIC,
    Archetype.AGILE,
    ['bite', 'fire-breath'],
    { [ICE]: WEAK, [FIRE]: IMMUNE },
    0x7f1d1d,
    { rarity: 'uncommon' }
  ),
  species(
    'obsidian-knight',
    Biome.VOLCANIC,
    Archetype.TANK,
    ['bash', 'bulwark'],
    { [BLUNT]: WEAK, [ICE]: WEAK, [FIRE]: RESIST, [SLASH]: RESIST },
    0x18181b,
    { rarity: 'rare' }
  ),
  species(
    'flame-priest',
    Biome.VOLCANIC,
    Archetype.HEALER,
    ['fire-bolt', 'mend', 'war-cry'],
    { [ICE]: WEAK, [FIRE]: ABSORB },
    0xea580c,
    { rarity: 'rare' }
  ),
  species(
    'banshee',
    Biome.WASTELANDS,
    Archetype.CASTER,
    ['darkness-bolt', 'shriek', 'darkness-wave'],
    { [LIGHT]: WEAK, [DARKNESS]: ABSORB, [SLASH]: RESIST },
    0xc4b5fd
  ),
  species(
    'plague-rat',
    Biome.WASTELANDS,
    Archetype.AGILE,
    ['bite', 'spore-cloud'],
    { [LIGHT]: WEAK, [FIRE]: WEAK },
    0x4d7c0f,
    { rarity: 'uncommon' }
  ),
  species(
    'grave-priest',
    Biome.WASTELANDS,
    Archetype.HEALER,
    ['darkness-bolt', 'mend', 'curse'],
    { [LIGHT]: WEAK, [DARKNESS]: RESIST },
    0x312e81,
    { rarity: 'uncommon' }
  ),
  species(
    'hollow-archer',
    Biome.WASTELANDS,
    Archetype.AGILE,
    ['arrow', 'impale'],
    { [LIGHT]: WEAK, [BLUNT]: WEAK, [PIERCE]: RESIST },
    0x9ca3af,
    { rarity: 'uncommon' }
  ),
  species(
    'flesh-golem',
    Biome.WASTELANDS,
    Archetype.TANK,
    ['bash', 'crush', 'harden', 'rend'],
    { [LIGHT]: WEAK, [FIRE]: WEAK, [DARKNESS]: RESIST },
    0x9f1239,
    { rarity: 'rare' }
  ),
  species(
    'carrion-crow',
    Biome.WASTELANDS,
    Archetype.AGILE,
    ['peck', 'rend'],
    { [LIGHT]: WEAK, [LIGHTNING]: WEAK },
    0x111827,
    { rarity: 'rare' }
  ),
  species(
    'abyssal-knight',
    Biome.ABYSS,
    Archetype.TANK,
    ['bash', 'bulwark', 'darkness-wave'],
    { [LIGHT]: WEAK, [SLASH]: RESIST, [DARKNESS]: RESIST },
    0x1e1b4b
  ),
  species(
    'chaos-spawn',
    Biome.ABYSS,
    Archetype.BRUTE,
    ['claw', 'soul-drain', 'blood-howl'],
    { [LIGHT]: WEAK, [FIRE]: RESIST, [ICE]: RESIST },
    0x86198f,
    { rarity: 'uncommon' }
  ),
  species(
    'void-weaver',
    Biome.ABYSS,
    Archetype.CASTER,
    ['darkness-bolt', 'web', 'curse'],
    { [LIGHT]: WEAK, [DARKNESS]: ABSORB },
    0x581c87,
    { rarity: 'uncommon' }
  ),
  species(
    'crucible-priest',
    Biome.ABYSS,
    Archetype.HEALER,
    ['darkness-bolt', 'chorus', 'war-cry'],
    { [LIGHT]: WEAK, [FIRE]: RESIST, [DARKNESS]: RESIST },
    0xb91c1c,
    { rarity: 'uncommon' }
  ),
  species(
    'shadow-stalker',
    Biome.ABYSS,
    Archetype.AGILE,
    ['claw', 'pounce', 'impale'],
    { [LIGHT]: WEAK, [DARKNESS]: IMMUNE },
    0x0f172a,
    { rarity: 'rare' }
  ),
  species(
    'molten-horror',
    Biome.ABYSS,
    Archetype.BRUTE,
    ['claw', 'crush', 'fire-breath'],
    { [ICE]: WEAK, [FIRE]: ABSORB, [DARKNESS]: RESIST },
    0xdc2626,
    { rarity: 'rare' }
  )
]
/** Named bosses: the mini bosses, the captors, the Seals, the sanctuary guardians and Crisol. */
const BOSSES: EnemySpecies[] = [
  species('boar-matriarch', Biome.MEADOWS, Archetype.BRUTE, ['claw', 'gore', 'roar'], { [FIRE]: WEAK }, 0x6b3f1d, {
    rarity: 'boss',
    strength: 5.2,
    size: 1.6
  }),
  species('bandit-chief', Biome.MEADOWS, Archetype.AGILE, ['bite', 'rend', 'lunge'], { [FIRE]: WEAK }, 0x4b5563, {
    rarity: 'boss',
    strength: 3,
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
      rarity: 'boss',
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
      rarity: 'boss',
      strength: 3,
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
      rarity: 'boss',
      strength: 3,
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
      rarity: 'boss',
      strength: 3,
      bars: 2,
      size: 2.1
    }
  ),
  species(
    'xalqui',
    Biome.TROPICAL,
    Archetype.AGILE,
    ['bite', 'venom-bite', 'lunge', 'earth-wave'],
    { [ICE]: WEAK, [EARTH]: RESIST },
    0x059669,
    {
      rarity: 'boss',
      strength: 3,
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
      rarity: 'boss',
      strength: 2.6,
      bars: 2,
      size: 2.3
    }
  ),
  species(
    'vael',
    Biome.WASTELANDS,
    Archetype.BRUTE,
    ['claw', 'rend', 'darkness-wave', 'roar'],
    { [LIGHT]: WEAK, [DARKNESS]: ABSORB },
    0x1f2937,
    {
      rarity: 'boss',
      strength: 3,
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
      rarity: 'boss',
      strength: 2,
      bars: 3,
      size: 2.6,
      phaseSkills: [
        ['soul-drain', 'war-cry'],
        ['fire-breath', 'shriek']
      ]
    }
  ),
  species(
    'alpha-wolf',
    Biome.FOREST,
    Archetype.AGILE,
    ['bite', 'pounce', 'blood-howl'],
    { [FIRE]: WEAK, [DARKNESS]: RESIST },
    0x1f2937,
    { rarity: 'boss', strength: 5.6, size: 1.5 }
  ),
  species(
    'elder-treant',
    Biome.FOREST,
    Archetype.TANK,
    ['bash', 'harden', 'mend'],
    { [FIRE]: WEAK, [BLUNT]: RESIST, [EARTH]: ABSORB },
    0x3f6212,
    { rarity: 'boss', strength: 4.2, bars: 2, size: 1.9, phaseSkills: [['entangle-roots']] }
  ),
  species(
    'spider-queen',
    Biome.FOREST,
    Archetype.AGILE,
    ['bite', 'venom-bite', 'web', 'sting'],
    { [FIRE]: WEAK, [PIERCE]: RESIST },
    0x4c1d95,
    { rarity: 'boss', strength: 5.6, size: 1.7 }
  ),
  species(
    'mire-witch',
    Biome.TROPICAL,
    Archetype.CASTER,
    ['earth-bolt', 'curse', 'spore-cloud', 'hex'],
    { [ICE]: WEAK, [EARTH]: RESIST, [DARKNESS]: RESIST },
    0x4d7c0f,
    { rarity: 'boss', strength: 3, bars: 2, size: 1.5, phaseSkills: [['soul-drain']] }
  ),
  species(
    'jaguar-king',
    Biome.TROPICAL,
    Archetype.AGILE,
    ['claw', 'pounce', 'rend', 'roar'],
    { [ICE]: WEAK, [EARTH]: RESIST },
    0xca8a04,
    { rarity: 'boss', strength: 3.8, size: 1.6 }
  ),
  species(
    'swamp-hydra',
    Biome.TROPICAL,
    Archetype.BRUTE,
    ['bite', 'venom-bite', 'earth-wave'],
    { [ICE]: WEAK, [FIRE]: WEAK, [EARTH]: IMMUNE },
    0x166534,
    { rarity: 'boss', strength: 2.2, bars: 3, size: 2 }
  ),
  species(
    'dune-wyrm',
    Biome.DESERT,
    Archetype.BRUTE,
    ['bite', 'sandstorm', 'quake'],
    { [ICE]: WEAK, [FIRE]: RESIST, [EARTH]: RESIST },
    0xd97706,
    { rarity: 'boss', strength: 4.4, size: 2 }
  ),
  species(
    'mummy-pharaoh',
    Biome.DESERT,
    Archetype.CASTER,
    ['darkness-bolt', 'curse', 'sandstorm'],
    { [FIRE]: WEAK, [LIGHT]: WEAK, [DARKNESS]: ABSORB },
    0xfde68a,
    { rarity: 'boss', strength: 3, bars: 2, size: 1.6, phaseSkills: [['chorus']] }
  ),
  species(
    'sand-titan',
    Biome.DESERT,
    Archetype.TANK,
    ['bash', 'crush', 'harden', 'sandstorm'],
    { [ICE]: WEAK, [EARTH]: IMMUNE, [SLASH]: RESIST },
    0xb45309,
    { rarity: 'boss', strength: 3.4, size: 2.2 }
  ),
  species(
    'crystal-wyrm',
    Biome.MOUNTAINS,
    Archetype.CASTER,
    ['light-bolt', 'light-wave', 'frost-breath'],
    { [BLUNT]: WEAK, [DARKNESS]: WEAK, [LIGHT]: ABSORB },
    0x67e8f9,
    { rarity: 'boss', strength: 3.2, bars: 2, size: 1.9 }
  ),
  species(
    'dwarf-warlord',
    Biome.MOUNTAINS,
    Archetype.TANK,
    ['bash', 'war-cry', 'bulwark'],
    { [ICE]: WEAK, [EARTH]: RESIST, [SLASH]: RESIST },
    0x92400e,
    { rarity: 'boss', strength: 3.8, size: 1.5 }
  ),
  species(
    'thunder-roc',
    Biome.MOUNTAINS,
    Archetype.AGILE,
    ['peck', 'lightning-bolt', 'lightning-wave'],
    { [ICE]: WEAK, [EARTH]: IMMUNE, [LIGHTNING]: ABSORB },
    0xfacc15,
    { rarity: 'boss', strength: 3.8, size: 2 }
  ),
  species(
    'winter-witch',
    Biome.SNOW,
    Archetype.CASTER,
    ['ice-bolt', 'ice-wave', 'curse'],
    { [FIRE]: WEAK, [ICE]: ABSORB },
    0xbae6fd,
    { rarity: 'boss', strength: 3.2, bars: 2, size: 1.6, phaseSkills: [['chorus']] }
  ),
  species(
    'ice-troll-king',
    Biome.SNOW,
    Archetype.BRUTE,
    ['bash', 'crush', 'frost-breath', 'roar'],
    { [FIRE]: WEAK, [ICE]: IMMUNE },
    0xe2e8f0,
    { rarity: 'boss', strength: 3.6, size: 2.1 }
  ),
  species(
    'fire-drake',
    Biome.VOLCANIC,
    Archetype.AGILE,
    ['bite', 'fire-breath', 'fire-wave'],
    { [ICE]: WEAK, [FIRE]: ABSORB },
    0xf97316,
    { rarity: 'boss', strength: 2.3, bars: 2, size: 2 }
  ),
  species(
    'magma-behemoth',
    Biome.VOLCANIC,
    Archetype.TANK,
    ['bash', 'crush', 'quake', 'harden'],
    { [ICE]: WEAK, [FIRE]: ABSORB, [SLASH]: RESIST },
    0x7c2d12,
    { rarity: 'boss', strength: 4.1, size: 2.3 }
  ),
  species(
    'lich',
    Biome.WASTELANDS,
    Archetype.CASTER,
    ['darkness-bolt', 'darkness-wave', 'soul-drain', 'curse'],
    { [LIGHT]: WEAK, [FIRE]: WEAK, [DARKNESS]: ABSORB, [ICE]: RESIST },
    0x6d28d9,
    { rarity: 'boss', strength: 2.4, bars: 2, size: 1.7, phaseSkills: [['shriek']] }
  ),
  species(
    'bone-dragon',
    Biome.WASTELANDS,
    Archetype.BRUTE,
    ['bite', 'darkness-wave', 'frost-breath'],
    { [LIGHT]: WEAK, [BLUNT]: WEAK, [DARKNESS]: ABSORB, [PIERCE]: RESIST },
    0xe5e7eb,
    { rarity: 'boss', strength: 2.8, bars: 2, size: 2.3 }
  ),
  species(
    'abyssal-champion',
    Biome.ABYSS,
    Archetype.BRUTE,
    ['claw', 'rend', 'war-cry', 'blood-howl'],
    { [LIGHT]: WEAK, [DARKNESS]: RESIST, [SLASH]: RESIST },
    0x7f1d1d,
    { rarity: 'boss', strength: 3, bars: 2, size: 1.8 }
  ),
  species(
    'crucible-maw',
    Biome.ABYSS,
    Archetype.BRUTE,
    ['bite', 'crush', 'soul-drain', 'fire-breath'],
    { [ICE]: WEAK, [FIRE]: ABSORB, [DARKNESS]: RESIST },
    0x991b1b,
    { rarity: 'boss', strength: 3, bars: 2, size: 2.2, phaseSkills: [['shriek']] }
  ),
  species(
    'old-scarecrow',
    Biome.MEADOWS,
    Archetype.CASTER,
    ['earth-bolt', 'hex', 'shriek'],
    { [FIRE]: WEAK, [EARTH]: RESIST },
    0xa16207,
    { rarity: 'boss', strength: 6.5, size: 1.5 }
  ),
  species(
    'moss-golem',
    Biome.FOREST,
    Archetype.TANK,
    ['bash', 'harden', 'entangle-roots'],
    { [FIRE]: WEAK, [EARTH]: ABSORB, [BLUNT]: RESIST },
    0x4d7c0f,
    { rarity: 'boss', strength: 5.8, size: 1.8 }
  ),
  species(
    'temple-serpent',
    Biome.TROPICAL,
    Archetype.AGILE,
    ['bite', 'venom-bite', 'impale', 'web'],
    { [ICE]: WEAK, [EARTH]: RESIST },
    0x0f766e,
    { rarity: 'boss', strength: 4.4, size: 1.9 }
  ),
  species(
    'sphinx',
    Biome.DESERT,
    Archetype.CASTER,
    ['light-bolt', 'curse', 'sandstorm'],
    { [ICE]: WEAK, [DARKNESS]: WEAK, [LIGHT]: ABSORB },
    0xeab308,
    { rarity: 'boss', strength: 3, bars: 2, size: 1.9 }
  ),
  species(
    'rune-golem',
    Biome.MOUNTAINS,
    Archetype.TANK,
    ['bash', 'crush', 'bulwark', 'lightning-wave'],
    { [LIGHTNING]: WEAK, [EARTH]: IMMUNE, [SLASH]: RESIST, [PIERCE]: RESIST },
    0x0891b2,
    { rarity: 'boss', strength: 4, size: 2 }
  ),
  species(
    'ember-sentinel',
    Biome.VOLCANIC,
    Archetype.TANK,
    ['bash', 'fire-wave', 'harden'],
    { [ICE]: WEAK, [FIRE]: ABSORB, [SLASH]: RESIST },
    0xc2410c,
    { rarity: 'boss', strength: 4.6, size: 1.9 }
  ),
  species(
    'phoenix',
    Biome.VOLCANIC,
    Archetype.CASTER,
    ['fire-bolt', 'fire-breath', 'chorus'],
    { [ICE]: WEAK, [FIRE]: ABSORB, [LIGHT]: RESIST },
    0xfb923c,
    { rarity: 'boss', strength: 2.3, bars: 2, size: 2 }
  ),
  species(
    'frost-sentinel',
    Biome.SNOW,
    Archetype.TANK,
    ['bash', 'frost-breath', 'bulwark'],
    { [FIRE]: WEAK, [ICE]: ABSORB, [SLASH]: RESIST },
    0x60a5fa,
    { rarity: 'boss', strength: 4, size: 1.9 }
  ),
  species(
    'death-knight',
    Biome.WASTELANDS,
    Archetype.BRUTE,
    ['claw', 'rend', 'smite', 'war-cry'],
    { [LIGHT]: WEAK, [DARKNESS]: ABSORB, [SLASH]: RESIST },
    0x27272a,
    { rarity: 'boss', strength: 4.4, size: 1.8 }
  ),
  species(
    'wraith-lord',
    Biome.WASTELANDS,
    Archetype.CASTER,
    ['darkness-bolt', 'soul-drain', 'darkness-wave', 'shriek'],
    { [LIGHT]: WEAK, [DARKNESS]: ABSORB, [SLASH]: IMMUNE },
    0x4c1d95,
    { rarity: 'boss', strength: 2.4, bars: 2, size: 1.9 }
  ),
  species(
    'void-sentinel',
    Biome.ABYSS,
    Archetype.TANK,
    ['bash', 'crush', 'darkness-wave', 'bulwark'],
    { [LIGHT]: WEAK, [DARKNESS]: ABSORB, [SLASH]: RESIST, [PIERCE]: RESIST },
    0x1e1b4b,
    { rarity: 'boss', strength: 4.6, size: 2 }
  ),
  species(
    'crucible-herald',
    Biome.ABYSS,
    Archetype.CASTER,
    ['fire-bolt', 'darkness-bolt', 'curse'],
    { [ICE]: WEAK, [LIGHT]: WEAK, [FIRE]: RESIST, [DARKNESS]: RESIST },
    0xdc2626,
    { rarity: 'boss', strength: 2.6, bars: 2, size: 2, phaseSkills: [['fire-wave', 'war-cry']] }
  )
]
/**
 * The wardens of the reliquaries (one per weapon to find, see data/weapons.ts):
 * the hardest fights out of the way, with three health bars and a script.
 */
const WARDEN = { rarity: 'boss', bars: 3, size: 2 } as const
const WARDENS: EnemySpecies[] = [
  species(
    'cinder-stag',
    Biome.FOREST,
    Archetype.BRUTE,
    ['claw', 'gore', 'fire-breath'],
    { [ICE]: WEAK, [FIRE]: ABSORB, [PIERCE]: RESIST },
    0xea580c,
    { ...WARDEN, strength: 2.5, phaseSkills: [['roar'], ['blood-howl']] }
  ),
  species(
    'shell-colossus',
    Biome.TROPICAL,
    Archetype.TANK,
    ['bash', 'crush', 'bulwark'],
    { [LIGHTNING]: WEAK, [BLUNT]: RESIST, [SLASH]: RESIST },
    0x0f766e,
    { ...WARDEN, strength: 2, phaseSkills: [['quake'], ['war-cry']] }
  ),
  species(
    'glass-djinn',
    Biome.DESERT,
    Archetype.CASTER,
    ['ice-bolt', 'ice-wave', 'hex'],
    { [FIRE]: WEAK, [ICE]: ABSORB, [EARTH]: RESIST },
    0x67e8f9,
    { ...WARDEN, strength: 2.8, phaseSkills: [['curse'], ['sandstorm']] }
  ),
  species(
    'storm-harpy',
    Biome.MOUNTAINS,
    Archetype.AGILE,
    ['bite', 'lunge', 'lightning-bolt', 'shriek'],
    { [EARTH]: WEAK, [LIGHTNING]: ABSORB },
    0x6366f1,
    { ...WARDEN, strength: 2.6, phaseSkills: [['pounce'], ['lightning-wave']] }
  ),
  species(
    'granite-warden',
    Biome.MOUNTAINS,
    Archetype.TANK,
    ['bash', 'earth-wave', 'bulwark'],
    { [BLUNT]: WEAK, [EARTH]: ABSORB, [SLASH]: RESIST, [PIERCE]: RESIST },
    0x78716c,
    { ...WARDEN, strength: 1.85, phaseSkills: [['quake'], ['crush']] }
  ),
  species(
    'frost-reaver',
    Biome.SNOW,
    Archetype.BRUTE,
    ['claw', 'rend', 'frost-breath'],
    { [FIRE]: WEAK, [ICE]: IMMUNE },
    0x93c5fd,
    { ...WARDEN, strength: 1.9, phaseSkills: [['war-cry', 'blood-howl'], ['crush']] }
  ),
  species(
    'ashen-seraph',
    Biome.VOLCANIC,
    Archetype.CASTER,
    ['fire-bolt', 'smite', 'fire-wave'],
    { [ICE]: WEAK, [FIRE]: ABSORB, [LIGHT]: RESIST },
    0xfcd34d,
    { ...WARDEN, strength: 1.8, phaseSkills: [['war-cry'], ['chorus']] }
  ),
  species(
    'thorn-widow',
    Biome.WASTELANDS,
    Archetype.AGILE,
    ['bite', 'venom-bite', 'web', 'rend'],
    { [FIRE]: WEAK, [LIGHT]: WEAK, [DARKNESS]: RESIST },
    0x4a044e,
    { ...WARDEN, strength: 2, phaseSkills: [['spore-cloud'], ['shriek']] }
  ),
  species(
    'storm-revenant',
    Biome.WASTELANDS,
    Archetype.CASTER,
    ['lightning-bolt', 'soul-drain', 'lightning-wave'],
    { [LIGHT]: WEAK, [LIGHTNING]: ABSORB, [DARKNESS]: RESIST },
    0x818cf8,
    { ...WARDEN, strength: 2, phaseSkills: [['curse'], ['darkness-wave']] }
  ),
  species(
    'prism-horror',
    Biome.ABYSS,
    Archetype.CASTER,
    ['fire-bolt', 'ice-bolt', 'lightning-wave', 'curse'],
    { [DARKNESS]: WEAK, [LIGHT]: ABSORB, [FIRE]: RESIST, [ICE]: RESIST },
    0xf0abfc,
    { ...WARDEN, strength: 2.1, phaseSkills: [['darkness-wave'], ['war-cry']] }
  )
]

export const ENEMIES: EnemySpecies[] = [...COMMON, ...BOSSES, ...WARDENS]

const ENEMIES_BY_ID = new Map(ENEMIES.map((enemy) => [enemy.id, enemy]))

/** The species of each camp boss, by its id in the world. */
export const BOSS_SPECIES: Record<string, string> = {
  'meadows-miniboss-1': 'boar-matriarch',
  'meadows-miniboss-2': 'bandit-chief',
  'forest-miniboss-1': 'alpha-wolf',
  'forest-miniboss-2': 'elder-treant',
  'forest-miniboss-3': 'spider-queen',
  'tropical-miniboss-1': 'mire-witch',
  'tropical-miniboss-2': 'jaguar-king',
  'tropical-miniboss-3': 'swamp-hydra',
  'desert-miniboss-1': 'dune-wyrm',
  'desert-miniboss-2': 'mummy-pharaoh',
  'desert-miniboss-3': 'sand-titan',
  'mountains-miniboss-1': 'crystal-wyrm',
  'mountains-miniboss-2': 'dwarf-warlord',
  'mountains-miniboss-3': 'thunder-roc',
  'snow-miniboss-1': 'winter-witch',
  'snow-miniboss-2': 'ice-troll-king',
  'volcanic-miniboss-1': 'fire-drake',
  'volcanic-miniboss-2': 'magma-behemoth',
  'wastelands-miniboss-1': 'lich',
  'wastelands-miniboss-2': 'bone-dragon',
  'abyss-miniboss-1': 'crucible-maw',
  'abyss-miniboss-2': 'abyssal-champion',
  morgrath: 'morgrath',
  sahrak: 'sahrak',
  vorneth: 'vorneth',
  ignaroth: 'ignaroth',
  xalqui: 'xalqui',
  colossus: 'colossus',
  vael: 'vael'
}

export const FINAL_BOSS_SPECIES = 'crisol'

/** The guardian of each guarded sanctuary, by the index of its rune. */
export const GUARDIAN_SPECIES: Record<number, string> = {
  4: 'old-scarecrow',
  9: 'moss-golem',
  25: 'temple-serpent',
  26: 'sphinx',
  28: 'rune-golem',
  39: 'ember-sentinel',
  40: 'phoenix',
  44: 'frost-sentinel',
  51: 'death-knight',
  52: 'wraith-lord',
  59: 'void-sentinel',
  60: 'crucible-herald'
}

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

/**
 * Attributes of an enemy: those of its archetype grown with the level, times
 * its strength (mostly health: bosses last long without killing in one hit),
 * the elite variant and the New Game+ cycle.
 */
export function getEnemyStats(speciesId: string, level: number, elite = false, cycle = 0): CombatStats {
  const { archetype, strength, biome } = getSpecies(speciesId)
  const base = ARCHETYPE_STATS[archetype]
  const levelFactor = 1 + GROWTH_PER_LEVEL * (level - 1)
  const cycleFactor = 1 + CYCLE_POWER * cycle
  const biomeScale = strength > 1 ? BOSS_BIOME_SCALE : 1
  // In New Game+ the whole party fights from the start: the first biomes get closer to the last one.
  const catchUp = (table: Record<Biome, number>) =>
    (table[biome] * (cycle > 0 ? (table[Biome.ABYSS] / table[biome]) ** CYCLE_CATCH_UP : 1)) ** biomeScale
  const power = (1 + (strength - 1) * 0.4) * (elite ? ELITE_POWER : 1) * catchUp(BIOME_POWER) * cycleFactor
  const health = strength * (elite ? ELITE_HEALTH : 1) * catchUp(BIOME_HEALTH) * cycleFactor

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
