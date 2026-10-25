import { DamageType } from '@/app/(protected)/(engine)/models/DamageType'
import { Skill } from '@/app/(protected)/(engine)/models/Skill'
import { StatusType } from '@/app/(protected)/(engine)/models/StatusType'
import { TargetType } from '@/app/(protected)/(engine)/models/TargetType'

/**
 * Catalog of skills (names in i18n, skills.<id>). Each hero starts with its
 * weapon attack and one special; the rest are bought in its skill tree
 * (data/talents.ts).
 */

const ELEMENTS = [
  DamageType.FIRE,
  DamageType.ICE,
  DamageType.LIGHTNING,
  DamageType.EARTH,
  DamageType.LIGHT,
  DamageType.DARKNESS
]
const HERO_SKILLS: Skill[] = [
  // Kael: sword.
  { id: 'kael-strike', cost: 0, target: TargetType.ENEMY, power: 1, stat: 'attack', damageType: DamageType.SLASH },
  { id: 'kael-firm-cut', cost: 12, target: TargetType.ENEMY, power: 1.7, stat: 'attack', damageType: DamageType.SLASH },
  {
    id: 'kael-flame-edge',
    cost: 15,
    target: TargetType.ENEMY,
    power: 1.4,
    stat: 'attack',
    damageType: DamageType.FIRE,
    statuses: [{ type: StatusType.BURN, chance: 0.3, turns: 2 }]
  },
  {
    id: 'kael-sweep',
    cost: 18,
    target: TargetType.ALL_ENEMIES,
    power: 0.8,
    stat: 'attack',
    damageType: DamageType.SLASH
  },
  {
    id: 'kael-guard',
    cost: 8,
    target: TargetType.SELF,
    power: 0,
    stat: 'attack',
    damageType: DamageType.SLASH,
    statuses: [{ type: StatusType.DEFENSE_UP, chance: 1, turns: 3 }]
  },
  {
    id: 'kael-whirlwind',
    cost: 30,
    target: TargetType.ALL_ENEMIES,
    power: 1.3,
    stat: 'attack',
    damageType: DamageType.SLASH,
    statuses: [{ type: StatusType.BLEED, chance: 0.3, turns: 2 }]
  },
  {
    id: 'kael-rally',
    cost: 20,
    target: TargetType.ALL_ALLIES,
    power: 0,
    stat: 'attack',
    damageType: DamageType.LIGHT,
    statuses: [{ type: StatusType.DEFENSE_UP, chance: 1, turns: 3 }]
  },
  {
    id: 'kael-inferno',
    cost: 34,
    target: TargetType.ALL_ENEMIES,
    power: 1.2,
    stat: 'attack',
    damageType: DamageType.FIRE,
    statuses: [{ type: StatusType.BURN, chance: 0.45, turns: 2 }]
  },
  // Sera: bow.
  { id: 'sera-shot', cost: 0, target: TargetType.ENEMY, power: 1, stat: 'attack', damageType: DamageType.PIERCE },
  {
    id: 'sera-piercing-arrow',
    cost: 12,
    target: TargetType.ENEMY,
    power: 1.6,
    stat: 'attack',
    damageType: DamageType.PIERCE,
    critBonus: 0.2
  },
  {
    id: 'sera-volley',
    cost: 18,
    target: TargetType.ALL_ENEMIES,
    power: 0.7,
    stat: 'attack',
    damageType: DamageType.PIERCE
  },
  {
    id: 'sera-blinding-arrow',
    cost: 10,
    target: TargetType.ENEMY,
    power: 0.8,
    stat: 'attack',
    damageType: DamageType.LIGHT,
    statuses: [{ type: StatusType.BLIND, chance: 0.6, turns: 2 }]
  },
  // Brann: axe.
  { id: 'brann-chop', cost: 0, target: TargetType.ENEMY, power: 1, stat: 'attack', damageType: DamageType.SLASH },
  { id: 'brann-cleave', cost: 14, target: TargetType.ENEMY, power: 1.9, stat: 'attack', damageType: DamageType.SLASH },
  {
    id: 'brann-earthsplitter',
    cost: 20,
    target: TargetType.ALL_ENEMIES,
    power: 0.9,
    stat: 'attack',
    damageType: DamageType.EARTH,
    statuses: [{ type: StatusType.STUN, chance: 0.2, turns: 1 }]
  },
  {
    id: 'brann-roar',
    cost: 8,
    target: TargetType.SELF,
    power: 0,
    stat: 'attack',
    damageType: DamageType.BLUNT,
    statuses: [{ type: StatusType.ATTACK_UP, chance: 1, turns: 3 }]
  },
  // Oren: staff, support.
  { id: 'oren-staff', cost: 0, target: TargetType.ENEMY, power: 1, stat: 'attack', damageType: DamageType.BLUNT },
  {
    id: 'oren-mend',
    cost: 12,
    target: TargetType.ALLY,
    power: 1.6,
    stat: 'special',
    damageType: DamageType.LIGHT,
    heal: true
  },
  {
    id: 'oren-grove',
    cost: 22,
    target: TargetType.ALL_ALLIES,
    power: 0.8,
    stat: 'special',
    damageType: DamageType.LIGHT,
    heal: true
  },
  {
    id: 'oren-thorns',
    cost: 12,
    target: TargetType.ENEMY,
    power: 1.2,
    stat: 'special',
    damageType: DamageType.EARTH,
    statuses: [{ type: StatusType.POISON, chance: 0.5, turns: 3 }]
  },
  // Ysolde: magic staff.
  { id: 'ysolde-rod', cost: 0, target: TargetType.ENEMY, power: 1, stat: 'attack', damageType: DamageType.BLUNT },
  {
    id: 'ysolde-fireball',
    cost: 14,
    target: TargetType.ENEMY,
    power: 1.7,
    stat: 'special',
    damageType: DamageType.FIRE,
    statuses: [{ type: StatusType.BURN, chance: 0.3, turns: 2 }]
  },
  {
    id: 'ysolde-frost-lance',
    cost: 14,
    target: TargetType.ENEMY,
    power: 1.4,
    stat: 'special',
    damageType: DamageType.ICE,
    statuses: [{ type: StatusType.FREEZE, chance: 0.25, turns: 1 }]
  },
  {
    id: 'ysolde-chain-lightning',
    cost: 24,
    target: TargetType.ALL_ENEMIES,
    power: 1,
    stat: 'special',
    damageType: DamageType.LIGHTNING
  }
]
const ENEMY_SKILLS: Skill[] = [
  { id: 'claw', cost: 0, target: TargetType.ENEMY, power: 1, stat: 'attack', damageType: DamageType.SLASH },
  { id: 'gore', cost: 10, target: TargetType.ENEMY, power: 1.6, stat: 'attack', damageType: DamageType.PIERCE },
  { id: 'bite', cost: 0, target: TargetType.ENEMY, power: 1, stat: 'attack', damageType: DamageType.PIERCE },
  {
    id: 'lunge',
    cost: 8,
    target: TargetType.ENEMY,
    power: 1.3,
    stat: 'attack',
    damageType: DamageType.PIERCE,
    critBonus: 0.2
  },
  {
    id: 'venom-bite',
    cost: 8,
    target: TargetType.ENEMY,
    power: 0.9,
    stat: 'attack',
    damageType: DamageType.PIERCE,
    statuses: [{ type: StatusType.POISON, chance: 0.5, turns: 3 }]
  },
  {
    id: 'rend',
    cost: 8,
    target: TargetType.ENEMY,
    power: 1,
    stat: 'attack',
    damageType: DamageType.SLASH,
    statuses: [{ type: StatusType.BLEED, chance: 0.5, turns: 3 }]
  },
  { id: 'bash', cost: 0, target: TargetType.ENEMY, power: 1, stat: 'attack', damageType: DamageType.BLUNT },
  {
    id: 'harden',
    cost: 8,
    target: TargetType.SELF,
    power: 0,
    stat: 'attack',
    damageType: DamageType.BLUNT,
    statuses: [{ type: StatusType.DEFENSE_UP, chance: 1, turns: 3 }]
  },
  { id: 'peck', cost: 0, target: TargetType.ENEMY, power: 0.8, stat: 'attack', damageType: DamageType.BLUNT },
  {
    id: 'mend',
    cost: 10,
    target: TargetType.ALLY,
    power: 1.4,
    stat: 'special',
    damageType: DamageType.LIGHT,
    heal: true
  },
  {
    id: 'hex',
    cost: 8,
    target: TargetType.ENEMY,
    power: 0.6,
    stat: 'special',
    damageType: DamageType.DARKNESS,
    statuses: [{ type: StatusType.ATTACK_DOWN, chance: 0.5, turns: 2 }]
  },
  {
    id: 'slam',
    cost: 16,
    target: TargetType.ALL_ENEMIES,
    power: 0.9,
    stat: 'attack',
    damageType: DamageType.BLUNT,
    statuses: [{ type: StatusType.STUN, chance: 0.15, turns: 1 }]
  },
  {
    id: 'roar',
    cost: 10,
    target: TargetType.SELF,
    power: 0,
    stat: 'attack',
    damageType: DamageType.BLUNT,
    statuses: [{ type: StatusType.ATTACK_UP, chance: 1, turns: 3 }]
  },
  // A bolt (one target) and a wave (all of them) of each element, for the casters.
  ...ELEMENTS.flatMap((element): Skill[] => [
    {
      id: `${element}-bolt`,
      cost: 0,
      target: TargetType.ENEMY,
      power: 1,
      stat: 'special',
      damageType: element,
      statuses: elementStatus(element)
    },
    {
      id: `${element}-wave`,
      cost: 14,
      target: TargetType.ALL_ENEMIES,
      power: 0.7,
      stat: 'special',
      damageType: element
    }
  ])
]

/** The status that the bolt of an element can leave. */
function elementStatus(element: DamageType): Skill['statuses'] {
  switch (element) {
    case DamageType.FIRE:
      return [{ type: StatusType.BURN, chance: 0.25, turns: 2 }]
    case DamageType.ICE:
      return [{ type: StatusType.FREEZE, chance: 0.15, turns: 1 }]
    case DamageType.DARKNESS:
      return [{ type: StatusType.BLIND, chance: 0.25, turns: 2 }]
    case DamageType.EARTH:
      return [{ type: StatusType.SPEED_DOWN, chance: 0.3, turns: 2 }]
    default:
      return undefined
  }
}

export const SKILLS: Skill[] = [...HERO_SKILLS, ...ENEMY_SKILLS]

const SKILLS_BY_ID = new Map(SKILLS.map((skill) => [skill.id, skill]))

export function getSkill(id: string): Skill {
  const skill = SKILLS_BY_ID.get(id)

  if (!skill) {
    throw new Error(`Unknown skill ${id}`)
  }

  return skill
}
