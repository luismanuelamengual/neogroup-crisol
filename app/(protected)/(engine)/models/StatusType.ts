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
  SPEED_DOWN = 'speedDown'
}
