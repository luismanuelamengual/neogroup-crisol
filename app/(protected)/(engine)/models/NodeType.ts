/** What a point of the world map is. */
export enum NodeType {
  /** A fight: it has to be won to go through. Its enemies come back every time the party rests. */
  COMBAT = 'combat',
  /** The starting camp (Glade of Awakening): the only one open from the beginning. */
  START = 'start',
  /** A boss that turns the point into a camp once defeated. */
  CAMP_BOSS = 'campBoss',
  /** A rune guarded by a mini boss or by an elite fight. */
  SANCTUARY = 'sanctuary',
  /** A safe point with a merchant, behind a fight. */
  MERCHANT = 'merchant',
  /** A Tear of Oblivion (resets the skill points of a character), behind an elite fight. */
  TEAR = 'tear',
  /** A small chest with gold or smithing stones, behind a fight. */
  CHEST = 'chest',
  /** The door of the Abyss: it opens once the three Seals are defeated. */
  ABYSS_GATE = 'abyssGate',
  /** Crisol, the final boss, in the castle of the Abyss. */
  FINAL_BOSS = 'finalBoss'
}
