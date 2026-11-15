import { Biome } from '@/app/(protected)/(engine)/models/Biome'

/**
 * The music and sound effects of the game, by name. The files go in
 * art/source/music/<name>.mp3|ogg and art/source/sfx/<name>.mp3|ogg and
 * `yarn art` copies them to public/audio/ (see art/musica.md). A theme
 * without a file is silent; an effect without a file is synthesized
 * (see sfxSynth.ts).
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

/** Volume of the themes that sound louder or softer than the rest (1 when not listed). */
export const MUSIC_LEVELS: Partial<Record<MusicId, number>> = {}

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
  'rune',
  'cursor',
  'menu-open',
  'menu-close',
  'hurt',
  'shield',
  'focus',
  'stun'
] as const

export type SfxId = (typeof SFX)[number]
