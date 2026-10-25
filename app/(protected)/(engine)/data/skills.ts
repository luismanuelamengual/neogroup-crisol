import { DamageType } from '@/app/(protected)/(engine)/models/DamageType'
import { Skill, SkillStatus } from '@/app/(protected)/(engine)/models/Skill'
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
    id: 'kael-stance',
    cost: 0,
    target: TargetType.SELF,
    power: 0,
    stat: 'attack',
    damageType: DamageType.SLASH,
    stance: true
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
/** The specials of the skill trees (data/talents.ts), beyond the first ones. */
const TREE_SKILLS: Skill[] = [
  {
    id: 'kael-execution',
    cost: 32,
    target: TargetType.ENEMY,
    power: 2.6,
    stat: 'attack',
    damageType: DamageType.SLASH,
    critBonus: 0.15
  },
  {
    id: 'kael-blade-dance',
    cost: 45,
    target: TargetType.ALL_ENEMIES,
    power: 1.6,
    stat: 'attack',
    damageType: DamageType.SLASH,
    statuses: [st('BLEED', 0.4, 2)]
  },
  {
    id: 'kael-shield-bash',
    cost: 18,
    target: TargetType.ENEMY,
    power: 1.2,
    stat: 'attack',
    damageType: DamageType.BLUNT,
    statuses: [st('STUN', 0.35, 1)]
  },
  {
    id: 'kael-last-bastion',
    cost: 36,
    target: TargetType.ALL_ALLIES,
    power: 0,
    stat: 'attack',
    damageType: DamageType.LIGHT,
    statuses: [st('DEFENSE_UP', 1, 3), st('ATTACK_UP', 1, 3)]
  },
  {
    id: 'kael-phoenix-cut',
    cost: 26,
    target: TargetType.ENEMY,
    power: 2.0,
    stat: 'attack',
    damageType: DamageType.FIRE,
    statuses: [st('BURN', 0.5, 2)]
  },
  {
    id: 'kael-sunfall',
    cost: 50,
    target: TargetType.ALL_ENEMIES,
    power: 2.0,
    stat: 'attack',
    damageType: DamageType.FIRE,
    statuses: [st('BURN', 0.6, 3)]
  },
  {
    id: 'sera-aimed-shot',
    cost: 22,
    target: TargetType.ENEMY,
    power: 2.2,
    stat: 'attack',
    damageType: DamageType.PIERCE,
    critBonus: 0.3
  },
  {
    id: 'sera-heartseeker',
    cost: 34,
    target: TargetType.ENEMY,
    power: 2.8,
    stat: 'attack',
    damageType: DamageType.PIERCE,
    critBonus: 0.4
  },
  {
    id: 'sera-gale-arrow',
    cost: 16,
    target: TargetType.ENEMY,
    power: 1.6,
    stat: 'attack',
    damageType: DamageType.LIGHTNING,
    statuses: [st('SPEED_DOWN', 0.5, 2)]
  },
  {
    id: 'sera-tailwind',
    cost: 20,
    target: TargetType.ALL_ALLIES,
    power: 0,
    stat: 'attack',
    damageType: DamageType.LIGHTNING,
    statuses: [st('SPEED_UP', 1, 3)]
  },
  {
    id: 'sera-arrow-storm',
    cost: 34,
    target: TargetType.ALL_ENEMIES,
    power: 1.3,
    stat: 'attack',
    damageType: DamageType.PIERCE
  },
  {
    id: 'sera-hurricane',
    cost: 48,
    target: TargetType.ALL_ENEMIES,
    power: 1.8,
    stat: 'attack',
    damageType: DamageType.LIGHTNING,
    statuses: [st('STUN', 0.2, 1)]
  },
  {
    id: 'sera-toxic-cloud',
    cost: 20,
    target: TargetType.ALL_ENEMIES,
    power: 0.5,
    stat: 'attack',
    damageType: DamageType.DARKNESS,
    statuses: [st('POISON', 0.6, 3)]
  },
  {
    id: 'sera-crippling-shot',
    cost: 18,
    target: TargetType.ENEMY,
    power: 1.4,
    stat: 'attack',
    damageType: DamageType.PIERCE,
    statuses: [st('DEFENSE_DOWN', 0.7, 3), st('SPEED_DOWN', 0.4, 2)]
  },
  {
    id: 'sera-night-volley',
    cost: 44,
    target: TargetType.ALL_ENEMIES,
    power: 1.6,
    stat: 'attack',
    damageType: DamageType.DARKNESS,
    statuses: [st('BLIND', 0.5, 2)]
  },
  {
    id: 'brann-rampage',
    cost: 16,
    target: TargetType.ENEMY,
    power: 1.6,
    stat: 'attack',
    damageType: DamageType.SLASH,
    consumes: 'fury'
  },
  {
    id: 'brann-berserk',
    cost: 18,
    target: TargetType.SELF,
    power: 0,
    stat: 'attack',
    damageType: DamageType.SLASH,
    statuses: [st('ATTACK_UP', 1, 3), st('SPEED_UP', 1, 3), st('DEFENSE_DOWN', 1, 3)]
  },
  {
    id: 'brann-carnage',
    cost: 30,
    target: TargetType.ALL_ENEMIES,
    power: 1.4,
    stat: 'attack',
    damageType: DamageType.SLASH,
    consumes: 'fury'
  },
  {
    id: 'brann-world-breaker',
    cost: 44,
    target: TargetType.ENEMY,
    power: 3.2,
    stat: 'attack',
    damageType: DamageType.BLUNT,
    statuses: [st('STUN', 0.3, 1)]
  },
  {
    id: 'brann-stone-skin',
    cost: 10,
    target: TargetType.SELF,
    power: 0,
    stat: 'attack',
    damageType: DamageType.EARTH,
    statuses: [st('DEFENSE_UP', 1, 4)]
  },
  {
    id: 'brann-shield-wall',
    cost: 22,
    target: TargetType.ALL_ALLIES,
    power: 0,
    stat: 'attack',
    damageType: DamageType.EARTH,
    statuses: [st('DEFENSE_UP', 1, 3)]
  },
  {
    id: 'brann-avalanche',
    cost: 40,
    target: TargetType.ALL_ENEMIES,
    power: 1.6,
    stat: 'attack',
    damageType: DamageType.EARTH,
    statuses: [st('SPEED_DOWN', 0.5, 2)]
  },
  {
    id: 'brann-boulder',
    cost: 16,
    target: TargetType.ENEMY,
    power: 1.8,
    stat: 'attack',
    damageType: DamageType.EARTH,
    statuses: [st('SPEED_DOWN', 0.5, 2)]
  },
  {
    id: 'brann-hammerfall',
    cost: 28,
    target: TargetType.ENEMY,
    power: 2.4,
    stat: 'attack',
    damageType: DamageType.BLUNT,
    statuses: [st('STUN', 0.35, 1)]
  },
  {
    id: 'brann-cataclysm',
    cost: 50,
    target: TargetType.ALL_ENEMIES,
    power: 2.0,
    stat: 'attack',
    damageType: DamageType.EARTH,
    statuses: [st('STUN', 0.3, 1)]
  },
  {
    id: 'oren-purify',
    cost: 10,
    target: TargetType.ALLY,
    power: 0.6,
    stat: 'special',
    damageType: DamageType.LIGHT,
    heal: true,
    cure: true
  },
  {
    id: 'oren-rejuvenate',
    cost: 22,
    target: TargetType.ALLY,
    power: 2.4,
    stat: 'special',
    damageType: DamageType.LIGHT,
    heal: true
  },
  {
    id: 'oren-cleansing-rain',
    cost: 24,
    target: TargetType.ALL_ALLIES,
    power: 0.5,
    stat: 'special',
    damageType: DamageType.LIGHT,
    heal: true,
    cure: true
  },
  {
    id: 'oren-rebirth',
    cost: 40,
    target: TargetType.ALLY,
    power: 1.2,
    stat: 'special',
    damageType: DamageType.LIGHT,
    heal: true,
    revive: true
  },
  {
    id: 'oren-tree-of-life',
    cost: 46,
    target: TargetType.ALL_ALLIES,
    power: 1.6,
    stat: 'special',
    damageType: DamageType.LIGHT,
    heal: true,
    cure: true
  },
  {
    id: 'oren-barkskin',
    cost: 12,
    target: TargetType.ALLY,
    power: 0.4,
    stat: 'special',
    damageType: DamageType.EARTH,
    heal: true,
    statuses: [st('DEFENSE_UP', 1, 3)]
  },
  {
    id: 'oren-blessing',
    cost: 22,
    target: TargetType.ALL_ALLIES,
    power: 0,
    stat: 'special',
    damageType: DamageType.LIGHT,
    statuses: [st('ATTACK_UP', 1, 3)]
  },
  {
    id: 'oren-swiftwood',
    cost: 22,
    target: TargetType.ALL_ALLIES,
    power: 0,
    stat: 'special',
    damageType: DamageType.EARTH,
    statuses: [st('SPEED_UP', 1, 3)]
  },
  {
    id: 'oren-sanctuary',
    cost: 48,
    target: TargetType.ALL_ALLIES,
    power: 0.8,
    stat: 'special',
    damageType: DamageType.LIGHT,
    heal: true,
    statuses: [st('DEFENSE_UP', 1, 3), st('ATTACK_UP', 1, 3)]
  },
  {
    id: 'oren-entangle',
    cost: 14,
    target: TargetType.ENEMY,
    power: 0.8,
    stat: 'special',
    damageType: DamageType.EARTH,
    statuses: [st('SPEED_DOWN', 0.7, 2), st('STUN', 0.25, 1)]
  },
  {
    id: 'oren-poison-bloom',
    cost: 22,
    target: TargetType.ALL_ENEMIES,
    power: 0.6,
    stat: 'special',
    damageType: DamageType.EARTH,
    statuses: [st('POISON', 0.6, 3)]
  },
  {
    id: 'oren-rot',
    cost: 20,
    target: TargetType.ENEMY,
    power: 1.6,
    stat: 'special',
    damageType: DamageType.DARKNESS,
    statuses: [st('DEFENSE_DOWN', 0.6, 3), st('POISON', 0.5, 3)]
  },
  {
    id: 'oren-wild-growth',
    cost: 46,
    target: TargetType.ALL_ENEMIES,
    power: 1.8,
    stat: 'special',
    damageType: DamageType.EARTH,
    statuses: [st('STUN', 0.25, 1), st('SPEED_DOWN', 0.5, 2)]
  },
  {
    id: 'ysolde-flame-wave',
    cost: 22,
    target: TargetType.ALL_ENEMIES,
    power: 1.0,
    stat: 'special',
    damageType: DamageType.FIRE,
    statuses: [st('BURN', 0.3, 2)]
  },
  {
    id: 'ysolde-combustion',
    cost: 26,
    target: TargetType.ENEMY,
    power: 2.0,
    stat: 'special',
    damageType: DamageType.FIRE,
    consumes: 'charges'
  },
  {
    id: 'ysolde-meteor',
    cost: 44,
    target: TargetType.ALL_ENEMIES,
    power: 1.8,
    stat: 'special',
    damageType: DamageType.FIRE,
    statuses: [st('BURN', 0.5, 2)]
  },
  {
    id: 'ysolde-frost-armor',
    cost: 10,
    target: TargetType.SELF,
    power: 0,
    stat: 'special',
    damageType: DamageType.ICE,
    statuses: [st('DEFENSE_UP', 1, 4)]
  },
  {
    id: 'ysolde-blizzard',
    cost: 26,
    target: TargetType.ALL_ENEMIES,
    power: 1.0,
    stat: 'special',
    damageType: DamageType.ICE,
    statuses: [st('FREEZE', 0.2, 1)]
  },
  {
    id: 'ysolde-frozen-tomb',
    cost: 30,
    target: TargetType.ENEMY,
    power: 1.5,
    stat: 'special',
    damageType: DamageType.ICE,
    statuses: [st('FREEZE', 0.6, 1)]
  },
  {
    id: 'ysolde-absolute-zero',
    cost: 52,
    target: TargetType.ALL_ENEMIES,
    power: 2.0,
    stat: 'special',
    damageType: DamageType.ICE,
    statuses: [st('FREEZE', 0.35, 1)]
  },
  {
    id: 'ysolde-spark',
    cost: 12,
    target: TargetType.ENEMY,
    power: 1.5,
    stat: 'special',
    damageType: DamageType.LIGHTNING,
    statuses: [st('STUN', 0.25, 1)]
  },
  {
    id: 'ysolde-convergence',
    cost: 30,
    target: TargetType.ALL_ENEMIES,
    power: 1.2,
    stat: 'special',
    damageType: DamageType.LIGHTNING,
    consumes: 'charges'
  },
  {
    id: 'ysolde-thunderclap',
    cost: 34,
    target: TargetType.ALL_ENEMIES,
    power: 1.3,
    stat: 'special',
    damageType: DamageType.LIGHTNING,
    statuses: [st('STUN', 0.2, 1)]
  },
  {
    id: 'ysolde-heavens-wrath',
    cost: 54,
    target: TargetType.ALL_ENEMIES,
    power: 2.2,
    stat: 'special',
    damageType: DamageType.LIGHTNING,
    statuses: [st('STUN', 0.3, 1)]
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
  // Skills of the full bestiary.
  { id: 'arrow', cost: 0, target: TargetType.ENEMY, power: 1, stat: 'attack', damageType: DamageType.PIERCE },
  {
    id: 'sting',
    cost: 8,
    target: TargetType.ENEMY,
    power: 1.2,
    stat: 'attack',
    damageType: DamageType.PIERCE,
    statuses: [st('POISON', 0.5, 3)]
  },
  {
    id: 'pounce',
    cost: 8,
    target: TargetType.ENEMY,
    power: 1.5,
    stat: 'attack',
    damageType: DamageType.SLASH,
    critBonus: 0.2
  },
  {
    id: 'impale',
    cost: 10,
    target: TargetType.ENEMY,
    power: 1.6,
    stat: 'attack',
    damageType: DamageType.PIERCE,
    statuses: [st('BLEED', 0.4, 3)]
  },
  { id: 'crush', cost: 12, target: TargetType.ENEMY, power: 1.8, stat: 'attack', damageType: DamageType.BLUNT },
  {
    id: 'web',
    cost: 8,
    target: TargetType.ENEMY,
    power: 0.5,
    stat: 'attack',
    damageType: DamageType.PIERCE,
    statuses: [st('SPEED_DOWN', 0.7, 2)]
  },
  {
    id: 'spore-cloud',
    cost: 12,
    target: TargetType.ALL_ENEMIES,
    power: 0.4,
    stat: 'special',
    damageType: DamageType.EARTH,
    statuses: [st('POISON', 0.4, 3)]
  },
  {
    id: 'sandstorm',
    cost: 12,
    target: TargetType.ALL_ENEMIES,
    power: 0.7,
    stat: 'special',
    damageType: DamageType.EARTH,
    statuses: [st('BLIND', 0.3, 2)]
  },
  {
    id: 'quake',
    cost: 14,
    target: TargetType.ALL_ENEMIES,
    power: 0.9,
    stat: 'attack',
    damageType: DamageType.EARTH,
    statuses: [st('SPEED_DOWN', 0.4, 2)]
  },
  {
    id: 'frost-breath',
    cost: 14,
    target: TargetType.ALL_ENEMIES,
    power: 0.8,
    stat: 'special',
    damageType: DamageType.ICE,
    statuses: [st('FREEZE', 0.15, 1)]
  },
  {
    id: 'fire-breath',
    cost: 14,
    target: TargetType.ALL_ENEMIES,
    power: 0.9,
    stat: 'special',
    damageType: DamageType.FIRE,
    statuses: [st('BURN', 0.3, 2)]
  },
  {
    id: 'shriek',
    cost: 10,
    target: TargetType.ALL_ENEMIES,
    power: 0.3,
    stat: 'special',
    damageType: DamageType.DARKNESS,
    statuses: [st('ATTACK_DOWN', 0.5, 2)]
  },
  {
    id: 'curse',
    cost: 10,
    target: TargetType.ENEMY,
    power: 0.6,
    stat: 'special',
    damageType: DamageType.DARKNESS,
    statuses: [st('DEFENSE_DOWN', 0.7, 3)]
  },
  {
    id: 'soul-drain',
    cost: 12,
    target: TargetType.ENEMY,
    power: 1.3,
    stat: 'special',
    damageType: DamageType.DARKNESS,
    statuses: [st('ATTACK_DOWN', 0.4, 2)]
  },
  { id: 'smite', cost: 10, target: TargetType.ENEMY, power: 1.4, stat: 'special', damageType: DamageType.LIGHT },
  {
    id: 'war-cry',
    cost: 12,
    target: TargetType.ALL_ALLIES,
    power: 0,
    stat: 'attack',
    damageType: DamageType.BLUNT,
    statuses: [st('ATTACK_UP', 1, 3)]
  },
  {
    id: 'bulwark',
    cost: 12,
    target: TargetType.ALL_ALLIES,
    power: 0,
    stat: 'attack',
    damageType: DamageType.EARTH,
    statuses: [st('DEFENSE_UP', 1, 3)]
  },
  {
    id: 'chorus',
    cost: 16,
    target: TargetType.ALL_ALLIES,
    power: 0.8,
    stat: 'special',
    damageType: DamageType.LIGHT,
    heal: true
  },
  {
    id: 'entangle-roots',
    cost: 12,
    target: TargetType.ALL_ENEMIES,
    power: 0.5,
    stat: 'special',
    damageType: DamageType.EARTH,
    statuses: [st('SPEED_DOWN', 0.6, 2), st('STUN', 0.1, 1)]
  },
  {
    id: 'blood-howl',
    cost: 10,
    target: TargetType.SELF,
    power: 0,
    stat: 'attack',
    damageType: DamageType.SLASH,
    statuses: [st('ATTACK_UP', 1, 3), st('SPEED_UP', 1, 3)]
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

/** A status a skill can leave (shorthand of the catalogs). */
function st(type: keyof typeof StatusType, chance: number, turns: number): SkillStatus {
  return { type: StatusType[type], chance, turns }
}

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

export const SKILLS: Skill[] = [...HERO_SKILLS, ...TREE_SKILLS, ...ENEMY_SKILLS]

const SKILLS_BY_ID = new Map(SKILLS.map((skill) => [skill.id, skill]))

export function getSkill(id: string): Skill {
  const skill = SKILLS_BY_ID.get(id)

  if (!skill) {
    throw new Error(`Unknown skill ${id}`)
  }

  return skill
}
