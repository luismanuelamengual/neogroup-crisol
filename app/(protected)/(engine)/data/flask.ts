/**
 * The Amber Flask (Estus-like): used on the map, out of combat, it heals the
 * whole party. It refills when resting.
 */

/** Charges at the start of a cycle; each Seal defeated adds one. */
export const FLASK_BASE_CHARGES = 1
export const FLASK_MAX_CHARGES = 4

/** Share of the maximum health healed (percent) at the start of a cycle; each Amber Ember adds FLASK_EMBER_POTENCY. */
export const FLASK_BASE_POTENCY = 10
export const FLASK_EMBER_POTENCY = 5
export const FLASK_MAX_POTENCY = 60

/** Mini bosses that give an Amber Ember (the 4 captors give one too). */
export const EMBER_MINIBOSS_IDS = [
  'forest-miniboss-3',
  'tropical-miniboss-3',
  'desert-miniboss-3',
  'mountains-miniboss-3',
  'snow-miniboss-2',
  'volcanic-miniboss-2'
]
