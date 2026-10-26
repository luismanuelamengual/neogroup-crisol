import { CharacterId } from '@/app/(protected)/(engine)/models/CharacterId'

/**
 * Puppets: figures put together from pieces of their sheets. A hero has one
 * skeleton and swappable sheets: the head (three faces), an outfit (the
 * clothed body in 10 pieces), a weapon and maybe an off-hand item. Changing
 * outfit or weapon only changes which sheet a slot reads.
 *
 * Coordinates are shares of a piece's box (0..1, from its top-left corner):
 * `pivot` is the joint on the piece itself and `at` is where that joint sits
 * on the parent's piece, so any outfit drawn in the same layout fits. Pieces
 * are numbered as `yarn art` cut the sheet (rows top to bottom, left to right).
 * Bones are drawn in the order listed (back to front). Limbs are drawn hanging
 * straight down: rotation 0 hangs, positive turns clockwise.
 */

/** Where a bone takes its piece from. */
export type Slot = 'head' | 'outfit' | 'weapon' | 'offhand'

/** What each bone does when the puppet moves. */
export type BoneRole =
  | 'torso'
  | 'head'
  | 'cape'
  | 'rightArm'
  | 'rightForearm'
  | 'weapon'
  | 'leftArm'
  | 'leftForearm'
  | 'offhand'
  | 'rightThigh'
  | 'rightShin'
  | 'leftThigh'
  | 'leftShin'

export interface RigBone {
  role: BoneRole
  slot: Slot
  /** 1 = the first piece of the slot's sheet. */
  part: number
  /** The root (torso) has none: its pivot is the hip. */
  parent?: BoneRole
  pivot: [number, number]
  at: [number, number]
  /** Rest angle in radians. */
  rotation?: number
  /** Evens out pieces drawn out of scale (a big head). Not passed on to children. */
  scale?: number
  /** On the far side of the body: drawn a little darker. */
  far?: boolean
}

export interface Rig {
  /** The sheet (catalog id) each slot reads; a bone whose slot has none is left out. */
  sheets: Partial<Record<Slot, string>>
  bones: RigBone[]
  /** Head pieces for the moves (the calm face is the bone's own part). */
  faces?: { effort: number; pain: number }
}

/** What a hero wears and holds. */
export interface Loadout {
  outfit: string
  weapon: string
  /** Whether they hold something in the left hand (Kael's shield). */
  offhand: boolean
}

/** What each hero starts with (the first outfit and weapon of scripts/art/descriptions.ts). */
export const HERO_LOADOUTS: Record<CharacterId, Loadout> = {
  [CharacterId.KAEL]: { outfit: 'traveler', weapon: 'sword', offhand: true },
  [CharacterId.SERA]: { outfit: 'ranger', weapon: 'bow', offhand: false },
  [CharacterId.BRANN]: { outfit: 'berserker', weapon: 'axe', offhand: false },
  [CharacterId.OREN]: { outfit: 'grove', weapon: 'staff', offhand: false },
  [CharacterId.YSOLDE]: { outfit: 'court', weapon: 'staff', offhand: false }
}

/** Where the hand holds each weapon: share of its length from the left (the handle end). */
const GRIPS: Record<string, number> = { sword: 0.12, bow: 0.5, axe: 0.25, staff: 0.4 }

/**
 * The hero skeleton, in strict profile facing right. Outfit pieces: 1 torso,
 * 2 upper right arm, 3 right forearm with fist, 4 upper left arm, 5 left
 * forearm with fist, 6 right thigh, 7 right shin, 8 left thigh, 9 left shin,
 * 10 cape. Head pieces: 1 calm, 2 effort, 3 pain.
 */
function heroBones(grip: number): RigBone[] {
  return [
    { role: 'cape', slot: 'outfit', part: 10, parent: 'torso', pivot: [0.85, 0.08], at: [0.45, 0.06], far: true },
    // Left (far) side: behind the body, holding the off-hand item.
    {
      role: 'offhand',
      slot: 'offhand',
      part: 1,
      parent: 'leftForearm',
      pivot: [0.5, 0.5],
      at: [0.5, 0.88],
      rotation: 1.6
    },
    {
      role: 'leftThigh',
      slot: 'outfit',
      part: 8,
      parent: 'torso',
      pivot: [0.5, 0.08],
      at: [0.55, 0.9],
      rotation: 0.35,
      far: true
    },
    {
      role: 'leftShin',
      slot: 'outfit',
      part: 9,
      parent: 'leftThigh',
      pivot: [0.5, 0.06],
      at: [0.5, 0.92],
      rotation: 0.1,
      far: true
    },
    {
      role: 'leftArm',
      slot: 'outfit',
      part: 4,
      parent: 'torso',
      pivot: [0.5, 0.1],
      at: [0.6, 0.14],
      rotation: -0.6,
      far: true
    },
    {
      role: 'leftForearm',
      slot: 'outfit',
      part: 5,
      parent: 'leftArm',
      pivot: [0.5, 0.06],
      at: [0.5, 0.92],
      rotation: -1.0,
      far: true
    },
    { role: 'torso', slot: 'outfit', part: 1, pivot: [0.5, 0.92], at: [0, 0] },
    // Right (near) side: in front.
    {
      role: 'rightThigh',
      slot: 'outfit',
      part: 6,
      parent: 'torso',
      pivot: [0.5, 0.08],
      at: [0.5, 0.9],
      rotation: -0.35
    },
    {
      role: 'rightShin',
      slot: 'outfit',
      part: 7,
      parent: 'rightThigh',
      pivot: [0.5, 0.06],
      at: [0.5, 0.92],
      rotation: 0.35
    },
    { role: 'head', slot: 'head', part: 1, parent: 'torso', pivot: [0.45, 0.95], at: [0.55, 0.04] },
    { role: 'rightArm', slot: 'outfit', part: 2, parent: 'torso', pivot: [0.5, 0.1], at: [0.45, 0.14], rotation: -0.3 },
    {
      role: 'weapon',
      slot: 'weapon',
      part: 1,
      parent: 'rightForearm',
      pivot: [grip, 0.5],
      at: [0.5, 0.88],
      rotation: 0.7
    },
    {
      role: 'rightForearm',
      slot: 'outfit',
      part: 3,
      parent: 'rightArm',
      pivot: [0.5, 0.06],
      at: [0.5, 0.92],
      rotation: -1.4
    }
  ]
}

function heroRig(id: CharacterId): Rig {
  const loadout = HERO_LOADOUTS[id]

  return {
    sheets: {
      head: `heroes/${id}-head`,
      outfit: `outfits/${id}-${loadout.outfit}`,
      weapon: `weapons/${id}-${loadout.weapon}`,
      offhand: loadout.offhand ? `offhands/${id}` : undefined
    },
    bones: heroBones(GRIPS[loadout.weapon] ?? 0.2),
    faces: { effort: 2, pain: 3 }
  }
}

/** The puppets, by the id of their whole image (figureArtId). */
export const RIGS: Record<string, Rig> = Object.fromEntries(
  Object.values(CharacterId).map((id) => [`heroes/${id}`, heroRig(id)])
)
