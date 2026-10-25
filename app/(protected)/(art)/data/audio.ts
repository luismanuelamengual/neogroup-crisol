import { Biome } from '@/app/(protected)/(engine)/models/Biome'

/**
 * The music and sound effects of the game, by name. The files live in
 * public/audio/ (music/<name>.mp3 and sfx/<name>.mp3); the ones not made yet
 * are simply silent (see the art manifest).
 */

export const MUSIC = [
  'menu',
  ...Object.values(Biome).map((biome) => `map-${biome}`),
  'battle',
  'boss',
  'seal',
  'crisol',
  'victory',
  'defeat'
] as const

export type MusicId = (typeof MUSIC)[number]

/** Themes that play once (the rest loop). */
export const ONE_SHOT_MUSIC: MusicId[] = ['victory', 'defeat']

export const SFX = [
  'slash',
  'pierce',
  'blunt',
  'critical',
  'miss',
  'block',
  'fire',
  'ice',
  'lightning',
  'earth',
  'light',
  'darkness',
  'heal',
  'buff',
  'debuff',
  'poison',
  'revive',
  'stance',
  'enemy-fall',
  'boss-bar',
  'boss-roar',
  'phase',
  'victory-sting',
  'defeat-sting',
  'step',
  'chest',
  'coin',
  'rest',
  'flask',
  'level-up',
  'button',
  'rune'
] as const

export type SfxId = (typeof SFX)[number]
