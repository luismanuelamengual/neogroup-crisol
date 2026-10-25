import { getTree } from '@/app/(protected)/(engine)/data/talents'
import { CharacterId } from '@/app/(protected)/(engine)/models/CharacterId'
import { CharacterState } from '@/app/(protected)/(engine)/models/CharacterState'
import { CombatStats } from '@/app/(protected)/(engine)/models/CombatStats'
import { canBuyTalent, createCharacter, getMaxHealth } from '@/app/(protected)/(engine)/utils/heroes'

/** How a sensible player spends the attribute points: mostly attack, then health and defense. */
const ATTRIBUTE_PLAN: (keyof CombatStats)[] = ['attack', 'maxHealth', 'attack', 'defense']

/**
 * A character at a level built the way a player would: its attribute points
 * spent, its skill points on the cheapest talents first, and its weapon at a
 * level (about +1 every three levels in the first biomes).
 */
export function buildCharacter(id: CharacterId, level: number, weapon = Math.min(5, Math.floor(level / 3))) {
  let character: CharacterState = { ...createCharacter(id, level), weapon }

  for (let point = 0; point < level - 1; point++) {
    const stat = ATTRIBUTE_PLAN[point % ATTRIBUTE_PLAN.length]

    character = { ...character, attributes: { ...character.attributes, [stat]: (character.attributes[stat] ?? 0) + 1 } }
  }

  for (;;) {
    const next = getTree(id)
      .filter((talent) => canBuyTalent(character, talent.id))
      .sort((a, b) => a.cost - b.cost)[0]

    if (!next) {
      break
    }

    character = { ...character, talents: [...character.talents, next.id] }
  }

  return { ...character, health: getMaxHealth(character) }
}
