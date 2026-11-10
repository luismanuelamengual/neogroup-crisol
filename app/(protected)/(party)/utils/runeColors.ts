import { Rune, RuneStat } from '@/app/(protected)/(engine)/models/Rune'

/** The color of each attribute a rune can raise: its stone, its card and its art show it. */
export const RUNE_STAT_COLORS: Record<RuneStat, string> = {
  attack: '#ff4d4d',
  special: '#b06cff',
  defense: '#ff9a2e',
  speed: '#6fd85a',
  maxHealth: '#ff7fc4',
  maxFocus: '#3d8bff',
  critChance: '#ffd23c'
}

/** The color of a rune: the one of the attribute it raises the most. */
export function runeColor(rune: Rune): string {
  return RUNE_STAT_COLORS[rune.gain]
}
