import { CharacterId } from '@/app/(protected)/(engine)/models/CharacterId'

/**
 * Puppets: figures put together from separate images. A hero has one skeleton
 * and a "skin" per body part: every part of every outfit is its own image
 * (heroes/<id>/outfits/<outfit>/<part>), so a hero can wear the torso of one
 * outfit and the legs of another; weapons are images of their own too
 * (heroes/<id>/weapons/<weapon>). Arms and legs come in two segments (upper
 * and lower), so elbows and knees bend.
 *
 * Every image is generated on its own, at its own scale: each slot is sized
 * by one of its segments (`SIZES`, in torso heights), and joints are shares of
 * a segment's box (0..1, from its top-left corner): `pivot` is the joint on
 * the segment itself and `at` is where it sits on the parent's segment. Bones
 * are drawn in the order listed (back to front). Limbs are drawn hanging
 * straight down: rotation 0 hangs, positive turns clockwise.
 */

/** The body parts, each one an image per outfit. */
export const BODY_PARTS = ['head', 'torso', 'right-arm', 'left-arm', 'right-leg', 'left-leg'] as const

export type BodyPart = (typeof BODY_PARTS)[number]

/** Where a bone takes its image from: a body part or the weapon. */
export type Slot = BodyPart | 'weapon'

/** What each bone does when the puppet moves. */
export type BoneRole =
  | 'torso'
  | 'head'
  | 'rightArm'
  | 'rightForearm'
  | 'weapon'
  | 'leftArm'
  | 'leftForearm'
  | 'rightThigh'
  | 'rightShin'
  | 'leftThigh'
  | 'leftShin'

export interface RigBone {
  role: BoneRole
  slot: Slot
  /** 1 = the upper segment of a limb (or the only one), 2 = the lower. */
  segment: number
  /** The root (torso) has none: its pivot is the hip. */
  parent?: BoneRole
  pivot: [number, number]
  at: [number, number]
  /** Rest angle in radians. */
  rotation?: number
  /** On the far side of the body: drawn a little darker. */
  far?: boolean
}

/** How big each slot is drawn: one of its segments, along one side, in torso heights. */
export interface SlotSize {
  segment: number
  side: 'height' | 'width'
  length: number
}

export interface Rig {
  /** The image (catalog id) each slot reads. */
  images: Record<Slot, string>
  sizes: Record<Slot, SlotSize>
  bones: RigBone[]
}

/** What a hero wears, part by part, and holds. */
export interface Loadout {
  parts: Record<BodyPart, string>
  weapon: string
}

/** Every part from the same outfit. */
function outfit(name: string): Record<BodyPart, string> {
  return Object.fromEntries(BODY_PARTS.map((part) => [part, name])) as Record<BodyPart, string>
}

/** What each hero starts with (the first outfit and weapon of scripts/art/descriptions.ts). */
export const HERO_LOADOUTS: Record<CharacterId, Loadout> = {
  [CharacterId.KAEL]: { parts: outfit('traveller'), weapon: 'sword' },
  [CharacterId.SERA]: { parts: outfit('ranger'), weapon: 'bow' },
  [CharacterId.BRANN]: { parts: outfit('berserker'), weapon: 'axe' },
  [CharacterId.OREN]: { parts: outfit('grove'), weapon: 'staff' },
  [CharacterId.YSOLDE]: { parts: outfit('court'), weapon: 'staff' }
}

/** Each weapon: where the hand holds it (share of its length from the handle end) and how long it is. */
const WEAPONS: Record<string, { grip: number; length: number }> = {
  sword: { grip: 0.12, length: 1.3 },
  bow: { grip: 0.5, length: 1.6 },
  axe: { grip: 0.3, length: 1.5 },
  staff: { grip: 0.4, length: 2 }
}
/** Limbs are sized by their upper segment: the lower one may carry a shield. */
const SIZES: Record<BodyPart, SlotSize> = {
  head: { segment: 1, side: 'height', length: 0.5 },
  torso: { segment: 1, side: 'height', length: 1 },
  'right-arm': { segment: 1, side: 'height', length: 0.5 },
  'left-arm': { segment: 1, side: 'height', length: 0.5 },
  'right-leg': { segment: 1, side: 'height', length: 0.55 },
  'left-leg': { segment: 1, side: 'height', length: 0.55 }
}

