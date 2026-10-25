import { BonusesPart, SkillUpgrade } from '@/app/(protected)/(engine)/models/Bonuses'
import { CharacterId } from '@/app/(protected)/(engine)/models/CharacterId'
import { DamageType } from '@/app/(protected)/(engine)/models/DamageType'
import { StatusType } from '@/app/(protected)/(engine)/models/StatusType'
import { Talent } from '@/app/(protected)/(engine)/models/Talent'

/**
 * The skill trees: three branches of fifteen nodes per character (225 in
 * all). Each node is bought after the previous one of its branch, and costs
 * more the deeper it is: a whole tree costs 141 skill points, about three
 * playthroughs of levels.
 */

const { KAEL, SERA, BRANN, OREN, YSOLDE } = CharacterId
const { SLASH, BLUNT, FIRE, ICE, LIGHTNING, EARTH, DARKNESS } = DamageType
/** Cost of each node of a branch, by its depth. */
export const BRANCH_COSTS = [1, 1, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 5, 5, 5]

/** A node as the branches below write it: a special (its id is the skill), a passive or an upgrade. */
type Node = { id: string; skill?: true; bonuses?: BonusesPart }

const skill = (id: string): Node => ({ id, skill: true })
const passive = (id: string, bonuses: BonusesPart): Node => ({ id, bonuses })
const upgrade = (id: string, skillId: string, change: SkillUpgrade): Node => ({
  id,
  bonuses: { upgrades: { [skillId]: change } }
})
const stats = (values: BonusesPart['stats']): BonusesPart => ({ stats: values })
const onHit = (type: StatusType, chance: number, turns: number): BonusesPart => ({ onHit: [{ type, chance, turns }] })

/** A branch: each node requires the previous one, and its cost comes from its depth. */
function branch(characterId: CharacterId, index: number, nodes: Node[]): Talent[] {
  if (nodes.length !== BRANCH_COSTS.length) {
    throw new Error(`Branch ${index} of ${characterId} has ${nodes.length} nodes`)
  }

  return nodes.map((node, depth) => ({
    id: node.id,
    characterId,
    branch: index,
    cost: BRANCH_COSTS[depth],
    requires: depth > 0 ? nodes[depth - 1].id : undefined,
    skillId: node.skill ? node.id : undefined,
    bonuses: node.bonuses
  }))
}

