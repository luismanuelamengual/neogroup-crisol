import { isRangedCharacter } from '@/app/(protected)/(engine)/data/weapons'
import { CharacterId } from '@/app/(protected)/(engine)/models/CharacterId'

/**
 * Puppets: figures put together from separate images. A hero is three
 * images: the body without the arm that holds the weapon
 * (heroes/<id>/body) and that arm on its own, in one piece
 * from the shoulder to the wrist (heroes/<id>/arm), and each
 * weapon with the fist that holds it (heroes/<id>/weapons/<weapon>). Nothing bends: the body only leans
 * and breathes, and the whole arm swings from the shoulder, the weapon from the wrist.
 *
 * Heroes that shoot (isRangedCharacter: Sera) do not swing their arm: they
 * are two images, the body without the weapon nor the hand that holds it and
 * the weapon with that fist, set at the wrist of the body (see HANDS). Any of
 * their weapons fits the same body.
 *
 * Every image is generated on its own, at its own scale: each slot is sized
 * by one of its segments (`SIZES`, in body heights), and joints are shares of
 * a segment's box (0..1, from its top-left corner): `pivot` is the joint on
 * the segment itself and `at` is where it sits on the parent's segment. Bones
 * are drawn in the order listed (back to front). The arm is drawn hanging
 * straight down: rotation 0 hangs, positive turns clockwise.
 */

/** The body parts, each one an image of its own. */
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
  /** The image (catalog id) each slot reads (a hero that shoots has no arm). */
  images: Partial<Record<Slot, string>>
  sizes: Partial<Record<Slot, SlotSize>>
  bones: RigBone[]
}

/** What a hero holds. */
export interface Loadout {
  weapon: string
}

/** What each hero starts with (the first weapon of scripts/art/descriptions.ts). */
export const HERO_LOADOUTS: Record<CharacterId, Loadout> = {
  [CharacterId.KAEL]: { weapon: 'sword' },
  [CharacterId.SERA]: { weapon: 'bow' },
  [CharacterId.BRANN]: { weapon: 'axe' },
  [CharacterId.OREN]: { weapon: 'root-sickle' },
  [CharacterId.YSOLDE]: { weapon: 'tome' }
}

/**
 * Each weapon: where the fist holds it (share of its length from the handle
 * end: the weapon images come with the hero's fist on the grip) and how long
 * it is, fist included (in body heights). The weapons of heroes that shoot
 * also say how they are held (`rest`, radians from the image, which is
 * horizontal): the bows stand upright, the crossbow points ahead, and where
 * the fist is across the image (`gripY`, share of its height: 0.5 unless given).
 */
const WEAPONS: Record<string, { grip: number; length: number; rest?: number; gripY?: number }> = {
  sword: { grip: 0.18, length: 0.67 },
  // The bow images lie with the string on top: turned upright, the string faces the archer.
  // Fitted so body + bow match Sera's whole figure (heroes/sera/full) over each other.
  bow: { grip: 0.467, gripY: 0.592, length: 0.935, rest: -Math.PI / 2 + 0.245 },
  axe: { grip: 0.3, length: 0.73 },
  dawnbrand: { grip: 0.18, length: 0.66 },
  mace: { grip: 0.15, length: 0.53 },
  crossbow: { grip: 0.35, length: 0.53, rest: 0 },
  'gale-bow': { grip: 0.5, length: 0.78, rest: -Math.PI / 2 },
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
/**
 * Heroes that shoot: the wrist on the body image (share of its box from the
 * top-left corner) where the fist of the weapon image goes. Adjust a hero
 * here when the weapon does not meet the hand (see /dev/art).
 */
const DEFAULT_HAND: [number, number] = [0.88, 0.52]
const HANDS: Partial<Record<CharacterId, [number, number]>> = {
  // Past the end of the bracer of the outstretched arm, where the fist is in the whole figure.
  [CharacterId.SERA]: [0.973, 0.499]
}

/** The hero skeleton, back to front: the arm, the weapon with its fist over it, and the body in front of both. */
function heroBones(grip: number, arm: ArmJoints): RigBone[] {
  return [
    { role: 'arm', slot: 'arm', segment: 1, parent: 'body', pivot: arm.top, at: arm.shoulder },
    // At rest the blade points up and forward, as in the whole figure.
    { role: 'weapon', slot: 'weapon', segment: 1, parent: 'arm', pivot: [grip, 0.5], at: arm.wrist, rotation: -0.8 },
    { role: 'body', slot: 'body', segment: 1, pivot: [0.5, 1], at: [0, 0] }
  ]
}

/** A hero that shoots, front to back: the body, and the weapon with its fist in front, at its wrist. */
function shooterBones(grip: [number, number], rest: number, hand: [number, number]): RigBone[] {
  return [
    { role: 'body', slot: 'body', segment: 1, pivot: [0.5, 1], at: [0, 0] },
    { role: 'weapon', slot: 'weapon', segment: 1, parent: 'body', pivot: grip, at: hand, rotation: rest }
  ]
}

/** The body parts of a hero: the ones that shoot have no arm of their own. */
export function heroParts(id: CharacterId): BodyPart[] {
  return isRangedCharacter(id) ? ['body'] : [...BODY_PARTS]
}

/** A hero's puppet as they are armed. */
export function heroRig(id: CharacterId, loadout: Loadout = HERO_LOADOUTS[id]): Rig {
  const weapon = WEAPONS[loadout.weapon] ?? { grip: 0.2, length: 0.7 }
  const parts = heroParts(id)
  const ranged = isRangedCharacter(id)

  return {
    images: {
      ...Object.fromEntries(parts.map((part) => [part, `heroes/${id}/${part}`])),
      weapon: `heroes/${id}/weapons/${loadout.weapon}`
    },
    sizes: {
      body: SIZES.body,
      ...(ranged ? {} : { arm: SIZES.arm }),
      weapon: { segment: 1, side: 'width', length: weapon.length }
    },
    bones: ranged
      ? shooterBones([weapon.grip, weapon.gripY ?? 0.5], weapon.rest ?? -Math.PI / 2, HANDS[id] ?? DEFAULT_HAND)
      : heroBones(weapon.grip, { ...DEFAULT_ARM, ...ARMS[id] })
  }
}

/** The puppets, by the id of their whole image (figureArtId). */
export const RIGS: Record<string, Rig> = Object.fromEntries(
  Object.values(CharacterId).map((id) => [`heroes/${id}/full`, heroRig(id)])
)
