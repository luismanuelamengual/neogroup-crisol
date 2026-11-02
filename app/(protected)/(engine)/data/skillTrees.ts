import { getCharacterDefinition } from '@/app/(protected)/(engine)/data/characters'
import { getSkill } from '@/app/(protected)/(engine)/data/skills'
import { SkillUpgrade } from '@/app/(protected)/(engine)/models/Bonuses'
import { CharacterId } from '@/app/(protected)/(engine)/models/CharacterId'
import { SkillNode, SkillTree } from '@/app/(protected)/(engine)/models/SkillTree'

/**
 * The skill trees: a web of specials of its own shape for each hero, from the
 * special it starts with. Any special joined to one already learned can be
 * learned, paying its cost (the farther from the root, the dearer), so the
 * player chooses where to go first and walks the rest of the tree later.
 * There are no passives (the runes and the echoes give those): each special
 * learned goes up to level 5 with skill points, and each level makes it
 * stronger, cheaper or longer lasting.
 */

const { KAEL, SERA, BRANN, OREN, YSOLDE } = CharacterId

export const MAX_SKILL_LEVEL = 5
/** Most a special can cost to learn. */
const MAX_COST = 6
/** Focus of a special worth one skill point of its cost. */
const FOCUS_PER_POINT = 10
/** What each level of a special adds (index 0 is level 1): shares of power, of chance and of focus saved, and turns. */
const LEVEL_EFFECTS: { power: number; statusChance: number; cost: number; turns: number }[] = [
  { power: 0, statusChance: 0, cost: 0, turns: 0 },
  { power: 0.2, statusChance: 0.05, cost: 0, turns: 0 },
  { power: 0.4, statusChance: 0.1, cost: 0.15, turns: 0 },
  { power: 0.65, statusChance: 0.15, cost: 0.15, turns: 1 },
  { power: 1, statusChance: 0.2, cost: 0.3, turns: 1 }
]

/**
 * A tree drawn as text: each letter is a special (see the legend) at an even
 * column and row, and a "-" or a "|" between two of them joins them. The
 * root is "R" (free). The cost of the others is their distance to the root,
 * or more for the strongest ones (one point per 10 of focus they spend).
 */
function tree(characterId: CharacterId, drawing: string[], legend: Record<string, string>): SkillTree {
  const root = getCharacterDefinition(characterId).skills[1]
  const letters: Record<string, string> = { ...legend, R: root }
  const at = (row: number, column: number) => drawing[row]?.[column] ?? ' '
  const places: { letter: string; x: number; y: number }[] = []
  const links: [string, string][] = []

  drawing.forEach((line, row) =>
    [...line].forEach((char, column) => {
      if (/[A-Z]/.test(char)) {
        if (row % 2 || column % 2) {
          throw new Error(`${characterId}: ${char} is off the grid`)
        }

        places.push({ letter: char, x: column / 2, y: row / 2 })
      } else if (char === '-') {
        links.push([letters[at(row, column - 1)], letters[at(row, column + 1)]])
      } else if (char === '|') {
        links.push([letters[at(row - 1, column)], letters[at(row + 1, column)]])
      }
    })
  )

  if (places.length !== Object.keys(letters).length || links.some(([a, b]) => !a || !b)) {
    throw new Error(`${characterId}: the drawing and the legend do not match`)
  }

  // Distances from the root, through the links.
  const distance: Record<string, number> = { [root]: 0 }
  const queue = [root]

  while (queue.length > 0) {
    const current = queue.shift()!

    for (const [a, b] of links) {
      const next = a === current ? b : b === current ? a : null

      if (next && distance[next] === undefined) {
        distance[next] = distance[current] + 1
        queue.push(next)
      }
    }
  }

  const nodes: SkillNode[] = places.map(({ letter, x, y }) => {
    const skillId = letters[letter]

    if (distance[skillId] === undefined) {
      throw new Error(`${characterId}: ${skillId} cannot be reached`)
    }

    const cost =
      skillId === root
        ? 0
        : Math.min(MAX_COST, Math.max(distance[skillId], Math.round(getSkill(skillId).cost / FOCUS_PER_POINT)))

    return { skillId, x, y, cost }
  })

  return {
    characterId,
    root,
    width: Math.max(...places.map((place) => place.x)) + 1,
    height: Math.max(...places.map((place) => place.y)) + 1,
    nodes,
    links
  }
}

