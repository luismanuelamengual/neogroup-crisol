import { DamageType } from '@/app/(protected)/(engine)/models/DamageType'
import { Skill } from '@/app/(protected)/(engine)/models/Skill'
import { StatusType } from '@/app/(protected)/(engine)/models/StatusType'
import { TargetType } from '@/app/(protected)/(engine)/models/TargetType'

/**
 * What every action looks like on the stage, drawn by code (see attackVisuals.ts).
 * The look of a skill comes from its damage type, its targets and its flags, so a
 * new skill already has one; OVERRIDES only gives the signature ones a look of
 * their own. This file draws nothing, so the catalog can be tested.
 */

/** How a fighter fights: walking up to its target, with a bow, or with spells from its spot. */
export type ActorStyle = 'melee' | 'archer' | 'mage'

/** What the fighter does with its body: it closes in and strikes, it shoots, or it casts from its spot. */
export type Approach = 'lunge' | 'shoot' | 'cast'

/** The mark a blow leaves where it lands. */
export type Strike = 'slash' | 'claw' | 'pierce' | 'bite' | 'blunt'

/** How the action reaches each target. */
export type Delivery =
  /** The strike lands where the fighter arrives. */
  | 'contact'
  | 'arrow'
  /** A glowing shot that flies to the target (fireball, dark orb, rock, the seal of a tome...). */
  | 'bolt'
  /** A straight crystal spear. */
  | 'lance'
  /** A fan of small crystals, one volley for each target. */
  | 'shards'
  /** An instant lightning from the hand to the target. */
  | 'zigzag'
  /** A lightning that jumps from one target to the next. */
  | 'chain'
  /** A ray that holds for a moment between the caster and the target. */
  | 'beam'
  /** A dark thread that pulls the life of the target to the caster. */
  | 'drain'
  /** It falls from above on each target (lightning, a pillar of light, crystals, rocks). */
  | 'sky'
  | 'meteor'
  /** It grows from the ground under each target (spikes, roots, a pillar of fire, a dark whirl, an ice block). */
  | 'rise'
  /** A cone from the front of the caster. */
  | 'breath'
  /** A front that sweeps the line of the targets (a wall of fire, frost on the ground, a scream). */
  | 'wave'
  /** Particles that cross the whole line of the targets (blizzard, sandstorm, spores). */
  | 'storm'
  /** Over an ally or the caster: a ring at the feet and rising sparks (heals, buffs, shields). */
  | 'aura'

/** The colors of an effect: the damage types, plus a few looks that do not follow a type. */
export type Look = DamageType | 'arcane' | 'poison' | 'heal' | 'blood'

export interface AttackEffect {
  approach: Approach
  delivery: Delivery
  /** The mark of the blow (contact only). */
  strike: Strike | null
  look: Look
  /** 1 for the common ones; the strong and the finishing ones are bigger. */
  scale: number
  /** A shield over the target (aura only). */
  shield?: boolean
}

export interface LookColors {
  /** The bright center. */
  core: number
  /** The halo around it. */
  glow: number
  /** A second color for sparks and edges. */
  accent: number
}

export const LOOK_COLORS: Record<Look, LookColors> = {
  [DamageType.SLASH]: { core: 0xffffff, glow: 0xdfe7ff, accent: 0x9fb6ff },
  [DamageType.PIERCE]: { core: 0xffffff, glow: 0xe6ecf5, accent: 0xffd27a },
  [DamageType.BLUNT]: { core: 0xfff4d6, glow: 0xffd27a, accent: 0xc9a27a },
  [DamageType.FIRE]: { core: 0xfff1a8, glow: 0xff7a00, accent: 0xff3d1f },
  [DamageType.ICE]: { core: 0xf0fdff, glow: 0x7dd3fc, accent: 0x38bdf8 },
  [DamageType.LIGHTNING]: { core: 0xffffff, glow: 0xfde047, accent: 0x93c5fd },
  [DamageType.EARTH]: { core: 0xe9c48a, glow: 0xb7793c, accent: 0x84cc16 },
  [DamageType.LIGHT]: { core: 0xfffdf0, glow: 0xffe27a, accent: 0xfff3b0 },
  [DamageType.DARKNESS]: { core: 0xf0d0ff, glow: 0x9333ea, accent: 0x3b0764 },
  arcane: { core: 0xf5e8ff, glow: 0xa855f7, accent: 0xf0abfc },
  poison: { core: 0xecfccb, glow: 0x84cc16, accent: 0x4d7c0f },
  heal: { core: 0xf7fee7, glow: 0x84f06b, accent: 0xfde68a },
  blood: { core: 0xffe4e6, glow: 0xe11d48, accent: 0x881337 }
}

/** The three seals of Ysolde's first tome: fire, ice and lightning. */
export const SEAL_COLORS = [0xff7a00, 0x7dd3fc, 0xfde047]

