/**
 * Shadow at the feet of each figure, adjustable one by one (heroes, enemies and bosses).
 *
 * The key is the figure's art id ('heroes/<id>/full', 'enemies/<id>', 'bosses/<id>').
 * - x, y: shift in pixels of a fighter of size 1 (positive x to the right, positive y down).
 * - width, height: multiplies the base ellipse (1 = as it is; 2 = twice as wide or tall).
 *
 * Figures without an entry get the base shadow. Check it in /dev/art.
 */
export interface ShadowAdjust {
  x?: number
  y?: number
  width?: number
  height?: number
}

/** Radii of the base ellipse, in pixels of a fighter of size 1. */
export const SHADOW_RADIUS = { x: 40, y: 10 }

export const SHADOW_ALPHA = 0.35

export const SHADOWS: Record<string, ShadowAdjust> = {
  // Heroes (in battle they are puppets: adjust them looking at the puppet in /dev/art)
  'heroes/kael/full': { x: 8, width: 1.15 },

  // Meadows enemies
  'enemies/bandit-archer': { x: 7 },
  'enemies/field-rat': { x: 2, width: 1.1 },
  'enemies/giant-toad': { width: 2.3, height: 1.4 },
  'enemies/hedge-sprite': { x: 4, width: 1.1 },
  'enemies/meadow-wasp': { x: -14, width: 1.25 },
  'enemies/road-bandit': { x: 4 },
  'enemies/scarecrow': { x: 10 },
  'enemies/thorn-boar': { x: -4, width: 1.75, height: 1.3 },
  'enemies/wheat-spirit': { x: 3, width: 0.8 },

  // Meadows bosses
  'bosses/bandit-chief': { x: 16, width: 1.15 },
  'bosses/boar-matriarch': { x: 4, width: 1.65, height: 1.3 },
  'bosses/old-scarecrow': { x: 3, width: 1.15 }
}

/** Center and radii of a figure's shadow, in pixels of a fighter of size 1. */
export function shadowOf(artId: string): { x: number; y: number; radiusX: number; radiusY: number } {
  const adjust = SHADOWS[artId] ?? {}

  return {
    x: adjust.x ?? 0,
    y: adjust.y ?? 0,
    radiusX: SHADOW_RADIUS.x * (adjust.width ?? 1),
    radiusY: SHADOW_RADIUS.y * (adjust.height ?? 1)
  }
}
