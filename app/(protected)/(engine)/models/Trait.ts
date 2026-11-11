/** The mechanic of its own that each hero has in battle. */
export enum Trait {
  /** Kael: his specials move him between stances (none, defensive, offensive and virtuous). */
  STANCE = 'stance',
  /** Sera: each hit marks the target; every mark adds critical chance against it, and a critical hit spends them. */
  MARKS = 'marks',
  /** Brann: the damage he takes fills his fury, which strengthens his attacks; some specials spend it. */
  FURY = 'fury',
  /** Oren: heals more the more wounded the ally is. */
  SAP = 'sap',
  /** Ysolde: each fire, ice or lightning special leaves a charge of its element; some specials spend them. */
  CHARGES = 'charges'
}
