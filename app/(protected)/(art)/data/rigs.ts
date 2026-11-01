import { CharacterId } from '@/app/(protected)/(engine)/models/CharacterId'

/**
 * Puppets: figures put together from separate images. A hero is three
 * images: per outfit, the body without the arm that holds the weapon
 * (heroes/<id>/outfits/<outfit>/body) and that arm on its own, in two
 * segments so the elbow bends (heroes/<id>/outfits/<outfit>/arm), and each
 * weapon (heroes/<id>/weapons/<weapon>). The body does not bend: it only
 * leans and breathes; the arm and the weapon do the moves.
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
export type BoneRole = 'body' | 'arm' | 'forearm' | 'weapon'

export interface RigBone {
  role: BoneRole
  slot: Slot
  /** 1 = the upper segment of a limb (or the only one), 2 = the lower. */
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

const WEAPONS: Record<string, { grip: number; length: number }> = {
  sword: { grip: 0.12, length: 0.55 },
  bow: { grip: 0.5, length: 0.67 },
  axe: { grip: 0.3, length: 0.63 },
  dawnbrand: { grip: 0.12, length: 0.57 },
  mace: { grip: 0.15, length: 0.46 },
  crossbow: { grip: 0.35, length: 0.46 },
  'gale-bow': { grip: 0.5, length: 0.67 },
  maul: { grip: 0.25, length: 0.67 },
  hatchets: { grip: 0.2, length: 0.38 },
  'root-sickle': { grip: 0.2, length: 0.38 },
  scythe: { grip: 0.4, length: 0.84 },
  'thorn-sickle': { grip: 0.35, length: 0.63 },
  // The grimoires float beside the hand: it "holds" them by their spine.
  tome: { grip: 0.5, length: 0.34 },
  codex: { grip: 0.5, length: 0.34 },
  grimoire: { grip: 0.5, length: 0.34 }
}
/** The arm is sized by its upper segment (shoulder to elbow). */
const SIZES: Record<BodyPart, SlotSize> = {
  body: { segment: 1, side: 'height', length: 1 },
  arm: { segment: 1, side: 'height', length: 0.19 }
}
/**
 * Where the arm hangs from on each hero's body image (share of its box from
 * the top-left corner). Adjust a hero here when its arm does not sit on the
 * shoulder (see the art preview).
 */
const DEFAULT_SHOULDER: [number, number] = [0.5, 0.3]
const SHOULDERS: Partial<Record<CharacterId, [number, number]>> = {}

/** The hero skeleton: the body, and the arm with the weapon in front of it. */
function heroBones(grip: number, shoulder: [number, number]): RigBone[] {
  return [
    { role: 'body', slot: 'body', segment: 1, pivot: [0.5, 1], at: [0, 0] },
    { role: 'arm', slot: 'arm', segment: 1, parent: 'body', pivot: [0.5, 0.1], at: shoulder, rotation: -0.3 },
    {
      role: 'weapon',
      slot: 'weapon',
      segment: 1,
      parent: 'forearm',
      pivot: [grip, 0.5],
      at: [0.5, 0.88],
      rotation: 0.7
    },
    {
      role: 'forearm',
      slot: 'arm',
      segment: 2,
      parent: 'arm',
      pivot: [0.5, 0.06],
      at: [0.5, 0.92],
      rotation: -1.4
    }
  ]
}

/** A hero's puppet as they are dressed and armed. */
export function heroRig(id: CharacterId, loadout: Loadout = HERO_LOADOUTS[id]): Rig {
  const weapon = WEAPONS[loadout.weapon] ?? { grip: 0.2, length: 0.6 }

  return {
    images: {
      ...(Object.fromEntries(
        BODY_PARTS.map((part) => [part, `heroes/${id}/outfits/${loadout.parts[part]}/${part}`])
      ) as Record<BodyPart, string>),
      weapon: `heroes/${id}/weapons/${loadout.weapon}`
    },
    sizes: { ...SIZES, weapon: { segment: 1, side: 'width', length: weapon.length } },
    bones: heroBones(weapon.grip, SHOULDERS[id] ?? DEFAULT_SHOULDER)
  }
}

/** The puppets, by the id of their whole image (figureArtId). */
export const RIGS: Record<string, Rig> = Object.fromEntries(
  Object.values(CharacterId).map((id) => [`heroes/${id}/full`, heroRig(id)])
)
