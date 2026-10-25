/** How a fighter takes a kind of damage. Not shown in battle: it is learned in the bestiary. */
export enum Affinity {
  WEAK = 'weak',
  NORMAL = 'normal',
  RESIST = 'resist',
  IMMUNE = 'immune',
  /** The hit heals instead of hurting. */
  ABSORB = 'absorb'
}
