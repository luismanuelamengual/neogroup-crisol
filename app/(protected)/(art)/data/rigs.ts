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
  | 'backForearm'
  | 'shield'
  | 'frontLeg'
  | 'backLeg'

export interface RigBone {
  role: BoneRole
  part: number
  /** Another sheet of the same figure (fixes, extra pieces); the rig's sheet when left out. */
  sheet?: string
  /** The root (torso) has none: its pivot is the hip. */
  parent?: BoneRole
  pivot: [number, number]
  at: [number, number]
  /** Rest angle in radians (positive turns clockwise). */
  rotation?: number
  /** The generator draws some parts out of scale (a big head): this evens them out. Not passed on to children. */
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
      // Left arm in front of the body, gripping the handle inside the shield.
      {
        role: 'shield',
        sheet: 'heroes/kael-hands',
        part: 2,
        parent: 'backForearm',
        pivot: [236, 250],
        at: [88, 470],
        scale: 0.32
      },
      { role: 'backArm', part: 9, parent: 'torso', pivot: [46, 28], at: [146, 62], rotation: -0.45, scale: 0.85 },
      {
        role: 'backForearm',
        sheet: 'heroes/kael-hands',
        part: 3,
        parent: 'backArm',
        pivot: [78, 24],
        at: [50, 136],
        rotation: -0.55,
        scale: 0.32
      },
      // The sword and its fist in front of everything.
      { role: 'weapon', part: 13, parent: 'frontForearm', pivot: [52, 45], at: [104, 476], rotation: 0.47 },
      {
        role: 'frontForearm',
        sheet: 'heroes/kael-hands',
        part: 1,
        parent: 'frontArm',
        pivot: [76, 24],
        at: [26, 132],
        rotation: -1.07,
        scale: 0.3
      }
    ]
  }
}
