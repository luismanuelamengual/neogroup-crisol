import { ENEMIES } from '@/app/(protected)/(engine)/data/enemies'
import { getSkill, SKILLS } from '@/app/(protected)/(engine)/data/skills'
import { BattleEvent } from '@/app/(protected)/(engine)/models/BattleEvent'
import { BattleState } from '@/app/(protected)/(engine)/models/BattleState'
import { Biome } from '@/app/(protected)/(engine)/models/Biome'
import { CharacterId } from '@/app/(protected)/(engine)/models/CharacterId'
import { TargetType } from '@/app/(protected)/(engine)/models/TargetType'
import { createBattle } from '@/app/(protected)/(engine)/utils/battle'
import { createCharacter } from '@/app/(protected)/(engine)/utils/heroes'

/**
 * A battle made up to look at the attack effects one by one (/dev/effects):
 * three heroes against three enemies, and the events of a skill used by one of
 * them, without the rules of the battle (every hit lands, for 1 point).
 */

/** The heroes on the field in each lineup of the preview (the first three of a party fight). */
export const PREVIEW_LINEUPS: CharacterId[][] = [
  [CharacterId.KAEL, CharacterId.YSOLDE, CharacterId.SERA],
  [CharacterId.BRANN, CharacterId.OREN, CharacterId.YSOLDE]
]

/** The enemies the preview fights: a beast, a caster and an archer (any of them uses the skill picked). */
export const PREVIEW_ENEMIES = ['thorn-boar', 'desert-djinn', 'bandit-archer']

export function createPreviewBattle(lineup: CharacterId[], biome = Biome.MEADOWS): BattleState {
  const species = PREVIEW_ENEMIES.map((id) => ENEMIES.find((enemy) => enemy.id === id)?.id ?? ENEMIES[0].id)

  return createBattle({
    heroes: lineup.map((id) => createCharacter(id, 10)),
    phases: [species.map((speciesId) => ({ speciesId, level: 10 }))],
    seed: 1,
    biome,
    canRetreat: true
  }).state
}

/** The skills of a hero (its weapons and its whole tree), by the prefix of their ids. */
export function heroSkillIds(id: CharacterId): string[] {
  return SKILLS.filter((skill) => skill.id.startsWith(`${id}-`)).map((skill) => skill.id)
}

/** The skills of the bestiary (the ones no hero has). */
export function enemySkillIds(): string[] {
  const heroes = Object.values(CharacterId)

  return SKILLS.filter((skill) => !heroes.some((id) => skill.id.startsWith(`${id}-`))).map((skill) => skill.id)
}

/** The events of `skillId` used by `actorId`, as the battle would send them, so the stage plays its effect. */
export function previewEvents(state: BattleState, actorId: string, skillId: string, critical = false): BattleEvent[] {
  const skill = getSkill(skillId)
  const actor = state.combatants.find((combatant) => combatant.id === actorId)!
  const field = state.combatants.filter((combatant) => !combatant.reserve && combatant.health > 0)
  const foes = field.filter((combatant) => combatant.side !== actor.side)
  const allies = field.filter((combatant) => combatant.side === actor.side)
  const targetIds =
    skill.target === TargetType.ENEMY
      ? [foes[0].id]
      : skill.target === TargetType.ALL_ENEMIES
        ? foes.map((foe) => foe.id)
        : skill.target === TargetType.ALL_ALLIES
          ? allies.map((ally) => ally.id)
          : [actorId]
  const events: BattleEvent[] = [{ type: 'action', actorId, skillId, targetIds }]

  for (const targetId of targetIds) {
    if (skill.heal) {
      events.push({ type: 'heal', targetId, amount: 1 })
    } else if (skill.power > 0) {
      events.push({
        type: 'damage',
        targetId,
        amount: 1,
        damageType: skill.damageType,
        critical,
        weak: false,
        resisted: false
      })
    }
  }

  return events
}