/** The hero skeleton, in strict profile facing right. */
function heroBones(grip: number): RigBone[] {
  return [
    // Left (far) side: behind the body.
    {
      role: 'leftThigh',
      slot: 'left-leg',
      segment: 1,
      parent: 'torso',
      pivot: [0.5, 0.08],
      at: [0.55, 0.9],
      rotation: 0.35,
      far: true
    },
    {
      role: 'leftShin',
      slot: 'left-leg',
      segment: 2,
      parent: 'leftThigh',
      pivot: [0.5, 0.06],
      at: [0.5, 0.92],
      rotation: 0.1,
      far: true
    },
    {
      role: 'leftArm',
      slot: 'left-arm',
      segment: 1,
      parent: 'torso',
      pivot: [0.5, 0.1],
      at: [0.6, 0.14],
      rotation: -0.6,
      far: true
    },
    {
      role: 'leftForearm',
      slot: 'left-arm',
      segment: 2,
      parent: 'leftArm',
      pivot: [0.5, 0.06],
      at: [0.5, 0.92],
      rotation: -1.0,
      far: true
    },
    { role: 'torso', slot: 'torso', segment: 1, pivot: [0.5, 0.95], at: [0, 0] },
    // Right (near) side: in front.
    {
      role: 'rightThigh',
      slot: 'right-leg',
      segment: 1,
      parent: 'torso',
      pivot: [0.5, 0.08],
      at: [0.5, 0.9],
      rotation: -0.35
    },
    {
      role: 'rightShin',
      slot: 'right-leg',
      segment: 2,
      parent: 'rightThigh',
      pivot: [0.5, 0.06],
      at: [0.5, 0.92],
      rotation: 0.35
    },
    { role: 'head', slot: 'head', segment: 1, parent: 'torso', pivot: [0.45, 0.95], at: [0.55, 0.04] },
    {
      role: 'rightArm',
      slot: 'right-arm',
      segment: 1,
      parent: 'torso',
      pivot: [0.5, 0.1],
      at: [0.45, 0.14],
      rotation: -0.3
    },
    {
      role: 'weapon',
      slot: 'weapon',
      segment: 1,
      parent: 'rightForearm',
      pivot: [grip, 0.5],
      at: [0.5, 0.88],
      rotation: 0.7
    },
    {
      role: 'rightForearm',
      slot: 'right-arm',
      segment: 2,
      parent: 'rightArm',
      pivot: [0.5, 0.06],
      at: [0.5, 0.92],
      rotation: -1.4
    }
  ]
}

/** A hero's puppet as they are dressed and armed. */
export function heroRig(id: CharacterId, loadout: Loadout = HERO_LOADOUTS[id]): Rig {
  const weapon = WEAPONS[loadout.weapon] ?? { grip: 0.2, length: 1.4 }

  return {
    images: {
      ...(Object.fromEntries(
        BODY_PARTS.map((part) => [part, `heroes/${id}/outfits/${loadout.parts[part]}/${part}`])
      ) as Record<BodyPart, string>),
      weapon: `heroes/${id}/weapons/${loadout.weapon}`
    },
    sizes: { ...SIZES, weapon: { segment: 1, side: 'width', length: weapon.length } },
    bones: heroBones(weapon.grip)
  }
}

/** The puppets, by the id of their whole image (figureArtId). */
export const RIGS: Record<string, Rig> = Object.fromEntries(
  Object.values(CharacterId).map((id) => [`heroes/${id}/full`, heroRig(id)])
)
