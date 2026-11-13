/** Effects that last some turns on a fighter. */
export enum StatusType {
  /** Loses health at the start of each turn. */
  POISON = 'poison',
  BURN = 'burn',
  BLEED = 'bleed',
  /** Loses its turns. */
  FREEZE = 'freeze',
  STUN = 'stun',
  /** Its weapon attacks can miss. */
  BLIND = 'blind',
  ATTACK_UP = 'attackUp',
  ATTACK_DOWN = 'attackDown',
  DEFENSE_UP = 'defenseUp',
  DEFENSE_DOWN = 'defenseDown',
  SPEED_UP = 'speedUp',
  SPEED_DOWN = 'speedDown',
  /** Its critical chance goes up. */
  CRIT_UP = 'critUp',
  /** Recovers health at the start of each turn. */
  REGEN = 'regen',
  /** No harmful status can reach it. */
  WARD = 'ward',
  /** Imbuements: its weapon attacks hit with an element (and can leave that element's status). */
  IMBUE_FIRE = 'imbueFire',
  IMBUE_ICE = 'imbueIce',
  IMBUE_LIGHTNING = 'imbueLightning',
  IMBUE_EARTH = 'imbueEarth',
  IMBUE_LIGHT = 'imbueLight',
  IMBUE_DARKNESS = 'imbueDarkness',
  /** Its weapon attacks can poison (they keep their own kind of hit). */
  IMBUE_VENOM = 'imbueVenom'
}