export const SKILL_TREES: SkillTree[] = [
  // Kael: a sword and its guard. The bulwark above and to the left, the blade below and the ember to the right.
  tree(
    KAEL,
    [
      'H-A-G-L . P-N', //
      '|   |     |  ',
      'O-B-R-S-F-I-M',
      '  |   |   |  ',
      '  U   W-D-Q  ',
      '      |      ',
      '    T-X-C    '
    ],
    {
      A: 'kael-rally',
      G: 'kael-guard',
      L: 'kael-last-bastion',
      P: 'kael-phoenix-cut',
      N: 'kael-sunfall',
      B: 'kael-shield-bash',
      S: 'kael-sweep',
      F: 'kael-flame-edge',
      I: 'kael-inferno',
      W: 'kael-whirlwind',
      D: 'kael-blade-dance',
      X: 'kael-execution',
      H: 'kael-war-banner',
      O: 'kael-oath',
      M: 'kael-ember-slash',
      U: 'kael-sundering-blow',
      Q: 'kael-dawn-strike',
      T: 'kael-riposte',
      C: 'kael-crimson-edge'
    }
  ),
  // Sera: a ring of the hunt around her first arrow, with the shadow hanging from it.
  tree(
    SERA,
    [
      'Q-V-Y-H-F', //
      '| |   |  ',
      'M-R   T-U',
      '  |   |  ',
      'P-A-G-K  ',
      '  |   |  ',
      '  C-X-O-D',
      '    |    ',
      '  S-B-E  '
    ],
    {
      V: 'sera-volley',
      Y: 'sera-arrow-storm',
      H: 'sera-hurricane',
      M: 'sera-hunters-mark',
      T: 'sera-tailwind',
      A: 'sera-aimed-shot',
      G: 'sera-gale-arrow',
      K: 'sera-heartseeker',
      C: 'sera-crippling-shot',
      X: 'sera-toxic-cloud',
      O: 'sera-night-volley',
      B: 'sera-blinding-arrow',
      Q: 'sera-quick-shot',
      F: 'sera-rain-of-arrows',
      U: 'sera-thunder-arrow',
      P: 'sera-poison-arrow',
      D: 'sera-falcon-dive',
      S: 'sera-shadow-step',
      E: 'sera-eclipse-shot'
    }
  ),
  // Brann: a mountain. The fury climbs on the left, the earth on the right and the stone below.
  tree(
    BRANN,
    [
      '      W      ', //
      '      |      ',
      '    C-H-Y    ',
      '    |   |    ',
      'K-Z-P   A-X-G',
      '  | |   | |  ',
      'O-F-R-S-B-M-E',
      '  |   |   |  ',
      '  T   L   J  '
    ],
    {
      W: 'brann-world-breaker',
      C: 'brann-carnage',
      H: 'brann-hammerfall',
      Y: 'brann-cataclysm',
      K: 'brann-berserk',
      P: 'brann-rampage',
      A: 'brann-avalanche',
      E: 'brann-earthsplitter',
      O: 'brann-roar',
      S: 'brann-stone-skin',
      B: 'brann-boulder',
      L: 'brann-shield-wall',
      Z: 'brann-titan-grip',
      X: 'brann-magma-fist',
      G: 'brann-bloodletting',
      F: 'brann-fury-cleave',
      M: 'brann-war-stomp',
      T: 'brann-headbutt',
      J: 'brann-rallying-roar'
    }
  ),
  // Oren: a tree with its roots. The sap rises on the left, the grove in the middle and the thorns on the right.
  tree(
    OREN,
    [
      'T . . S . . W', //
      '|     |     |',
      'N-C . L . O-X',
      '  |   |   |  ',
      '  J-U-G-D-E  ',
      '      |      ',
      '  V-K-R-Q-Z  ',
      '  |       |  ',
      '  B       H  '
    ],
    {
      T: 'oren-tree-of-life',
      S: 'oren-sanctuary',
      W: 'oren-wild-growth',
      N: 'oren-rebirth',
      C: 'oren-cleansing-rain',
      L: 'oren-blessing',
      O: 'oren-rot',
      X: 'oren-poison-bloom',
      J: 'oren-rejuvenate',
      U: 'oren-purify',
      G: 'oren-grove',
      D: 'oren-thorns',
      E: 'oren-entangle',
      K: 'oren-barkskin',
      Q: 'oren-swiftwood',
      V: 'oren-verdant-aura',
      Z: 'oren-seed-shot',
      B: 'oren-sunbeam',
      H: 'oren-hemlock'
    }
  ),
  // Ysolde: three elements. The fire to the left, the ice to the right and the storm below.
  tree(
    YSOLDE,
    [
      'M-C . . . T-Z', //
      '| |       | |',
      'P W-O-R-L-B G',
      '  |   |   |  ',
      '  E S-K-H I  ',
      '    |   |    ',
      '  F-V   Q-A  '
    ],
    {
      M: 'ysolde-meteor',
      C: 'ysolde-combustion',
      T: 'ysolde-frozen-tomb',
      Z: 'ysolde-absolute-zero',
      W: 'ysolde-flame-wave',
      O: 'ysolde-frost-armor',
      L: 'ysolde-frost-lance',
      B: 'ysolde-blizzard',
      S: 'ysolde-spark',
      K: 'ysolde-chain-lightning',
      H: 'ysolde-thunderclap',
      V: 'ysolde-convergence',
      Q: 'ysolde-heavens-wrath',
      P: 'ysolde-fire-pillar',
      G: 'ysolde-glacial-spear',
      E: 'ysolde-ember',
      I: 'ysolde-ice-shards',
      F: 'ysolde-static-field',
      A: 'ysolde-arcane-shield'
    }
  )
]

