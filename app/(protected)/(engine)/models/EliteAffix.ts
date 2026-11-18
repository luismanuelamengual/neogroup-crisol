/**
 * The traits an elite enemy can come with (see data/affixes.ts): drawn at
 * random when its phase enters the battle, and shown under its feet, so the
 * same fight never plays the same way twice. Bosses never get them.
 */
export enum EliteAffix {
  /** Heals a share of the damage it deals. */
  VAMPIRIC = 'vampiric',
  /** A share of the damage of each hit it takes goes back to whoever hit it (never deadly). */
  THORNY = 'thorny',
  /** When it falls it bursts: every hero standing loses a share of its health (never deadly). */
  EXPLOSIVE = 'explosive',
  /** It enters with shields. */
  ARMORED = 'armored',
  /** Much faster. */
  SWIFT = 'swift',
  /** Recovers a share of its health at the start of each of its turns. */
  REGENERATING = 'regenerating',
  /** Freezing and stunning cannot reach it. */
  UNSHAKABLE = 'unshakable',
  /** Each time one of its allies falls, its attack goes up. */
  VENGEFUL = 'vengeful'
}