const PHYSICAL = new Set([DamageType.SLASH, DamageType.PIERCE, DamageType.BLUNT])
const SUPPORT = new Set([TargetType.ALLY, TargetType.ALL_ALLIES, TargetType.SELF])
/** The beasts' blows that are not a weapon. */
const STRIKES: Record<string, Strike> = {
  claw: 'claw',
  rend: 'claw',
  pounce: 'claw',
  bite: 'bite',
  'venom-bite': 'bite',
  'kael-mace-blow': 'blunt',
  'kael-shield-bash': 'blunt',
  'brann-maul-smash': 'blunt',
  'brann-magma-fist': 'blunt',
  'brann-headbutt': 'blunt'
}
/** Signature skills: what they change of the look their type and targets give them. */
const OVERRIDES: Record<string, Partial<AttackEffect>> = {
  // Ysolde.
  'ysolde-seal-bolt': { delivery: 'bolt', look: 'arcane' },
  'ysolde-thunder-page': { delivery: 'zigzag' },
  'ysolde-prism-ray': { delivery: 'beam' },
  'ysolde-chain-lightning': { delivery: 'chain' },
  'ysolde-static-field': { delivery: 'chain' },
  'ysolde-spark': { delivery: 'zigzag' },
  'ysolde-meteor': { delivery: 'meteor' },
  'ysolde-fire-pillar': { delivery: 'rise' },
  'ysolde-frozen-tomb': { delivery: 'rise' },
  'ysolde-ice-shards': { delivery: 'shards' },
  'ysolde-blizzard': { delivery: 'storm' },
  'ysolde-absolute-zero': { delivery: 'wave' },
  'ysolde-convergence': { delivery: 'sky' },
  'ysolde-arcane-shield': { look: 'arcane', shield: true },
  'ysolde-frost-armor': { shield: true },
  // Brann throws and stamps.
  'brann-boulder': { approach: 'cast', delivery: 'bolt' },
  'brann-avalanche': { approach: 'cast', delivery: 'sky' },
  'brann-cataclysm': { approach: 'cast', delivery: 'sky' },
  'brann-earthsplitter': { approach: 'cast', delivery: 'rise' },
  'brann-war-stomp': { approach: 'cast', delivery: 'rise' },
  'brann-stone-skin': { shield: true },
  'brann-shield-wall': { shield: true },
  // Oren.
  'oren-seed-shot': { delivery: 'bolt' },
  'oren-barkskin': { shield: true },
  // Kael.
  'kael-guard': { shield: true },
  'kael-last-bastion': { shield: true },
  // Beasts.
  arrow: { approach: 'shoot', delivery: 'arrow', strike: null },
  'fire-breath': { delivery: 'breath' },
  'frost-breath': { delivery: 'breath' },
  'spore-cloud': { delivery: 'storm' },
  sandstorm: { delivery: 'storm' },
  shriek: { delivery: 'wave' },
  'soul-drain': { delivery: 'drain' },
  bulwark: { shield: true },
  harden: { shield: true }
}

/** The colors of a skill: its damage type, unless it poisons or heals. */
export function lookOf(skill: Skill): Look {
  if (skill.heal || skill.revive) {
    return 'heal'
  }

  const statuses = skill.statuses?.filter((status) => !status.onSelf) ?? []

  if (statuses.some((status) => status.type === StatusType.POISON) && !SUPPORT.has(skill.target)) {
    return 'poison'
  }

  return skill.damageType
}

/** How big it is drawn: the strongest skills and those that spend fury or charges, bigger. */
export function scaleOf(skill: Skill): number {
  const strong = skill.power >= 2.4 ? 1.45 : skill.power >= 1.8 ? 1.25 : 1

  return Math.min(1.6, strong * (skill.consumes ? 1.2 : 1))
}

/** The look of `skill` used by a fighter of `style` on `side`. */
export function attackEffectOf(skill: Skill, style: ActorStyle, side: 'hero' | 'enemy'): AttackEffect {
  const override = OVERRIDES[skill.id] ?? {}
  const look = override.look ?? lookOf(skill)
  const scale = override.scale ?? scaleOf(skill)

  if (SUPPORT.has(skill.target)) {
    return { approach: 'cast', delivery: 'aura', strike: null, look, scale, shield: override.shield }
  }

  const physical = PHYSICAL.has(skill.damageType)
  const approach: Approach =
    override.approach ??
    (style === 'archer'
      ? 'shoot'
      : style === 'mage'
        ? 'cast'
        : skill.stat === 'attack' && (physical || side === 'hero')
          ? 'lunge'
          : 'cast')

  if (approach === 'lunge') {
    const strike =
      override.strike ??
      STRIKES[skill.id] ??
      (skill.damageType === DamageType.BLUNT ? 'blunt' : skill.damageType === DamageType.PIERCE ? 'pierce' : 'slash')

    return { approach, delivery: 'contact', strike, look, scale }
  }

  if (approach === 'shoot') {
    return { approach, delivery: 'arrow', strike: null, look, scale }
  }

  const area = skill.target === TargetType.ALL_ENEMIES

  return { approach, delivery: override.delivery ?? castDelivery(skill.damageType, area), strike: null, look, scale }
}

/** How a spell of each type reaches one target, or all of them. */
function castDelivery(type: DamageType, area: boolean): Delivery {
  switch (type) {
    case DamageType.FIRE:
      return area ? 'wave' : 'bolt'
    case DamageType.ICE:
      return area ? 'sky' : 'lance'
    case DamageType.LIGHTNING:
      return area ? 'sky' : 'zigzag'
    case DamageType.EARTH:
      return 'rise'
    case DamageType.LIGHT:
      return area ? 'sky' : 'beam'
    case DamageType.DARKNESS:
      return area ? 'rise' : 'bolt'
    default:
      return area ? 'wave' : 'bolt'
  }
}
