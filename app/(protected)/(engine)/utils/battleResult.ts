import { MAX_CONSUMABLES } from '@/app/(protected)/(engine)/data/items'
import { BattleState } from '@/app/(protected)/(engine)/models/BattleState'
import { CharacterId } from '@/app/(protected)/(engine)/models/CharacterId'
import { GameState } from '@/app/(protected)/(engine)/models/GameState'
import { Reward } from '@/app/(protected)/(engine)/models/Reward'
import { addItems } from '@/app/(protected)/(engine)/utils/heroes'
import { gainExperience, loseExperience } from '@/app/(protected)/(engine)/utils/progression'
import { loseEncounter, retreat, winEncounter, WorldIndex } from '@/app/(protected)/(engine)/utils/worldMap'

/** Share of the experience of the current level lost by the whole party on a defeat, and by the active heroes on a retreat. */
export const DEFEAT_XP_LOSS = 0.5
export const RETREAT_XP_LOSS = 0.1

export interface LevelUp {
  characterId: CharacterId
  level: number
}

export interface BattleResult {
  state: GameState
  rewards: Reward[]
  levelUps: LevelUp[]
}

function heroesOf(battle: BattleState) {
  return new Map(
    battle.combatants.filter((combatant) => combatant.side === 'hero').map((hero) => [hero.characterId!, hero])
  )
}

/** The kills of the battle, and every species met (a seen species shows in the bestiary with 0). */
function addKills(state: GameState, battle: BattleState): Record<string, number> {
  const kills = { ...state.kills }

  for (const combatant of battle.combatants) {
    if (combatant.side === 'enemy') {
      kills[combatant.speciesId!] ??= 0
    }
  }

  for (const [species, count] of Object.entries(battle.kills)) {
    kills[species] = (kills[species] ?? 0) + count
  }

  return kills
}

/** The consumables the party has left after a battle (spent whatever the outcome). */
function spendItems(state: GameState, battle: BattleState): GameState {
  return { ...state, inventory: { ...state.inventory, ...battle.items } }
}

/**
 * Applies a finished battle to the game, at the point where the party stands:
 *
 *   - victory: experience for those who fought (all of it for each one; each
 *     level gained adds an Echo to the common pool), gold, the loot, a win for
 *     each rune worn by an active hero, the point cleared with its rewards;
 *     the fallen come back with 1 health.
 *   - defeat: everybody loses half the experience of its current level and
 *     wakes up at the last camp where it rested.
 *   - retreat: the heroes that fought lose 10% of the experience of their
 *     level and go back to `fromNodeId`; the fallen come back with 1 health.
 *
 * The enemies defeated count for the bestiary whatever the outcome.
 */
export function applyBattleResult(
  index: WorldIndex,
  game: GameState,
  battle: BattleState,
  fromNodeId: string
): BattleResult {
  const heroes = heroesOf(battle)
  const kills = addKills(game, battle)
  const afterItems = spendItems(game, battle)

  if (battle.outcome === 'victory') {
    const levelUps: LevelUp[] = []
    const characters = game.characters.map((character) => {
      const hero = heroes.get(character.id)
      const afterBattle = { ...character, health: Math.max(1, hero?.health ?? character.health) }

      if (!hero?.fought) {
        return afterBattle
      }

      const grown = gainExperience(afterBattle, battle.xp)

      if (grown.level > character.level) {
        levelUps.push({ characterId: character.id, level: grown.level })
      }

      return grown
    })
    const health = Object.fromEntries(characters.map((character) => [character.id, character.health]))
    const runeWins = { ...game.runeWins }

    for (const hero of heroes.values()) {
      for (const rune of hero.fought ? (hero.runes ?? []) : []) {
        runeWins[rune] = (runeWins[rune] ?? 0) + 1
      }
    }

    const levels = characters.reduce(
      (sum, character, position) => sum + character.level - game.characters[position].level,
      0
    )
    const looted = addItems(afterItems, battle.loot, MAX_CONSUMABLES)
    const won = winEncounter(
      index,
      {
        ...looted.state,
        characters,
        kills,
        runeWins,
        gold: game.gold + battle.gold,
        echoes: game.echoes + levels + battle.echoes
      },
      health
    )
    const rewards: Reward[] = battle.gold > 0 ? [{ type: 'gold', amount: battle.gold }] : []

    for (const [itemId, count] of Object.entries(looted.kept)) {
      rewards.push({ type: 'item', itemId, count })
    }

    if (battle.echoes > 0) {
      rewards.push({ type: 'echoes', count: battle.echoes })
    }

    return { state: won.state, rewards: [...rewards, ...won.rewards], levelUps }
  }

  if (battle.outcome === 'defeat') {
    const characters = game.characters.map((character) => loseExperience(character, DEFEAT_XP_LOSS))

    return { state: loseEncounter(index, { ...afterItems, characters, kills }), rewards: [], levelUps: [] }
  }

  if (battle.outcome === 'retreat') {
    const characters = game.characters.map((character) => {
      const hero = heroes.get(character.id)
      const afterBattle = { ...character, health: Math.max(1, hero?.health ?? character.health) }

      return hero?.fought ? loseExperience(afterBattle, RETREAT_XP_LOSS) : afterBattle
    })

    return { state: retreat(index, { ...afterItems, characters, kills }, fromNodeId), rewards: [], levelUps: [] }
  }

  throw new Error('The battle has not ended')
}
