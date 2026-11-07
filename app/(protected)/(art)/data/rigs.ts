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

/** A point on an image: shares of its box from the top-left corner. */
export type Share = [number, number]

/**
 * The bowstring drawn by code where the one on the body image does not reach
 * the bow: from each end of the string on the body to the nock of the bow on
 * the same side (top, then bottom). Drawn behind the bow.
 */
export interface RigString {
  body: [Share, Share]
  weapon: [Share, Share]
  /** In body heights. */
  width: number
  color: number
}

export type RotationKeys = [number, number][]

export interface Rig {
  /** The image (catalog id) each slot reads (a hero that shoots has no arm). */
  images: Partial<Record<Slot, string>>
  sizes: Partial<Record<Slot, SlotSize>>
  bones: RigBone[]
  string?: RigString
  attack?: Partial<Record<BoneRole, RotationKeys>>
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
 * horizontal): the bows stand upright, and where
 * the fist is across the image (`gripY`, share of its height: 0.5 unless given).
 * A bow whose limbs do not reach the string drawn on the body says where its
 * nocks are (`nocks`, shares of the image, the end that ends up on top first):
 * the string is drawn by code from the body to them (see BOW_STRINGS).
 */
interface WeaponFit {
  grip: number
  length: number
  rest?: number
  gripY?: number
  nocks?: [Share, Share]
}

const WEAPONS: Record<string, WeaponFit> = {
  sword: { grip: 0.18, length: 0.67 },
  // The bow images lie with the string on top: turned upright, the string faces the archer.
  // Fitted so body + bow match Sera's whole figure (heroes/sera/full) over each other.
  bow: { grip: 0.467, gripY: 0.592, length: 0.935, rest: -Math.PI / 2 + 0.245 },
  axe: { grip: 0.17, gripY: 0.43, length: 0.73, rest: -0.25 },
  dawnbrand: { grip: 0.18, length: 0.66 },
  mace: { grip: 0.15, length: 0.62 },
  // The other bows: the fist on the wrist at the same size and tilt as the first bow's
  // (grip on the middle of the fist), measured on the images.
  // The longbow is straight and even: its lower limb does not reach the string of the body, so it has nocks.
  longbow: {
    grip: 0.5045,
    gripY: 0.6006,
    length: 0.99,
    rest: -Math.PI / 2 + 0.22,
    nocks: [
      [0.99, 0.08],
      [0.01, 0.06]
    ]
  },
  // Both string ends of the body fall on its gold rings.
  'gale-bow': { grip: 0.4997, gripY: 0.714, length: 0.956, rest: -Math.PI / 2 + 0.213 },
  maul: { grip: 0.16, gripY: 0.45, length: 0.78, rest: -0.25 },
  hatchets: { grip: 0.13, gripY: 0.43, length: 0.73, rest: -0.25 },
  'root-sickle': { grip: 0.196, gripY: 0.331, length: 0.88, rest: -0.32 },
  scythe: { grip: 0.194, gripY: 0.351, length: 0.88, rest: -0.32 },
  'thorn-sickle': { grip: 0.19, gripY: 0.34, length: 0.88, rest: -0.32 },
  // The grimoires float beside the hand: it "holds" them by their spine.
  tome: { grip: 0.5, gripY: 1.12, length: 0.29, rest: 0 },
  codex: { grip: 0.5, gripY: 1.12, length: 0.29, rest: 0 },
  grimoire: { grip: 0.5, gripY: 1.12, length: 0.29, rest: 0 }
}

