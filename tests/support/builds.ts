import { getRune } from '@/app/(protected)/(engine)/data/runes'
import { getSkill } from '@/app/(protected)/(engine)/data/skills'
import { getSkillTree } from '@/app/(protected)/(engine)/data/skillTrees'
import { getStartingWeapon } from '@/app/(protected)/(engine)/data/weapons'
import { CharacterId } from '@/app/(protected)/(engine)/models/CharacterId'
import { CharacterState } from '@/app/(protected)/(engine)/models/CharacterState'
import { CombatStats } from '@/app/(protected)/(engine)/models/CombatStats'
import {
  canLearnSkill,
  createCharacter,
  getMaxHealth,
  getNextSkillCost,
  getSkillLevel,
  SKILL_SLOTS
} from '@/app/(protected)/(engine)/utils/heroes'

/** How a sensible player spends the attribute points: mostly its power (special for the casters), then health and defense. */
const ATTRIBUTE_PLAN: (keyof CombatStats)[] = ['attack', 'maxHealth', 'attack', 'defense']
const CASTERS = [CharacterId.OREN, CharacterId.YSOLDE]

/**
 * A character at a level built the way a player would: its attribute points
 * spent, its skill points on the cheapest step of its tree each time (a new
 * special or a level, the ones that hurt first), and its weapon at a
 * level (about +1 every three levels in the first biomes).
 */
export function buildCharacter(id: CharacterId, level: number, weapon = Math.min(5, Math.floor(level / 3))) {
  let character: CharacterState = { ...createCharacter(id, level), weapons: { [getStartingWeapon(id).id]: weapon } }

  for (let point = 0; point < level - 1; point++) {
    const planned = ATTRIBUTE_PLAN[point % ATTRIBUTE_PLAN.length]
    const stat = planned === 'attack' && CASTERS.includes(id) ? 'special' : planned

    character = { ...character, attributes: { ...character.attributes, [stat]: (character.attributes[stat] ?? 0) + 1 } }
  }

  for (;;) {
    // The cheapest step, the specials that hurt first: a new special joined to the ones it knows, or a level.
    const weight = (skill: string) => getNextSkillCost(character, skill) + (getSkill(skill).power > 0 ? 0 : 3)
    const next = getSkillTree(id)
      .nodes.map((node) => node.skillId)
      .filter((skill) => canLearnSkill(character, skill))
      .sort((a, b) => weight(a) - weight(b))[0]

    if (!next) {
      break
    }

    const fresh = getSkillLevel(character, next) === 0

    character = {
      ...character,
      skillLevels: { ...character.skillLevels, [next]: getSkillLevel(character, next) + 1 },
      // As in the game: a new special goes to a free slot.
      skills: fresh && character.skills.length < SKILL_SLOTS ? [...character.skills, next] : character.skills
    }
  }

  return { ...character, health: getMaxHealth(character) }
}

/**
 * A character in New Game+: built as above at its level, with its weapon at
 * its best, three strong runes of its own (`slot` keeps them apart between the
 * heroes) and echoes worth about 40 Echoes per cycle.
 */
export function buildVeteran(id: CharacterId, level: number, cycle: number, slot: number) {
  const built = buildCharacter(id, level, 20)
  const runes = [60, 59, 58].map((index) => index - 3 * slot)
  const echoCapacity = 40 * cycle
  const echoes: number[] = []
  let load = 0

  for (let index = 52; index >= 1 && echoes.length < 12; index -= 5) {
    const cost = getRune(index).echoCost

    if (!runes.includes(index) && load + cost <= echoCapacity) {
      echoes.push(index)
      load += cost
    }
  }

  const character = { ...built, runes, echoCapacity, echoes }

  return { ...character, health: getMaxHealth(character) }
}
