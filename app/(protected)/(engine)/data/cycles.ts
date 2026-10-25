import { Archetype } from '@/app/(protected)/(engine)/models/Archetype'

/**
 * New Game+: after Crisol falls the party can start the next cycle from any
 * camp. The world starts over (fog, camps, bosses, sanctuaries, chests,
 * Tears, gold and items) and the characters keep everything they are: levels,
 * builds, weapons, runes, echoes and the bestiary.
 */

/** Levels the enemies of every point gain per cycle (on top of their stronger attributes, see data/enemies.ts). */
export const CYCLE_LEVELS = 45
/** A captor with nobody left to free gives Echoes and stones of its biome instead, more each cycle. */
export const CAPTOR_ECHOES = 12
export const CAPTOR_STONES = 6
/** A sanctuary whose rune the party already has gives this share of its echo cost in Echoes. */
export const SANCTUARY_ECHO_SHARE = 0.5
/** From the first New Game+ on, the bosses know one skill more: the first of these they lack. */
export const CYCLE_BOSS_SKILLS: Record<Archetype, string[]> = {
  [Archetype.BRUTE]: ['war-cry', 'blood-howl', 'quake'],
  [Archetype.AGILE]: ['blood-howl', 'impale', 'shriek'],
  [Archetype.TANK]: ['bulwark', 'quake', 'crush'],
  [Archetype.CASTER]: ['curse', 'soul-drain', 'shriek'],
  [Archetype.HEALER]: ['chorus', 'curse', 'shriek']
}