export const TALENTS: Talent[] = [
  // Kael: Blade, Bulwark and Ember.
  ...branch(KAEL, 0, [
    passive('kael-sharpness', stats({ attack: 0.06 })),
    skill('kael-sweep'),
    passive('kael-precision', stats({ critChance: 0.05 })),
    upgrade('kael-deep-cut', 'kael-firm-cut', { power: 0.3, cost: 2 }),
    passive('kael-honed-steel', { damage: { [SLASH]: 0.1 } }),
    skill('kael-whirlwind'),
    upgrade('kael-cleaving-wind', 'kael-whirlwind', { power: 0.25 }),
    passive('kael-killer-instinct', { weakness: 0.15 }),
    skill('kael-execution'),
    passive('kael-relentless', stats({ attack: 0.08 })),
    passive('kael-keen-edge', stats({ critDamage: 0.25 })),
    upgrade('kael-headsman', 'kael-execution', { power: 0.3 }),
    passive('kael-bloodied-blade', onHit(StatusType.BLEED, 0.25, 2)),
    skill('kael-blade-dance'),
    passive('kael-master-swordsman', stats({ attack: 0.12, critChance: 0.05 }))
  ]),
  ...branch(KAEL, 1, [
    skill('kael-guard'),
    passive('kael-toughness', stats({ maxHealth: 0.08 })),
    upgrade('kael-steady-guard', 'kael-guard', { cost: 4 }),
    passive('kael-bulwark', { guard: 0.06 }),
    skill('kael-rally'),
    passive('kael-iron-will', stats({ defense: 0.1 })),
    passive('kael-second-wind', { regen: 0.02 }),
    upgrade('kael-rallying-cry', 'kael-rally', { cost: 6 }),
    skill('kael-shield-bash'),
    passive('kael-unbroken', stats({ maxHealth: 0.1 })),
    passive('kael-stalwart', { guard: 0.06 }),
    upgrade('kael-crushing-bash', 'kael-shield-bash', { statusChance: 0.25 }),
    passive('kael-vigilance', { initiative: 25, stats: { speed: 0.05 } }),
    skill('kael-last-bastion'),
    passive('kael-living-fortress', { guard: 0.08, stats: { maxHealth: 0.1 } })
  ]),
  ...branch(KAEL, 2, [
    skill('kael-flame-edge'),
    passive('kael-kindling', { damage: { [FIRE]: 0.15 } }),
    upgrade('kael-searing-edge', 'kael-flame-edge', { statusChance: 0.3 }),
    passive('kael-warm-blood', { focusRegen: 0.03 }),
    passive('kael-ember-heart', { lifesteal: 0.05 }),
    skill('kael-inferno'),
    passive('kael-blazing-soul', { damage: { [FIRE]: 0.15 } }),
    upgrade('kael-wildfire', 'kael-inferno', { power: 0.25 }),
    skill('kael-phoenix-cut'),
    passive('kael-ashen-will', { statusChance: 0.1 }),
    passive('kael-smoldering', onHit(StatusType.BURN, 0.2, 2)),
    upgrade('kael-phoenix-flame', 'kael-phoenix-cut', { power: 0.3, cost: 4 }),
    passive('kael-heart-of-fire', { damage: { [FIRE]: 0.2 } }),
    skill('kael-sunfall'),
    passive('kael-undying-ember', { lifesteal: 0.06, regen: 0.02 })
  ]),
  // Sera: Hunt, Wind and Shadow.
  ...branch(SERA, 0, [
    passive('sera-keen-eye', stats({ critChance: 0.05 })),
    passive('sera-deadly-aim', stats({ critDamage: 0.15 })),
    passive('sera-hunter', { weakness: 0.2 }),
    skill('sera-aimed-shot'),
    upgrade('sera-steady-hand', 'sera-piercing-arrow', { power: 0.25 }),
    passive('sera-predator', stats({ attack: 0.08 })),
    passive('sera-marked-prey', stats({ critChance: 0.05 })),
    upgrade('sera-true-aim', 'sera-aimed-shot', { power: 0.3 }),
    skill('sera-heartseeker'),
    passive('sera-lethal', stats({ critDamage: 0.25 })),
    passive('sera-tracker', { weakness: 0.15 }),
    passive('sera-hunters-focus', { focusRegen: 0.04 }),
    upgrade('sera-perfect-shot', 'sera-heartseeker', { power: 0.3, cost: 6 }),
    passive('sera-apex', stats({ attack: 0.12 })),
    passive('sera-deadeye', stats({ critChance: 0.08, critDamage: 0.2 }))
  ]),
  ...branch(SERA, 1, [
    skill('sera-volley'),
    passive('sera-light-step', { stats: { speed: 0.06 }, initiative: 20 }),
    upgrade('sera-rain', 'sera-volley', { power: 0.3 }),
    passive('sera-swift-arrows', stats({ speed: 0.05 })),
    skill('sera-gale-arrow'),
    skill('sera-tailwind'),
    passive('sera-fleet', { initiative: 20 }),
    passive('sera-storm-arrows', { damage: { [LIGHTNING]: 0.2 } }),
    skill('sera-arrow-storm'),
    passive('sera-windrunner', stats({ speed: 0.08 })),
    upgrade('sera-squall', 'sera-gale-arrow', { power: 0.2, statusChance: 0.3 }),
    passive('sera-quick-draw', { focusRegen: 0.04 }),
    upgrade('sera-endless-quiver', 'sera-arrow-storm', { cost: 8 }),
    skill('sera-hurricane'),
    passive('sera-wind-spirit', { stats: { speed: 0.1 }, guard: 0.06 })
  ]),
  ...branch(SERA, 2, [
    skill('sera-blinding-arrow'),
    passive('sera-venom-tips', onHit(StatusType.POISON, 0.2, 3)),
    passive('sera-shadow-veil', { guard: 0.06 }),
    skill('sera-toxic-cloud'),
    passive('sera-nightshade', { statusChance: 0.1 }),
    upgrade('sera-smoke-arrow', 'sera-blinding-arrow', { statusChance: 0.25 }),
    passive('sera-dark-arrows', { damage: { [DARKNESS]: 0.2 } }),
    skill('sera-crippling-shot'),
    passive('sera-ambush', { initiative: 30 }),
    passive('sera-evasion', { guard: 0.06 }),
    passive('sera-venom-master', { ...onHit(StatusType.POISON, 0.15, 3), statusChance: 0.05 }),
    passive('sera-shadowstep', stats({ speed: 0.06, critChance: 0.04 })),
    upgrade('sera-blight', 'sera-toxic-cloud', { power: 0.5, statusChance: 0.2 }),
    skill('sera-night-volley'),
    passive('sera-shade', { guard: 0.08, lifesteal: 0.04 })
  ]),
  // Brann: Fury, Stone and Earth.
  ...branch(BRANN, 0, [
    passive('brann-might', stats({ attack: 0.08 })),
    skill('brann-roar'),
    passive('brann-bloodlust', { lifesteal: 0.06 }),
    skill('brann-rampage'),
    passive('brann-wrath', stats({ attack: 0.06 })),
    passive('brann-reckless', stats({ critChance: 0.05, critDamage: 0.15 })),
    upgrade('brann-savage-rampage', 'brann-rampage', { power: 0.3 }),
    upgrade('brann-war-cry', 'brann-roar', { cost: 4 }),
    skill('brann-berserk'),
    passive('brann-blood-frenzy', { lifesteal: 0.05 }),
    skill('brann-carnage'),
    passive('brann-butcher', { damage: { [SLASH]: 0.15 } }),
    upgrade('brann-unstoppable', 'brann-carnage', { power: 0.3 }),
    skill('brann-world-breaker'),
    passive('brann-avatar-of-fury', stats({ attack: 0.12 }))
  ]),
  ...branch(BRANN, 1, [
    passive('brann-thick-hide', stats({ maxHealth: 0.1 })),
    passive('brann-iron-skin', stats({ defense: 0.1 })),
    passive('brann-unyielding', { regen: 0.03 }),
    skill('brann-stone-skin'),
    passive('brann-hardened', { guard: 0.05 }),
    passive('brann-mountain', stats({ maxHealth: 0.1 })),
    upgrade('brann-granite', 'brann-stone-skin', { cost: 4 }),
    passive('brann-endurance', { focusRegen: 0.03 }),
    skill('brann-shield-wall'),
    passive('brann-bedrock', stats({ defense: 0.12 })),
    passive('brann-iron-will', { guard: 0.06 }),
    upgrade('brann-mighty-wall', 'brann-shield-wall', { cost: 6 }),
    passive('brann-second-skin', { regen: 0.03 }),
    skill('brann-avalanche'),
    passive('brann-colossus', stats({ maxHealth: 0.15, defense: 0.1 }))
  ]),
  ...branch(BRANN, 2, [
    skill('brann-earthsplitter'),
    passive('brann-tremor', { damage: { [EARTH]: 0.2 } }),
    upgrade('brann-quake', 'brann-earthsplitter', { statusChance: 0.2 }),
    skill('brann-boulder'),
    passive('brann-heavy-hand', { damage: { [BLUNT]: 0.15 } }),
    upgrade('brann-fault-line', 'brann-earthsplitter', { power: 0.25 }),
    passive('brann-stonecutter', { weakness: 0.15 }),
    upgrade('brann-landslide', 'brann-boulder', { power: 0.3 }),
    skill('brann-hammerfall'),
    passive('brann-deep-roots', stats({ defense: 0.08, maxHealth: 0.06 })),
    passive('brann-seismic', { statusChance: 0.1 }),
    passive('brann-shatter', onHit(StatusType.DEFENSE_DOWN, 0.2, 2)),
    passive('brann-mountain-heart', { damage: { [EARTH]: 0.25 } }),
    skill('brann-cataclysm'),
    passive('brann-earthshaker', { stats: { attack: 0.1 }, statusChance: 0.1 })
  ]),
  // Oren: Sap, Grove and Thorn.
  ...branch(OREN, 0, [
    passive('oren-deep-roots', stats({ special: 0.08 })),
    upgrade('oren-fresh-sap', 'oren-mend', { power: 0.25, cost: 2 }),
    passive('oren-wellspring', { focusRegen: 0.06 }),
    skill('oren-purify'),
    upgrade('oren-lifebloom', 'oren-mend', { power: 0.25 }),
    skill('oren-rejuvenate'),
    passive('oren-verdant', stats({ special: 0.08 })),
    skill('oren-cleansing-rain'),
    passive('oren-deep-sap', { focusRegen: 0.04 }),
    upgrade('oren-flourish', 'oren-rejuvenate', { cost: 6 }),
    passive('oren-life-spring', { regen: 0.03 }),
    skill('oren-rebirth'),
    passive('oren-evergreen', stats({ special: 0.12 })),
    skill('oren-tree-of-life'),
    passive('oren-world-tree', { regen: 0.03, focusRegen: 0.04 })
  ]),
  ...branch(OREN, 1, [
    skill('oren-grove'),
    passive('oren-bark', stats({ defense: 0.1 })),
    passive('oren-renewal', { regen: 0.03 }),
    skill('oren-barkskin'),
    upgrade('oren-thick-grove', 'oren-grove', { power: 0.25 }),
    skill('oren-blessing'),
    passive('oren-oak-heart', stats({ maxHealth: 0.1 })),
    passive('oren-sheltering', { guard: 0.06 }),
    skill('oren-swiftwood'),
    passive('oren-ancient-bark', stats({ defense: 0.1 })),
    upgrade('oren-sacred-grove', 'oren-grove', { cost: 6 }),
    upgrade('oren-mighty-blessing', 'oren-blessing', { cost: 6 }),
    passive('oren-heartwood', stats({ maxHealth: 0.12 })),
    skill('oren-sanctuary'),
    passive('oren-guardian-spirit', { guard: 0.08, regen: 0.02 })
  ]),
  ...branch(OREN, 2, [
    skill('oren-thorns'),
    passive('oren-venom', { statusChance: 0.15 }),
    upgrade('oren-briar', 'oren-thorns', { power: 0.4 }),
    skill('oren-entangle'),
    passive('oren-sting', { damage: { [EARTH]: 0.15 } }),
    skill('oren-poison-bloom'),
    passive('oren-wither', onHit(StatusType.ATTACK_DOWN, 0.25, 2)),
    upgrade('oren-strangle', 'oren-entangle', { statusChance: 0.2 }),
    skill('oren-rot'),
    passive('oren-toxic-sap', { statusChance: 0.1 }),
    upgrade('oren-blooming-death', 'oren-poison-bloom', { power: 0.4 }),
    passive('oren-thorned-staff', stats({ attack: 0.12 })),
    passive('oren-nature-wrath', { damage: { [EARTH]: 0.25 } }),
    skill('oren-wild-growth'),
    passive('oren-druid', { stats: { special: 0.1 }, statusChance: 0.1 })
  ]),
  // Ysolde: Fire, Ice and Storm.
  ...branch(YSOLDE, 0, [
    passive('ysolde-pyromancy', { damage: { [FIRE]: 0.15 } }),
    upgrade('ysolde-firestorm', 'ysolde-fireball', { power: 0.25 }),
    passive('ysolde-arcane-mind', stats({ special: 0.1 })),
    skill('ysolde-flame-wave'),
    passive('ysolde-kindle', { statusChance: 0.1 }),
    skill('ysolde-combustion'),
    upgrade('ysolde-inferno-wave', 'ysolde-flame-wave', { power: 0.25 }),
    passive('ysolde-ember-mind', { focusRegen: 0.04 }),
    skill('ysolde-meteor'),
    passive('ysolde-pyre', { damage: { [FIRE]: 0.2 } }),
    upgrade('ysolde-immolate', 'ysolde-combustion', { power: 0.3 }),
    passive('ysolde-wildfire', onHit(StatusType.BURN, 0.25, 2)),
    passive('ysolde-firelord', stats({ special: 0.1 })),
    upgrade('ysolde-phoenix', 'ysolde-meteor', { power: 0.2, cost: 8 }),
    passive('ysolde-sun-heart', { damage: { [FIRE]: 0.25 }, stats: { critChance: 0.05 } })
  ]),
  ...branch(YSOLDE, 1, [
    skill('ysolde-frost-lance'),
    passive('ysolde-cryomancy', { damage: { [ICE]: 0.15 } }),
    upgrade('ysolde-deep-freeze', 'ysolde-frost-lance', { statusChance: 0.2 }),
    skill('ysolde-frost-armor'),
    passive('ysolde-chill', { guard: 0.05 }),
    skill('ysolde-blizzard'),
    passive('ysolde-glacial', stats({ maxHealth: 0.12 })),
    passive('ysolde-shatter', { weakness: 0.2 }),
    skill('ysolde-frozen-tomb'),
    passive('ysolde-winter-mind', { focusRegen: 0.04 }),
    upgrade('ysolde-whiteout', 'ysolde-blizzard', { power: 0.25, statusChance: 0.1 }),
    passive('ysolde-ice-heart', { damage: { [ICE]: 0.2 } }),
    upgrade('ysolde-permafrost', 'ysolde-frozen-tomb', { cost: 8 }),
    skill('ysolde-absolute-zero'),
    passive('ysolde-frost-queen', { damage: { [ICE]: 0.2 }, guard: 0.06 })
  ]),
  ...branch(YSOLDE, 2, [
    skill('ysolde-chain-lightning'),
    passive('ysolde-static', { damage: { [LIGHTNING]: 0.15 } }),
    passive('ysolde-focus', { focusRegen: 0.06 }),
    skill('ysolde-spark'),
    passive('ysolde-quickening', stats({ speed: 0.06 })),
    skill('ysolde-convergence'),
    upgrade('ysolde-overcharge', 'ysolde-chain-lightning', { power: 0.25 }),
    passive('ysolde-storm-mind', stats({ critChance: 0.05 })),
    skill('ysolde-thunderclap'),
    passive('ysolde-conduit', stats({ special: 0.1 })),
    upgrade('ysolde-arc', 'ysolde-convergence', { power: 0.3 }),
    passive('ysolde-tempest-mind', { focusRegen: 0.04 }),
    passive('ysolde-storm-heart', { damage: { [LIGHTNING]: 0.25 } }),
    skill('ysolde-heavens-wrath'),
    passive('ysolde-archmage', stats({ special: 0.12, critDamage: 0.25 }))
  ])
]

const TALENTS_BY_ID = new Map(TALENTS.map((talent) => [talent.id, talent]))

export function getTalent(id: string): Talent {
  const talent = TALENTS_BY_ID.get(id)

  if (!talent) {
    throw new Error(`Unknown talent ${id}`)
  }

  return talent
}

/** The skill tree of a character. */
export function getTree(characterId: CharacterId): Talent[] {
  return TALENTS.filter((talent) => talent.characterId === characterId)
}

/** Skill points that the whole tree of a character costs. */
export function getTreeCost(characterId: CharacterId): number {
  return getTree(characterId).reduce((sum, talent) => sum + talent.cost, 0)
}
