/** What the fighter whose turn it is does: a skill on some targets, an item or retreating (heroes). */
export type BattleAction =
  | { type: 'skill'; skillId: string; targetIds: string[] }
  | { type: 'item'; itemId: string; targetIds: string[] }
  | { type: 'retreat' }
