import { getSkill } from '@/app/(protected)/(engine)/data/skills'
import { Affinity } from '@/app/(protected)/(engine)/models/Affinity'
import { BattleAction } from '@/app/(protected)/(engine)/models/BattleAction'
import { BattleState } from '@/app/(protected)/(engine)/models/BattleState'
import { TargetType } from '@/app/(protected)/(engine)/models/TargetType'
import {
  BattleSetup,
  chooseEnemyAction,
  createBattle,
  getCombatant,
  getFighters,
  getUsableSkills,
  nextTurn,
  performAction
} from '@/app/(protected)/(engine)/utils/battle'

const AFFINITY_VALUE: Record<Affinity, number> = { weak: 1.5, normal: 1, resist: 0.5, immune: 0, absorb: -1 }

/** A sensible player: heals when an ally is low, else the hit with the most expected damage on the weakest enemy. */
export function chooseHeroAction(state: BattleState): BattleAction {
  const actor = getCombatant(state, state.actorId!)
  const usable = getUsableSkills(state, actor.id)
  const allies = getFighters(state, 'hero')
  const enemies = getFighters(state, 'enemy')
  const hurt = [...allies].sort((a, b) => a.health / a.stats.maxHealth - b.health / b.stats.maxHealth)[0]
  const healing = usable.find((skill) => skill.heal && !skill.revive)

  if (healing && hurt.health / hurt.stats.maxHealth < 0.5) {
    return { type: 'skill', skillId: healing.id, targetIds: [hurt.id] }
  }

  const target = [...enemies].sort((a, b) => a.health - b.health)[0]
  let best: BattleAction = { type: 'skill', skillId: actor.skills[0], targetIds: [target.id] }
  let bestValue = -Infinity

  for (const skill of usable.filter((candidate) => !candidate.heal && candidate.power > 0)) {
    const stat = actor.stats[skill.stat]
    const value = (foe: typeof target) =>
      skill.power * stat * AFFINITY_VALUE[foe.affinities[skill.damageType] ?? Affinity.NORMAL]
    const total =
      skill.target === TargetType.ALL_ENEMIES
        ? enemies.reduce((sum, foe) => sum + value(foe), 0)
        : Math.max(...enemies.map(value))
    // Focus is worth keeping: a special must clearly beat the free attack.
    const worth = total - skill.cost * 0.4

    if (worth > bestValue) {
      bestValue = worth
      const aim =
        skill.target === TargetType.ALL_ENEMIES
          ? enemies
          : [...enemies].sort((a, b) => value(b) - value(a) || a.health - b.health)

      best = { type: 'skill', skillId: skill.id, targetIds: [aim[0].id] }
    }
  }

  return best
}

/** Plays a battle to its end with the sensible player and the enemy AI. */
export function simulateBattle(setup: BattleSetup, maxTurns = 1000): BattleState {
  let { state } = createBattle(setup)

  for (let turn = 0; turn < maxTurns && !state.outcome; turn++) {
    state = nextTurn(state).state

    if (state.outcome) {
      break
    }

    const actor = getCombatant(state, state.actorId!)

    state = performAction(state, actor.side === 'hero' ? chooseHeroAction(state) : chooseEnemyAction(state)).state
  }

  return state
}

/** Share of seeds a battle is won with. */
export function winRate(setup: Omit<BattleSetup, 'seed'>, runs = 200): number {
  let wins = 0

  for (let seed = 1; seed <= runs; seed++) {
    if (simulateBattle({ ...setup, seed }).outcome === 'victory') {
      wins++
    }
  }

  return wins / runs
}

export { getSkill }
