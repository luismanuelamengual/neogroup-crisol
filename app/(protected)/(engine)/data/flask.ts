/**
 * The Amber Flask (Estus-like): used on the map, out of combat, it heals the
 * whole party. It refills when resting. It grows with what the party finds on
 * the map, each one guarded by an elite fight: Amber Flasks (one more charge)
 * and Amber Embers (it heals more).
 */

/** Charges at the start of a cycle; each Amber Flask found adds one. */
export const FLASK_BASE_CHARGES = 1
export const FLASK_MAX_CHARGES = 3

/** Share of the maximum health healed (percent) at the start of a cycle; each Amber Ember adds FLASK_EMBER_POTENCY. */
export const FLASK_BASE_POTENCY = 10
export const FLASK_EMBER_POTENCY = 10
export const FLASK_MAX_POTENCY = 60

/** Where the Amber Flasks wait (points of the world map, set by hand). */
export const AMBER_FLASK_PLACES: [number, number][] = [
  // n1006 (Forest) and n316 (Snow).
  [5067, 11634],
  [2608, 3547]
]

/** Where the Amber Embers wait (points of the world map, set by hand). */
export const AMBER_EMBER_PLACES: [number, number][] = [
  // n946 (Meadows), n454 (Tropics), n743 (Desert), n435 (Mountains) and n49 (Volcanic lands).
  [6588, 10975],
  [13714, 5122],
  [11982, 8723],
  [733, 4935],
  [12731, 762]
]
