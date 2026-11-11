/**
 * Kael's stances. He starts each battle without one; his specials move him
 * from one to another (see Skill.stance) and some can only be used in one of
 * them (see Skill.requires). The virtuous one is only reached from the
 * offensive one.
 */
export enum Stance {
  NONE = 'none',
  DEFENSE = 'defense',
  OFFENSE = 'offense',
  VIRTUOUS = 'virtuous'
}
