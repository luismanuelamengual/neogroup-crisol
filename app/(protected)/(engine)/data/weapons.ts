import { BonusesPart } from '@/app/(protected)/(engine)/models/Bonuses'
import { CharacterId } from '@/app/(protected)/(engine)/models/CharacterId'
import { DamageType } from '@/app/(protected)/(engine)/models/DamageType'
import { StoneId } from '@/app/(protected)/(engine)/models/Item'
import { StatusType } from '@/app/(protected)/(engine)/models/StatusType'

/**
 * Weapons and the forge: one weapon per character, upgraded at a camp from +0
 * to +20 with smithing stones and gold. Each level adds attack and special
 * power; +5, +10, +15 and +20 also add an effect of its own.
 */

export const MAX_WEAPON_LEVEL = 20
/** Attack and special power added by each upgrade. */
export const WEAPON_POWER_PER_LEVEL = 0.02
/** The stone each block of five upgrades needs. */
const STONES = [StoneId.ROUGH, StoneId.TEMPERED, StoneId.ARCANE, StoneId.ABYSSAL]
const GOLD_PER_LEVEL = 60

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

/** The effects of +5, +10, +15 and +20 of each weapon. */
export const WEAPON_EFFECTS: Record<CharacterId, [BonusesPart, BonusesPart, BonusesPart, BonusesPart]> = {
  [CharacterId.KAEL]: [
    { onHit: [{ type: StatusType.BLEED, chance: 0.15, turns: 2 }] },
    { stats: { critChance: 0.05 } },
    { damage: { [DamageType.FIRE]: 0.2 } },
    { lifesteal: 0.06 }
  ],
  [CharacterId.SERA]: [
    { stats: { critChance: 0.05 } },
    { onHit: [{ type: StatusType.POISON, chance: 0.2, turns: 3 }] },
    { weakness: 0.2 },
    { stats: { critDamage: 0.3 } }
  ],
  [CharacterId.BRANN]: [
    { onHit: [{ type: StatusType.BLEED, chance: 0.2, turns: 2 }] },
    { damage: { [DamageType.EARTH]: 0.2 } },
    { onHit: [{ type: StatusType.STUN, chance: 0.1, turns: 1 }] },
    { lifesteal: 0.08 }
  ],
  [CharacterId.OREN]: [
    { focusRegen: 0.04 },
    { regen: 0.02 },
    { onHit: [{ type: StatusType.ATTACK_DOWN, chance: 0.25, turns: 2 }] },
    { stats: { special: 0.12 } }
  ],
  [CharacterId.YSOLDE]: [
    { damage: { [DamageType.FIRE]: 0.15 } },
    { damage: { [DamageType.ICE]: 0.15 } },
    { damage: { [DamageType.LIGHTNING]: 0.15 } },
    { focusRegen: 0.06 }
  ]
}

/** The effects a weapon has at its level. */
export function getWeaponEffects(characterId: CharacterId, level: number): BonusesPart[] {
  return WEAPON_EFFECTS[characterId].slice(0, Math.floor(level / 5))
}
