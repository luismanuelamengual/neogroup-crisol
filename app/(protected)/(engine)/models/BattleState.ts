import { Biome } from '@/app/(protected)/(engine)/models/Biome'
import { Combatant } from '@/app/(protected)/(engine)/models/Combatant'

/** An enemy waiting in a phase of a battle. */
export interface EnemySpawn {
  speciesId: string
  level: number
  elite?: boolean
}

/** A battle in progress (pure data: see utils/battle.ts). */
export interface BattleState {
  /** State of the seeded random numbers. */
  seed: number
  biome: Biome
  /** New Game+ cycle: enemies are stronger. */
  cycle: number
  /** Phases of enemies; the current one is on the field. */
  phases: EnemySpawn[][]
  phase: number
  combatants: Combatant[]
  /** Whose turn it is (null between turns). */
  actorId: string | null
  canRetreat: boolean
  outcome: 'victory' | 'defeat' | 'retreat' | null
  /** Species defeated, for the bestiary. */
  kills: Record<string, number>
  /** Experience and gold gathered from the defeated enemies. */
  xp: number
  gold: number
  /** Consumables the party carries (they are spent even if the battle is lost). */
  items: Record<string, number>
  /** Items dropped by the defeated enemies (kept only on a victory), and Echoes. */
  loot: Record<string, number>
  echoes: number
}
