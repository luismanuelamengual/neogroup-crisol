import { CharacterId } from '@/app/(protected)/(engine)/models/CharacterId'

/** A special in the skill tree of a character, at a place of its grid. */
export interface SkillNode {
  skillId: string
  /** Column and row of the grid (from the top left). */
  x: number
  y: number
  /** Skill points it costs to learn (its later levels cost the same for every special). */
  cost: number
}

/**
 * The skill tree of a character: a web of specials joined by links, of its
 * own shape. It starts with its root learned; any special joined to one it
 * already learned can be learned, so the player picks a way through the tree
 * and can walk the other ways later with more points.
 */
export interface SkillTree {
  characterId: CharacterId
  root: string
  /** Columns and rows of its grid. */
  width: number
  height: number
  nodes: SkillNode[]
  /** Pairs of joined specials. */
  links: [string, string][]
}
