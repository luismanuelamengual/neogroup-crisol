/** What the fighter whose turn it is does: a skill on some targets, or retreating (heroes). */
export type BattleAction = { type: 'skill'; skillId: string; targetIds: string[] } | { type: 'retreat' }
