import { Biome } from '@/app/(protected)/(engine)/models/Biome'
import { BonusesPart } from '@/app/(protected)/(engine)/models/Bonuses'
import { CharacterId } from '@/app/(protected)/(engine)/models/CharacterId'
import { DamageType } from '@/app/(protected)/(engine)/models/DamageType'
import { StoneId } from '@/app/(protected)/(engine)/models/Item'
import { StatusType } from '@/app/(protected)/(engine)/models/StatusType'

/**
 * Weapons and the forge (names in i18n, weapons.<id>). Each character has
 * three: the one it starts with and two that wait in reliquaries of the map,
 * guarded by a warden (a very hard boss), in biomes past the one where the
 * character joins. None is better than the others: each one has its own
 * weapon attack (damage type, targets, statuses) and its own style (shares
 * that can be negative), for different fights.
 *
 * Every weapon is upgraded on its own at a camp, from +0 to +20, with
 * smithing stones and gold. Each level adds attack and special power; +5,
 * +10, +15 and +20 also add an effect of its own. The equipped weapon can be
 * changed at any cleared point.
 */

export interface Weapon {
  id: string
  characterId: CharacterId
  /** Its weapon attack: the first skill of the character while it is equipped (data/skills.ts). */
  attack: string
  /** What it gives from +0 on: its style. */
  traits: BonusesPart
  /** The effects of +5, +10, +15 and +20. */
  effects: [BonusesPart, BonusesPart, BonusesPart, BonusesPart]
  /** The biome of its reliquary (none for the weapon the character starts with). */
  biome?: Biome
  /** Its warden (the species that guards the reliquary). */
  warden?: string
  /** Its image: heroes/<character>/weapons/<art>. */
  art: string
}

export const MAX_WEAPON_LEVEL = 20
/** Attack and special power added by each upgrade. */
export const WEAPON_POWER_PER_LEVEL = 0.02
/** The stone each block of five upgrades needs. */
const STONES = [StoneId.ROUGH, StoneId.TEMPERED, StoneId.ARCANE, StoneId.ABYSSAL]
const GOLD_PER_LEVEL = 60
const { FIRE, ICE, LIGHTNING, EARTH, LIGHT } = DamageType

/** What upgrading a weapon to a level costs: stones of a quality (1 to 5 of them) and gold. */
export function getUpgradeCost(level: number): { stoneId: StoneId; stones: number; gold: number } {
  if (level < 1 || level > MAX_WEAPON_LEVEL) {
    throw new Error(`No weapon upgrade to +${level}`)
  }

  return {
    stoneId: STONES[Math.floor((level - 1) / 5)],
    stones: ((level - 1) % 5) + 1,
    gold: GOLD_PER_LEVEL * level
  }
}

