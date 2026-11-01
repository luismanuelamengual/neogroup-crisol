import { CharacterId } from '@/app/(protected)/(engine)/models/CharacterId'

/**
 * Puppets: figures put together from separate images. A hero is three
 * images: per outfit, the body without the arm that holds the weapon
 * (heroes/<id>/outfits/<outfit>/body) and that arm on its own, in one piece
 * from the shoulder to the wrist (heroes/<id>/outfits/<outfit>/arm), and each
 * weapon with the fist that holds it (heroes/<id>/weapons/<weapon>). Nothing bends: the body only leans
 * and breathes, and the whole arm swings from the shoulder, the weapon from the wrist.
 *
 * Every image is generated on its own, at its own scale: each slot is sized
 * by one of its segments (`SIZES`, in body heights), and joints are shares of
 * a segment's box (0..1, from its top-left corner): `pivot` is the joint on
 * the segment itself and `at` is where it sits on the parent's segment. Bones
 * are drawn in the order listed (back to front). The arm is drawn hanging
 * straight down: rotation 0 hangs, positive turns clockwise.
 */

/** The body parts, each one an image per outfit. */
export const BODY_PARTS = ['body', 'arm'] as const

export type BodyPart = (typeof BODY_PARTS)[number]

/** Where a bone takes its image from: a body part or the weapon. */
export type Slot = BodyPart | 'weapon'

/** What each bone does when the puppet moves. */
export type BoneRole = 'body' | 'arm' | 'weapon'

export interface RigBone {
  role: BoneRole
  slot: Slot
  /** Which piece of the slot's image: 1 when it has only one. */
  segment: number
  /** The root (body) has none: its pivot is between the feet. */
  parent?: BoneRole
  pivot: [number, number]
  at: [number, number]
  /** Rest angle in radians. */
  rotation?: number
  /** On the far side of the body: drawn a little darker. */
  far?: boolean
}

/** How big each slot is drawn: one of its segments, along one side, in body heights. */
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
  [CharacterId.OREN]: { parts: outfit('grove'), weapon: 'root-sickle' },
  [CharacterId.YSOLDE]: { parts: outfit('court'), weapon: 'tome' }
}

/**
 * Each weapon: where the fist holds it (share of its length from the handle
 * end: the weapon images come with the hero's fist on the grip) and how long
 * it is, fist included (in body heights).
 */
const WEAPONS: Record<string, { grip: number; length: number }> = {
  sword: { grip: 0.18, length: 0.67 },
  bow: { grip: 0.5, length: 0.78 },
  axe: { grip: 0.3, length: 0.73 },
  dawnbrand: { grip: 0.18, length: 0.66 },
  mace: { grip: 0.15, length: 0.53 },
  crossbow: { grip: 0.35, length: 0.53 },
  'gale-bow': { grip: 0.5, length: 0.78 },
  maul: { grip: 0.25, length: 0.78 },
  hatchets: { grip: 0.2, length: 0.44 },
  'root-sickle': { grip: 0.2, length: 0.44 },
  scythe: { grip: 0.4, length: 0.97 },
  'thorn-sickle': { grip: 0.35, length: 0.73 },
  // The grimoires float beside the hand: it "holds" them by their spine.
  tome: { grip: 0.5, length: 0.39 },
  codex: { grip: 0.5, length: 0.39 },
  grimoire: { grip: 0.5, length: 0.39 }
}
/** The arm is sized by its width (it comes bent, from the shoulder to the wrist). */
const SIZES: Record<BodyPart, SlotSize> = {
  body: { segment: 1, side: 'height', length: 1 },
  arm: { segment: 1, side: 'width', length: 0.2 }
}

/**
 * Where each hero's arm joins the body and the weapon (shares of each image's
 * box from its top-left corner): `shoulder` on the body image, and on the arm
 * image its shoulder end (`top`) and its wrist (`wrist`), where the fist of the
 * weapon image goes. Adjust a hero here when the pieces do not meet (see
 * /dev/art).
 */
interface ArmJoints {
  shoulder: [number, number]
  top: [number, number]
  wrist: [number, number]
}

const DEFAULT_ARM: ArmJoints = { shoulder: [0.67, 0.37], top: [0.28, 0.12], wrist: [1.12, 0.91] }
const ARMS: Partial<Record<CharacterId, Partial<ArmJoints>>> = {}

/** The hero skeleton, back to front: the arm, the weapon with its fist over it, and the body in front of both. */
function heroBones(grip: number, arm: ArmJoints): RigBone[] {
  return [
    { role: 'arm', slot: 'arm', segment: 1, parent: 'body', pivot: arm.top, at: arm.shoulder },
    // At rest the blade points up and forward, as in the whole figure.
    { role: 'weapon', slot: 'weapon', segment: 1, parent: 'arm', pivot: [grip, 0.5], at: arm.wrist, rotation: -0.8 },
    { role: 'body', slot: 'body', segment: 1, pivot: [0.5, 1], at: [0, 0] }
  ]
}

/** A hero's puppet as they are dressed and armed. */
export function heroRig(id: CharacterId, loadout: Loadout = HERO_LOADOUTS[id]): Rig {
  const weapon = WEAPONS[loadout.weapon] ?? { grip: 0.2, length: 0.7 }

  return {
    images: {
      ...(Object.fromEntries(
        BODY_PARTS.map((part) => [part, `heroes/${id}/outfits/${loadout.parts[part]}/${part}`])
      ) as Record<BodyPart, string>),
      weapon: `heroes/${id}/weapons/${loadout.weapon}`
    },
    sizes: { ...SIZES, weapon: { segment: 1, side: 'width', length: weapon.length } },
    bones: heroBones(weapon.grip, { ...DEFAULT_ARM, ...ARMS[id] })
  }
}

/** The puppets, by the id of their whole image (figureArtId). */
export const RIGS: Record<string, Rig> = Object.fromEntries(
  Object.values(CharacterId).map((id) => [`heroes/${id}/full`, heroRig(id)])
)
