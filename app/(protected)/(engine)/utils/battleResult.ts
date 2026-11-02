import { BattleState } from '@/app/(protected)/(engine)/models/BattleState'
import { CharacterId } from '@/app/(protected)/(engine)/models/CharacterId'
import { CharacterState } from '@/app/(protected)/(engine)/models/CharacterState'
import { GameState } from '@/app/(protected)/(engine)/models/GameState'
import { LostXp } from '@/app/(protected)/(engine)/models/LostXp'
import { Reward } from '@/app/(protected)/(engine)/models/Reward'
import { addItems } from '@/app/(protected)/(engine)/utils/heroes'
import { gainExperience, loseExperience } from '@/app/(protected)/(engine)/utils/progression'
import { loseEncounter, retreat, winEncounter, WorldIndex } from '@/app/(protected)/(engine)/utils/worldMap'

/** Share of the experience of the current level lost by the whole party on a defeat: all of it (never a level). */
export const DEFEAT_XP_LOSS = 1

export interface LevelUp {
  characterId: CharacterId
  level: number
}

export interface BattleResult {
  state: GameState
  /** Everything won: the battle's spoils (gold, loot, Echoes) and then the rewards of the point. */
  rewards: Reward[]
  /** Only the rewards of the point won (a camp, a freed hero, a rune...), without the battle's spoils. */
  pointRewards: Reward[]
  levelUps: LevelUp[]
  /** Experience given back on a victory over the enemies that defeated the party last (0 otherwise), by everyone. */
  recoveredXp: number
}

/** The experience lost in the last defeat that waits at a point, by character ({} when nothing waits there). */
export function getLostXpAt(game: GameState, nodeId: string): LostXp['xp'] {
  return game.lostXp?.nodeId === nodeId ? game.lostXp.xp : {}
}

/** The sum of the experience lost by every character. */
export function totalLostXp(xp: LostXp['xp']): number {
  return Object.values(xp).reduce((sum, amount) => sum + (amount ?? 0), 0)
}

/**
 * How the experience of a character ends up after a battle at the point where
 * the party stands, as applyBattleResult applies it (also used to show it).
 */
export function experienceAfterBattle(
  game: GameState,
  battle: BattleState,
  character: CharacterState,
  fought: boolean
): CharacterState {
  if (battle.outcome === 'victory') {
    const xp = (fought ? battle.xp : 0) + (getLostXpAt(game, game.positionNodeId)[character.id] ?? 0)

    return xp > 0 ? gainExperience(character, xp) : character
  }

  return battle.outcome === 'defeat' ? loseExperience(character, DEFEAT_XP_LOSS) : character
}

/** What a defeat leaves at the point where the party stands (null when nobody would lose anything). */
export function xpLostInDefeat(game: GameState): LostXp | null {
  const xp: LostXp['xp'] = {}

  for (const character of game.characters) {
    const lost = character.xp - loseExperience(character, DEFEAT_XP_LOSS).xp

    if (lost > 0) {
      xp[character.id] = lost
    }
  }

  return totalLostXp(xp) > 0 ? { nodeId: game.positionNodeId, xp } : null
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
 *     the fallen come back with 1 health. If these are the enemies that
 *     defeated the party last, everybody gets back what it lost then.
 *   - defeat: everybody loses all the experience of its current level (never a level) and
 *     wakes up at the last camp where it rested. What it lost waits at this
 *     point (replacing what was waiting from an earlier defeat, now lost).
 *   - retreat (only possible with every hero alive): nobody loses experience
 *     and the party goes back to `fromNodeId` with the health it had.
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
      const afterBattle = {
        ...character,
        health: Math.max(1, hero?.health ?? character.health),
        focus: hero?.focus ?? character.focus
      }
      const grown = experienceAfterBattle(game, battle, afterBattle, !!hero?.fought)

      if (grown.level > character.level) {
        levelUps.push({ characterId: character.id, level: grown.level })
      }

      return grown
    })
    const recoveredXp = totalLostXp(getLostXpAt(game, game.positionNodeId))
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
    const looted = addItems(afterItems, battle.loot)
    const won = winEncounter(
      index,
      {
        ...looted.state,
        characters,
        kills,
        runeWins,
        lostXp: recoveredXp > 0 ? null : game.lostXp,
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

    return {
      state: won.state,
      rewards: [...rewards, ...won.rewards],
      pointRewards: won.rewards,
      levelUps,
      recoveredXp
    }
  }

  if (battle.outcome === 'defeat') {
    const characters = game.characters.map((character) => loseExperience(character, DEFEAT_XP_LOSS))

    return {
      state: loseEncounter(index, { ...afterItems, characters, kills, lostXp: xpLostInDefeat(game) }),
      rewards: [],
      pointRewards: [],
      levelUps: [],
      recoveredXp: 0
    }
  }

  if (battle.outcome === 'retreat') {
    const characters = game.characters.map((character) => ({
      ...character,
      health: Math.max(1, heroes.get(character.id)?.health ?? character.health),
      focus: heroes.get(character.id)?.focus ?? character.focus
    }))

    return {
      state: retreat(index, { ...afterItems, characters, kills }, fromNodeId),
      rewards: [],
      pointRewards: [],
      levelUps: [],
      recoveredXp: 0
    }
  }

  throw new Error('The battle has not ended')
}