export const WEAPONS: Weapon[] = [
  // Kael: a sword for everything, a burning blade for magic and a mace to hold the line.
  {
    id: 'oath-sword',
    characterId: CharacterId.KAEL,
    attack: 'kael-strike',
    traits: {},
    effects: [
      { onHit: [{ type: StatusType.BLEED, chance: 0.15, turns: 2 }] },
      { stats: { critChance: 0.05 } },
      { damage: { [FIRE]: 0.2 } },
      { lifesteal: 0.06 }
    ],
    art: 'sword'
  },
  {
    id: 'dawnbrand',
    characterId: CharacterId.KAEL,
    attack: 'kael-dawn-cut',
    traits: { stats: { special: 0.1, defense: -0.06 } },
    effects: [{ damage: { [FIRE]: 0.15 } }, { statusChance: 0.1 }, { focusRegen: 0.05 }, { weakness: 0.25 }],
    biome: Biome.FOREST,
    warden: 'cinder-stag',
    art: 'dawnbrand'
  },
  {
    id: 'bulwark-mace',
    characterId: CharacterId.KAEL,
    attack: 'kael-mace-blow',
    traits: { stats: { defense: 0.15, maxHealth: 0.1, speed: -0.08 }, guard: 0.04 },
    effects: [
      { onHit: [{ type: StatusType.ATTACK_DOWN, chance: 0.25, turns: 2 }] },
      { guard: 0.05 },
      { regen: 0.02 },
      { stats: { defense: 0.15 } }
    ],
    biome: Biome.TROPICAL,
    warden: 'shell-colossus',
    art: 'mace'
  },
  // Sera: a bow for marks and crits, a crossbow for heavy shots and a bow that hits them all.
  {
    id: 'ranger-bow',
    characterId: CharacterId.SERA,
    attack: 'sera-shot',
    traits: {},
    effects: [
      { stats: { critChance: 0.05 } },
      { onHit: [{ type: StatusType.POISON, chance: 0.2, turns: 3 }] },
      { weakness: 0.2 },
      { stats: { critDamage: 0.3 } }
    ],
    art: 'bow'
  },
  {
    id: 'frost-crossbow',
    characterId: CharacterId.SERA,
    attack: 'sera-frost-bolt',
    traits: { stats: { attack: 0.12, speed: -0.12, critChance: -0.04 } },
    effects: [
      { damage: { [ICE]: 0.15 } },
      { onHit: [{ type: StatusType.SPEED_DOWN, chance: 0.3, turns: 2 }] },
      { stats: { critDamage: 0.3 } },
      { weakness: 0.25 }
    ],
    biome: Biome.DESERT,
    warden: 'glass-djinn',
    art: 'crossbow'
  },
  {
    id: 'gale-bow',
    characterId: CharacterId.SERA,
    attack: 'sera-gale-shot',
    traits: { stats: { speed: 0.1, attack: -0.1 } },
    effects: [
      { initiative: 15 },
      { damage: { [LIGHTNING]: 0.15 } },
      { onHit: [{ type: StatusType.BLIND, chance: 0.12, turns: 2 }] },
      { stats: { speed: 0.1 } }
    ],
    biome: Biome.MOUNTAINS,
    warden: 'storm-harpy',
    art: 'gale-bow'
  },
  // Brann: an axe that feeds the fury, a slow maul that stuns and two fast hatchets that bleed.
  {
    id: 'war-axe',
    characterId: CharacterId.BRANN,
    attack: 'brann-chop',
    traits: {},
    effects: [
      { onHit: [{ type: StatusType.BLEED, chance: 0.2, turns: 2 }] },
      { damage: { [EARTH]: 0.2 } },
      { onHit: [{ type: StatusType.STUN, chance: 0.1, turns: 1 }] },
      { lifesteal: 0.08 }
    ],
    art: 'axe'
  },
  {
    id: 'quarry-maul',
    characterId: CharacterId.BRANN,
    attack: 'brann-maul-smash',
    traits: { stats: { attack: 0.1, speed: -0.12 } },
    effects: [
      { damage: { [EARTH]: 0.15 } },
      { onHit: [{ type: StatusType.DEFENSE_DOWN, chance: 0.3, turns: 2 }] },
      { stats: { critDamage: 0.3 } },
      { guard: 0.06 }
    ],
    biome: Biome.MOUNTAINS,
    warden: 'granite-warden',
    art: 'maul'
  },
  {
    id: 'twin-hatchets',
    characterId: CharacterId.BRANN,
    attack: 'brann-twin-cut',
    traits: { stats: { speed: 0.15, critChance: 0.06, attack: -0.12, defense: -0.08 } },
    effects: [
      { lifesteal: 0.05 },
      { onHit: [{ type: StatusType.BLEED, chance: 0.2, turns: 2 }] },
      { stats: { critChance: 0.06 } },
      { initiative: 20 }
    ],
    biome: Biome.SNOW,
    warden: 'frost-reaver',
    art: 'hatchets'
  },
  // Oren: a staff for the sap, a scepter of light that heals more and a sickle that poisons.
  {
    id: 'grove-staff',
    characterId: CharacterId.OREN,
    attack: 'oren-staff',
    traits: {},
    effects: [
      { focusRegen: 0.04 },
      { regen: 0.02 },
      { onHit: [{ type: StatusType.ATTACK_DOWN, chance: 0.25, turns: 2 }] },
      { stats: { special: 0.12 } }
    ],
    art: 'staff'
  },
  {
    id: 'sun-scepter',
    characterId: CharacterId.OREN,
    attack: 'oren-sun-ray',
    traits: { stats: { special: 0.12, attack: -0.1 } },
    effects: [{ damage: { [LIGHT]: 0.15 } }, { statusChance: 0.1 }, { focusRegen: 0.06 }, { regen: 0.02 }],
    biome: Biome.VOLCANIC,
    warden: 'ashen-seraph',
    art: 'scepter'
  },
  {
    id: 'thorn-sickle',
    characterId: CharacterId.OREN,
    attack: 'oren-sickle-cut',
    traits: { stats: { attack: 0.18, speed: 0.05, special: -0.12 } },
    effects: [
      { onHit: [{ type: StatusType.POISON, chance: 0.2, turns: 3 }] },
      { lifesteal: 0.06 },
      { statusChance: 0.1 },
      { stats: { critChance: 0.06 } }
    ],
    biome: Biome.WASTELANDS,
    warden: 'thorn-widow',
    art: 'sickle'
  },
  // Ysolde: a staff of three elements, a scepter that fills the focus and a wand of light made to break things.
  {
    id: 'crystal-staff',
    characterId: CharacterId.YSOLDE,
    attack: 'ysolde-rod',
    traits: {},
    effects: [
      { damage: { [FIRE]: 0.15 } },
      { damage: { [ICE]: 0.15 } },
      { damage: { [LIGHTNING]: 0.15 } },
      { focusRegen: 0.06 }
    ],
    art: 'staff'
  },
  {
    id: 'storm-scepter',
    characterId: CharacterId.YSOLDE,
    attack: 'ysolde-storm-strike',
    traits: { stats: { speed: 0.08, maxFocus: 0.15 }, focusRegen: 0.04 },
    effects: [{ damage: { [LIGHTNING]: 0.15 } }, { initiative: 15 }, { focusRegen: 0.04 }, { stats: { special: 0.1 } }],
    biome: Biome.WASTELANDS,
    warden: 'storm-revenant',
    art: 'storm-scepter'
  },
  {
    id: 'prism-wand',
    characterId: CharacterId.YSOLDE,
    attack: 'ysolde-prism-ray',
    traits: { stats: { special: 0.2, maxHealth: -0.12, defense: -0.12 } },
    effects: [{ damage: { [LIGHT]: 0.15 } }, { weakness: 0.2 }, { lifesteal: 0.04 }, { stats: { critDamage: 0.4 } }],
    biome: Biome.ABYSS,
    warden: 'prism-horror',
    art: 'wand'
  }
]

const WEAPONS_BY_ID = new Map(WEAPONS.map((weapon) => [weapon.id, weapon]))

export function getWeapon(id: string): Weapon {
  const weapon = WEAPONS_BY_ID.get(id)

  if (!weapon) {
    throw new Error(`Unknown weapon ${id}`)
  }

  return weapon
}

/** The three weapons of a character, the one it starts with first. */
export function getCharacterWeapons(characterId: CharacterId): Weapon[] {
  return WEAPONS.filter((weapon) => weapon.characterId === characterId)
}

export function getStartingWeapon(characterId: CharacterId): Weapon {
  return getCharacterWeapons(characterId)[0]
}

/** The effects a weapon has at its level. */
export function getWeaponEffects(weaponId: string, level: number): BonusesPart[] {
  return getWeapon(weaponId).effects.slice(0, Math.floor(level / 5))
}
