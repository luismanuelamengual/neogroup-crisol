import { CharacterId } from '@/app/(protected)/(engine)/models/CharacterId'
import { DamageType } from '@/app/(protected)/(engine)/models/DamageType'
import { StatusType } from '@/app/(protected)/(engine)/models/StatusType'
import { Talent } from '@/app/(protected)/(engine)/models/Talent'

/**
 * The skill trees: three branches per character, each node bought with skill
 * points after the one it requires. Kael's tree is the one of the vertical
 * slice; the trees of the others are short until the content of phase 6
 * (about 45 nodes each).
 */

const { KAEL, SERA, BRANN, OREN, YSOLDE } = CharacterId

/** A branch: each node requires the previous one. */
function branch(characterId: CharacterId, index: number, nodes: Omit<Talent, 'characterId' | 'branch'>[]): Talent[] {
  return nodes.map((node, position) => ({
    ...node,
    characterId,
    branch: index,
    requires: position > 0 ? nodes[position - 1].id : undefined
  }))
}

export const TALENTS: Talent[] = [
  // Kael: Blade, Bulwark and Ember.
  ...branch(KAEL, 0, [
    { id: 'kael-sharpness', cost: 1, bonuses: { stats: { attack: 0.06 } } },
    { id: 'kael-sweep', cost: 2, skillId: 'kael-sweep' },
    { id: 'kael-precision', cost: 2, bonuses: { stats: { critChance: 0.05 } } },
    { id: 'kael-deep-cut', cost: 3, bonuses: { upgrades: { 'kael-firm-cut': { power: 0.3, cost: 2 } } } },
    { id: 'kael-whirlwind', cost: 4, skillId: 'kael-whirlwind' }
  ]),
  ...branch(KAEL, 1, [
    { id: 'kael-guard', cost: 1, skillId: 'kael-guard' },
    { id: 'kael-toughness', cost: 1, bonuses: { stats: { maxHealth: 0.08 } } },
    { id: 'kael-steady-guard', cost: 2, bonuses: { upgrades: { 'kael-guard': { cost: 4 } } } },
    { id: 'kael-bulwark', cost: 3, bonuses: { guard: 0.06 } },
    { id: 'kael-rally', cost: 3, skillId: 'kael-rally' }
  ]),
  ...branch(KAEL, 2, [
    { id: 'kael-flame-edge', cost: 2, skillId: 'kael-flame-edge' },
    { id: 'kael-kindling', cost: 2, bonuses: { damage: { [DamageType.FIRE]: 0.15 } } },
    { id: 'kael-searing-edge', cost: 3, bonuses: { upgrades: { 'kael-flame-edge': { statusChance: 0.3 } } } },
    { id: 'kael-ember-heart', cost: 4, bonuses: { lifesteal: 0.05 } },
    { id: 'kael-inferno', cost: 5, skillId: 'kael-inferno' }
  ]),
  // Sera: Hunt, Wind and Shadow.
  ...branch(SERA, 0, [
    { id: 'sera-keen-eye', cost: 1, bonuses: { stats: { critChance: 0.05 } } },
    { id: 'sera-deadly-aim', cost: 2, bonuses: { stats: { critDamage: 0.15 } } },
    { id: 'sera-hunter', cost: 3, bonuses: { weakness: 0.2 } }
  ]),
  ...branch(SERA, 1, [
    { id: 'sera-volley', cost: 2, skillId: 'sera-volley' },
    { id: 'sera-light-step', cost: 2, bonuses: { stats: { speed: 0.06 }, initiative: 20 } },
    { id: 'sera-rain', cost: 3, bonuses: { upgrades: { 'sera-volley': { power: 0.3 } } } }
  ]),
  ...branch(SERA, 2, [
    { id: 'sera-blinding-arrow', cost: 1, skillId: 'sera-blinding-arrow' },
    { id: 'sera-venom-tips', cost: 2, bonuses: { onHit: [{ type: StatusType.POISON, chance: 0.2, turns: 3 }] } },
    { id: 'sera-shadow-veil', cost: 3, bonuses: { guard: 0.06 } }
  ]),
  // Brann: Fury, Stone and Earth.
  ...branch(BRANN, 0, [
    { id: 'brann-might', cost: 1, bonuses: { stats: { attack: 0.08 } } },
    { id: 'brann-roar', cost: 2, skillId: 'brann-roar' },
    { id: 'brann-bloodlust', cost: 3, bonuses: { lifesteal: 0.06 } }
  ]),
  ...branch(BRANN, 1, [
    { id: 'brann-thick-hide', cost: 1, bonuses: { stats: { maxHealth: 0.1 } } },
    { id: 'brann-iron-skin', cost: 2, bonuses: { stats: { defense: 0.1 } } },
    { id: 'brann-unyielding', cost: 3, bonuses: { regen: 0.03 } }
  ]),
  ...branch(BRANN, 2, [
    { id: 'brann-earthsplitter', cost: 2, skillId: 'brann-earthsplitter' },
    { id: 'brann-tremor', cost: 2, bonuses: { damage: { [DamageType.EARTH]: 0.2 } } },
    { id: 'brann-quake', cost: 3, bonuses: { upgrades: { 'brann-earthsplitter': { statusChance: 0.2 } } } }
  ]),
  // Oren: Sap, Grove and Thorn.
  ...branch(OREN, 0, [
    { id: 'oren-deep-roots', cost: 1, bonuses: { stats: { special: 0.08 } } },
    { id: 'oren-fresh-sap', cost: 2, bonuses: { upgrades: { 'oren-mend': { power: 0.25, cost: 2 } } } },
    { id: 'oren-wellspring', cost: 3, bonuses: { focusRegen: 0.06 } }
  ]),
  ...branch(OREN, 1, [
    { id: 'oren-grove', cost: 2, skillId: 'oren-grove' },
    { id: 'oren-bark', cost: 2, bonuses: { stats: { defense: 0.1 } } },
    { id: 'oren-renewal', cost: 3, bonuses: { regen: 0.03 } }
  ]),
  ...branch(OREN, 2, [
    { id: 'oren-thorns', cost: 1, skillId: 'oren-thorns' },
    { id: 'oren-venom', cost: 2, bonuses: { statusChance: 0.15 } },
    { id: 'oren-briar', cost: 3, bonuses: { upgrades: { 'oren-thorns': { power: 0.4 } } } }
  ]),
  // Ysolde: Fire, Ice and Storm.
  ...branch(YSOLDE, 0, [
    { id: 'ysolde-pyromancy', cost: 1, bonuses: { damage: { [DamageType.FIRE]: 0.15 } } },
    { id: 'ysolde-firestorm', cost: 2, bonuses: { upgrades: { 'ysolde-fireball': { power: 0.25 } } } },
    { id: 'ysolde-arcane-mind', cost: 3, bonuses: { stats: { special: 0.1 } } }
  ]),
  ...branch(YSOLDE, 1, [
    { id: 'ysolde-frost-lance', cost: 2, skillId: 'ysolde-frost-lance' },
    { id: 'ysolde-cryomancy', cost: 2, bonuses: { damage: { [DamageType.ICE]: 0.15 } } },
    { id: 'ysolde-deep-freeze', cost: 3, bonuses: { upgrades: { 'ysolde-frost-lance': { statusChance: 0.2 } } } }
  ]),
  ...branch(YSOLDE, 2, [
    { id: 'ysolde-chain-lightning', cost: 3, skillId: 'ysolde-chain-lightning' },
    { id: 'ysolde-static', cost: 2, bonuses: { damage: { [DamageType.LIGHTNING]: 0.15 } } },
    { id: 'ysolde-focus', cost: 3, bonuses: { focusRegen: 0.06 } }
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
