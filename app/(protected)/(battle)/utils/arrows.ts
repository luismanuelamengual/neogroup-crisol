import { Container, Graphics } from 'pixi.js'
import { DamageType } from '@/app/(protected)/(engine)/models/DamageType'
import { Skill } from '@/app/(protected)/(engine)/models/Skill'
import { StatusType } from '@/app/(protected)/(engine)/models/StatusType'

/**
 * The arrows that ranged weapons shoot, drawn by code (there are no images of
 * them): each kind is its colors, a glow around the head and the color of its
 * trail, so a new kind of arrow is one more entry of ARROW_LOOKS. An arrow
 * points right (+x) with its tip at (0, 0).
 */
export type ArrowKind = 'plain' | 'fire' | 'poison' | 'ice' | 'lightning' | 'light' | 'magic'

export interface ArrowLook {
  shaft: number
  head: number
  fletching: number
  /** The halo around the head (none: a plain arrow). */
  glow: number | null
  trail: number
}

const OUTLINE = 0x0a0710

export const ARROW_LOOKS: Record<ArrowKind, ArrowLook> = {
  plain: { shaft: 0xc89a5b, head: 0xd9dde6, fletching: 0xf5f1e6, glow: null, trail: 0xffffff },
  fire: { shaft: 0x7c3f1d, head: 0xffc233, fletching: 0xff5a1f, glow: 0xff7a00, trail: 0xff8a00 },
  poison: { shaft: 0x55652b, head: 0xc5f36b, fletching: 0x4d7c0f, glow: 0x84cc16, trail: 0xa3e635 },
  ice: { shaft: 0x9fb8cc, head: 0xd7f5ff, fletching: 0xe0f7ff, glow: 0x7dd3fc, trail: 0x7dd3fc },
  lightning: { shaft: 0xd8d4c4, head: 0xfff27a, fletching: 0xffffff, glow: 0xfde047, trail: 0xfde047 },
  light: { shaft: 0xe8d9a8, head: 0xfffbe0, fletching: 0xfff7c2, glow: 0xfff3b0, trail: 0xfff7c2 },
  magic: { shaft: 0x5b2f91, head: 0xf0d0ff, fletching: 0xc084fc, glow: 0xa855f7, trail: 0xc084fc }
}

const BY_DAMAGE: Partial<Record<DamageType, ArrowKind>> = {
  [DamageType.FIRE]: 'fire',
  [DamageType.ICE]: 'ice',
  [DamageType.LIGHTNING]: 'lightning',
  [DamageType.LIGHT]: 'light',
  [DamageType.DARKNESS]: 'magic'
}

/** The arrow a skill shoots: poisoned if it poisons, otherwise by its damage type (plain for the physical ones). */
export function arrowKindOf(skill: Pick<Skill, 'damageType' | 'statuses'>): ArrowKind {
  if (skill.statuses?.some((status) => status.type === StatusType.POISON && !status.onSelf)) {
    return 'poison'
  }

  return BY_DAMAGE[skill.damageType] ?? 'plain'
}

/** An arrow `length` pixels long, tip at (0, 0), pointing right. */
export function drawArrow(kind: ArrowKind, length: number): Container {
  const look = ARROW_LOOKS[kind]
  const arrow = new Container()
  const g = new Graphics()
  const stroke = { width: Math.max(1.5, length * 0.035), color: OUTLINE }
  const thick = length * 0.065
  const head = length * 0.22

  if (look.glow !== null) {
    const halo = new Graphics()

    halo.circle(-head * 0.4, 0, length * 0.22).fill({ color: look.glow, alpha: 0.22 })
    halo.circle(-head * 0.4, 0, length * 0.12).fill({ color: look.glow, alpha: 0.4 })
    arrow.addChild(halo)
  }

  // Fletching, shaft and head, back to front.
  g.poly([
    -length,
    0,
    -length * 1.06,
    -length * 0.1,
    -length * 0.8,
    -length * 0.1,
    -length * 0.74,
    0,
    -length * 0.8,
    length * 0.1,
    -length * 1.06,
    length * 0.1
  ])
    .fill({ color: look.fletching })
    .stroke(stroke)
  g.rect(-length * 0.98, -thick / 2, length * 0.98 - head * 0.6, thick)
    .fill({ color: look.shaft })
    .stroke(stroke)
  g.poly([0, 0, -head, -length * 0.09, -head * 0.75, 0, -head, length * 0.09])
    .fill({ color: look.head })
    .stroke(stroke)
  arrow.addChild(g)

  return arrow
}

/** The trail behind a flying arrow: its last positions, oldest first, fading towards the tail. */
export function drawTrail(g: Graphics, points: { x: number; y: number }[], kind: ArrowKind, width: number): void {
  const look = ARROW_LOOKS[kind]

  g.clear()

  for (let index = 1; index < points.length; index++) {
    const share = index / points.length

    g.moveTo(points[index - 1].x, points[index - 1].y)
      .lineTo(points[index].x, points[index].y)
      .stroke({
        width: width * share,
        color: look.trail,
        alpha: (look.glow === null ? 0.35 : 0.6) * share,
        cap: 'round'
      })
  }
}

/** The flash where an arrow lands, at a moment `t` (0..1) of its life: rays that open and fade. */
export function drawImpact(g: Graphics, kind: ArrowKind, size: number, t: number): void {
  const look = ARROW_LOOKS[kind]
  const color = look.glow ?? 0xffffff
  const reach = size * (0.4 + 0.6 * t)
  const alpha = 1 - t

  g.clear()
  g.circle(0, 0, size * 0.35 * (1 - t * 0.5)).fill({ color, alpha: alpha * 0.5 })

  for (let ray = 0; ray < 7; ray++) {
    const angle = (ray / 7) * Math.PI * 2 + 0.3

    g.moveTo(Math.cos(angle) * reach * 0.35, Math.sin(angle) * reach * 0.35)
      .lineTo(Math.cos(angle) * reach, Math.sin(angle) * reach)
      .stroke({ width: Math.max(1.5, size * 0.08), color, alpha, cap: 'round' })
  }
}
