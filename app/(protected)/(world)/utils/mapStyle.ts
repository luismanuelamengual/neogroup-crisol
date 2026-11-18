import { Biome } from '@/app/(protected)/(engine)/models/Biome'
import { BossKind } from '@/app/(protected)/(engine)/models/BossKind'
import { NodeType } from '@/app/(protected)/(engine)/models/NodeType'
import { WorldNode } from '@/app/(protected)/(engine)/models/WorldNode'

/**
 * Provisional look of the world map (until the art of phase 8): saturated
 * biome colors, dotted trails like Super Mario World and one marker per kind
 * of point.
 */

/** Ground color of each biome. */
export const BIOME_GROUND: Record<Biome, string> = {
  [Biome.MEADOWS]: '#5fae3e',
  [Biome.FOREST]: '#1f6b34',
  [Biome.TROPICAL]: '#13977c',
  [Biome.DESERT]: '#d8a03c',
  [Biome.MOUNTAINS]: '#7d8494',
  [Biome.SNOW]: '#d9e7f4',
  [Biome.VOLCANIC]: '#8c2416',
  [Biome.WASTELANDS]: '#5a4560',
  [Biome.ABYSS]: '#2b0c3d'
}

export type MarkerShape =
  'circle' | 'diamond' | 'square' | 'flame' | 'skull' | 'drop' | 'gate' | 'sword' | 'chest' | 'chestOpen'

/**
 * Points that keep something to take (a chest, a rune, a weapon, a Tear, the
 * amber): while it waits there they shine; once taken they go grey with a check.
 */
export type RewardState = 'pending' | 'claimed'

export interface MarkerStyle {
  shape: MarkerShape
  color: number
  radius: number
  reward?: RewardState
}

const COMBAT: MarkerStyle = { shape: 'circle', color: 0xd7263d, radius: 26 }
const CLEARED: MarkerStyle = { shape: 'circle', color: 0xf3e2b3, radius: 18 }
/** Points with something to take, once (see RewardState). */
const REWARD_TYPES = new Set([
  NodeType.CHEST,
  NodeType.SANCTUARY,
  NodeType.RELIQUARY,
  NodeType.TEAR,
  NodeType.AMBER_FLASK,
  NodeType.AMBER_EMBER
])

/** Whether a point keeps something to take, once. */
export function hasReward(node: WorldNode): boolean {
  return REWARD_TYPES.has(node.type)
}

/** Marker of a point: what it is and whether it is cleared. */
export function markerOf(node: WorldNode, cleared: boolean, openCamp: boolean): MarkerStyle {
  const style = baseMarkerOf(node, cleared, openCamp)

  if (openCamp || !hasReward(node)) {
    return style
  }

  // Taken: the same shape, grey and dull, so that the eye skips it.
  return cleared ? { ...style, color: faded(style.color), reward: 'claimed' } : { ...style, reward: 'pending' }
}

function baseMarkerOf(node: WorldNode, cleared: boolean, openCamp: boolean): MarkerStyle {
  if (openCamp) {
    return { shape: 'flame', color: 0xffc233, radius: 48 }
  }

  switch (node.type) {
    case NodeType.CAMP_BOSS:
      return {
        shape: 'skull',
        color: node.bossKind === BossKind.CAPTOR ? 0xff4d8d : node.bossKind === BossKind.SEAL ? 0xa855f7 : 0xff8a00,
        radius: 46
      }
    case NodeType.SANCTUARY:
      return { shape: 'diamond', color: 0x22d3ee, radius: node.guardian ? 40 : 34 }
    case NodeType.MERCHANT:
      return { shape: 'square', color: 0x84f06b, radius: 34 }
    case NodeType.TEAR:
      return { shape: 'drop', color: 0x3b82f6, radius: 34 }
    case NodeType.CHEST:
      return { shape: cleared ? 'chestOpen' : 'chest', color: 0xd99a3e, radius: 30 }
    case NodeType.AMBER_FLASK:
      return { shape: 'drop', color: 0xffa62b, radius: 40 }
    case NodeType.AMBER_EMBER:
      return { shape: 'diamond', color: 0xff7a1a, radius: 36 }
    case NodeType.RELIQUARY:
      return { shape: 'sword', color: 0xe2e8f0, radius: 44 }
    case NodeType.ABYSS_GATE:
      return { shape: 'gate', color: cleared ? 0x7c3aed : 0x3b1d5c, radius: 60 }
    case NodeType.FINAL_BOSS:
      return { shape: 'skull', color: cleared ? 0x5c1a1a : 0xff2a2a, radius: 72 }
    case NodeType.COMBAT:
      return cleared ? CLEARED : COMBAT
    default:
      return CLEARED
  }
}

/** A color nearly grey and darker: a reward already taken. */
export function faded(color: number): number {
  const r = (color >> 16) & 0xff
  const g = (color >> 8) & 0xff
  const b = color & 0xff
  const grey = 0.3 * r + 0.59 * g + 0.11 * b
  const mix = (channel: number) => Math.round((grey * 0.8 + channel * 0.2) * 0.55)

  return (mix(r) << 16) | (mix(g) << 8) | mix(b)
}

/** A color darkened to a share of its brightness (silhouettes in the fog). */
export function darken(color: number, share: number): number {
  const r = Math.round(((color >> 16) & 0xff) * share)
  const g = Math.round(((color >> 8) & 0xff) * share)
  const b = Math.round((color & 0xff) * share)

  return (r << 16) | (g << 8) | b
}
