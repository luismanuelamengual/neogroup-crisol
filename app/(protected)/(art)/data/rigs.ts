/**
 * How the parts of a parts sheet are put together into a puppet. Coordinates
 * are pixels of the sheet: `pivot` is the joint on the part itself (from its
 * top-left corner) and `at` is where that joint sits on the parent part. The
 * parts are numbered as `yarn art` cut them (public/art/manifest.json → parts).
 * Bones are drawn in the order listed (back to front).
 */

/** What each bone does when the puppet moves. */
export type BoneRole =
  | 'torso'
  | 'head'
  | 'scarf'
  | 'frontArm'
  | 'frontForearm'
  | 'weapon'
  | 'backArm'
  | 'backShoulder'
  | 'shield'
  | 'frontLeg'
  | 'backLeg'

export interface RigBone {
  role: BoneRole
  part: number
  /** The root (torso) has none: its pivot is the hip. */
  parent?: BoneRole
  pivot: [number, number]
  at: [number, number]
  /** Rest angle in radians (positive turns clockwise). */
  rotation?: number
  /** The generator draws some parts out of scale (a big head): this evens them out. */
  scale?: number
}

export interface Rig {
  /** The parts sheet (catalog id). */
  sheet: string
  bones: RigBone[]
}

export const RIGS: Record<string, Rig> = {
  'heroes/kael': {
    sheet: 'heroes/kael-parts',
    bones: [
      { role: 'scarf', part: 7, parent: 'torso', pivot: [214, 36], at: [108, 22], scale: 0.75 },
      { role: 'backLeg', part: 11, parent: 'torso', pivot: [42, 30], at: [78, 236], rotation: 0.65 },
      { role: 'frontLeg', part: 6, parent: 'torso', pivot: [45, 32], at: [104, 236], rotation: 0.15 },
      { role: 'torso', part: 5, pivot: [92, 230], at: [0, 0] },
      { role: 'head', part: 3, parent: 'torso', pivot: [58, 138], at: [104, 22], scale: 0.78 },
      // Right arm (sword) from the right shoulder, on the far side of the chest.
      { role: 'frontArm', part: 1, parent: 'torso', pivot: [62, 34], at: [44, 66], rotation: -0.3 },
      { role: 'weapon', part: 13, parent: 'frontForearm', pivot: [52, 45], at: [140, 30], rotation: -1.1, scale: 1.25 },
      { role: 'frontForearm', part: 4, parent: 'frontArm', pivot: [16, 30], at: [26, 132], rotation: 0.5, scale: 0.8 },
      // Left arm in front of the body, holding the shield.
      { role: 'shield', part: 12, parent: 'backArm', pivot: [80, 90], at: [170, 92], scale: 0.75 },
      { role: 'backArm', part: 10, parent: 'torso', pivot: [40, 22], at: [150, 62], rotation: -0.3 },
      { role: 'backShoulder', part: 9, parent: 'backArm', pivot: [46, 28], at: [42, 22], scale: 0.8 }
    ]
  }
}