export function getSkillTree(characterId: CharacterId): SkillTree {
  return SKILL_TREES.find((candidate) => candidate.characterId === characterId)!
}

/** The node of a special in the tree of a character, if it is there. */
export function getSkillNode(characterId: CharacterId, skillId: string): SkillNode | undefined {
  return getSkillTree(characterId).nodes.find((node) => node.skillId === skillId)
}

/** The specials joined to one in the tree of a character. */
export function getLinkedSkills(characterId: CharacterId, skillId: string): string[] {
  return getSkillTree(characterId).links.flatMap(([a, b]) => (a === skillId ? [b] : b === skillId ? [a] : []))
}

/** Skill points it costs to take a learned special to a level (2 or more). */
export function getLevelCost(level: number): number {
  return level
}

/** Skill points that a special at a level has cost (the root comes learned for free). */
export function getSpentOnSkill(characterId: CharacterId, skillId: string, level: number): number {
  let spent = level >= 1 ? (getSkillNode(characterId, skillId)?.cost ?? 0) : 0

  for (let current = 2; current <= level; current++) {
    spent += getLevelCost(current)
  }

  return spent
}

/** Skill points the whole tree of a character costs: every special learned and at level 5. */
export function getTreeCost(characterId: CharacterId): number {
  return getSkillTree(characterId).nodes.reduce(
    (sum, node) => sum + getSpentOnSkill(characterId, node.skillId, MAX_SKILL_LEVEL),
    0
  )
}

/** What a level adds to a special: share of power, chance of its statuses, focus it saves and turns of its lasting statuses. */
export function getSkillLevelUpgrade(skillId: string, level: number): SkillUpgrade {
  const effect = LEVEL_EFFECTS[Math.max(0, Math.min(MAX_SKILL_LEVEL, level) - 1)]
  const skill = getSkill(skillId)

  return {
    power: skill.power > 0 ? effect.power : 0,
    statusChance: skill.statuses?.some((status) => status.chance < 1) ? effect.statusChance : 0,
    cost: Math.round(skill.cost * effect.cost),
    turns: skill.statuses?.some((status) => status.turns >= 2) ? effect.turns : 0
  }
}