/** How a weapon is held and how long it is (see WEAPONS), or null when it has no fit of its own: for /dev/heroes. */
export function weaponFit(art: string): WeaponFit | null {
  return WEAPONS[art] ?? null
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
const BRANN_ARM: ArmJoints = { shoulder: [0.235, 0.317], top: [0.37, 0.15], wrist: [0.83, 0.89] }
const OREN_ARM: ArmJoints = { shoulder: [0.24, 0.32], top: [0.45, 0.2], wrist: [0.815, 0.89] }
const YSOLDE_ARM: ArmJoints = { shoulder: [0.675, 0.32], top: [0.11, 0.27], wrist: [0.82, 0.34] }
const YSOLDE_ATTACK: NonNullable<Rig['attack']> = {
  arm: [
    [0, 0],
    [0.45, -0.32],
    [0.65, -0.16],
    [1, 0]
  ],
  weapon: [
    [0, 0],
    [0.45, 0.25],
    [0.65, 0.1],
    [1, 0]
  ]
}
const FOREGROUND_ATTACK: NonNullable<Rig['attack']> = {
  arm: [
    [0, 0],
    [0.42, 0.52],
    [0.63, -0.55],
    [1, 0]
  ],
  weapon: [
    [0, 0],
    [0.42, -1.35],
    [0.63, 0.65],
    [1, 0]
  ]
}
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
/**
 * Heroes that shoot: where the string drawn on the body image ends (top, then
 * bottom), and how thick it is (body heights) and its color, for the bows that
 * need the string drawn up to their nocks.
 */
const BOW_STRINGS: Partial<Record<CharacterId, { ends: [Share, Share]; width: number; color: number }>> = {
  [CharacterId.SERA]: {
    ends: [
      [0.993, 0.031],
      [0.858, 0.781]
    ],
    width: 0.0065,
    color: 0x1e0c02
  }
}

/** The hero skeleton, back to front: the arm, the weapon with its fist over it, and the body in front of both. */
function heroBones(weapon: WeaponFit, arm: ArmJoints, foreground: boolean): RigBone[] {
  const body: RigBone = { role: 'body', slot: 'body', segment: 1, pivot: [0.5, 1], at: [0, 0] }
  const held: RigBone[] = [
    { role: 'arm', slot: 'arm', segment: 1, parent: 'body', pivot: arm.top, at: arm.shoulder },
    // At rest the blade points up and forward, as in the whole figure.
    {
      role: 'weapon',
      slot: 'weapon',
      segment: 1,
      parent: 'arm',
      pivot: [weapon.grip, weapon.gripY ?? 0.5],
      at: arm.wrist,
      rotation: weapon.rest ?? -0.8
    }
  ]

  return foreground ? [body, ...held] : [...held, body]
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
  const brann = id === CharacterId.BRANN
  const oren = id === CharacterId.OREN
  const ysolde = id === CharacterId.YSOLDE
  const foreground = brann || oren
  const arm = brann ? BRANN_ARM : oren ? OREN_ARM : ysolde ? YSOLDE_ARM : DEFAULT_ARM
  const armSize: SlotSize = oren
    ? { segment: 1, side: 'height', length: 0.34 }
    : { ...SIZES.arm, length: brann ? 0.25 : ysolde ? 0.3 : SIZES.arm.length }
  const bowString = ranged ? BOW_STRINGS[id] : undefined

  return {
    images: {
      ...Object.fromEntries(parts.map((part) => [part, `heroes/${id}/${part}`])),
      weapon: `heroes/${id}/weapons/${loadout.weapon}`
    },
    sizes: {
      body: SIZES.body,
      ...(ranged ? {} : { arm: armSize }),
      weapon: { segment: 1, side: 'width', length: weapon.length }
    },
    bones: ranged
      ? shooterBones([weapon.grip, weapon.gripY ?? 0.5], weapon.rest ?? -Math.PI / 2, HANDS[id] ?? DEFAULT_HAND)
      : heroBones(weapon, arm, foreground),
    ...(foreground || ysolde ? { attack: ysolde ? YSOLDE_ATTACK : FOREGROUND_ATTACK } : {}),
    ...(bowString && weapon.nocks
      ? { string: { body: bowString.ends, weapon: weapon.nocks, width: bowString.width, color: bowString.color } }
      : {})
  }
}

/** The puppets, by the id of their whole image (figureArtId). */
export const RIGS: Record<string, Rig> = Object.fromEntries(
  Object.values(CharacterId).map((id) => [`heroes/${id}/full`, heroRig(id)])
)
