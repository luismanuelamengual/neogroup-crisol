import { Container, Matrix, Sprite, Texture } from 'pixi.js'
import { BoneRole, Rig, RigBone } from '@/app/(protected)/(art)/data/rigs'
import { ArtManifest } from '@/app/(protected)/(art)/models/ArtManifest'

/** A move the puppet plays over its idle breathing. */
export type RigMove = 'attack' | 'cast' | 'hit'

/** Angle offsets (radians) of a bone along a move: [progress, angle] keys. */
type Keys = [number, number][]

type Part = ArtManifest['parts'][string][number]

const MOVES: Record<RigMove, Partial<Record<BoneRole, Keys>>> = {
  // The blade up in front of the face, then a slash forward and down.
  attack: {
    body: [
      [0, 0],
      [0.45, -0.04],
      [0.65, 0.07],
      [1, 0]
    ],
    arm: [
      [0, 0],
      [0.45, -0.9],
      [0.65, 0.5],
      [1, 0]
    ],
    weapon: [
      [0, 0],
      [0.45, -0.1],
      [0.65, 0.7],
      [1, 0]
    ]
  },
  cast: {
    body: [
      [0, 0],
      [0.4, -0.03],
      [0.75, -0.03],
      [1, 0]
    ],
    arm: [
      [0, 0],
      [0.4, -0.6],
      [0.75, -0.6],
      [1, 0]
    ]
  },
  hit: {
    body: [
      [0, 0],
      [0.25, -0.09],
      [1, 0]
    ],
    arm: [
      [0, 0],
      [0.25, 0.35],
      [1, 0]
    ]
  }
}
/** The far side of the body is drawn a little darker. */
const FAR_TINT = 0xb4b0c4

function ease(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
}

function sample(keys: Keys, progress: number): number {
  for (let index = 1; index < keys.length; index++) {
    const [end, to] = keys[index]
    const [start, from] = keys[index - 1]

    if (progress <= end) {
      return from + (to - from) * ease((progress - start) / (end - start))
    }
  }

  return keys[keys.length - 1][1]
}

function partOf(rig: Rig, bone: RigBone, parts: ArtManifest['parts']): Part | undefined {
  return parts[rig.images[bone.slot]]?.[bone.segment - 1]
}

/** The images the puppet needs, so they can be loaded first. */
export function rigPartIds(rig: Rig, parts: ArtManifest['parts']): string[] {
  return rig.bones.map((bone) => partOf(rig, bone, parts)?.id).filter((id): id is string => Boolean(id))
}

/** Stage pixels per body height before the figure is sized to its height. */
const UNIT = 300

/**
 * A figure put together from its images, with its joints moving: it breathes,
 * and it swings, casts or flinches on demand. `view` stands on its feet at
 * (0, 0) and its body is `height` pixels tall.
 */
export class RigFigure {
  readonly view = new Container()
  private readonly inner = new Container()
  private readonly sprites = new Map<BoneRole, Sprite>()
  private readonly sizes = new Map<BoneRole, Part>()
  /** The images are smaller than the sheet: each is drawn back at the sheet's size. */
  private readonly partScale = new Map<BoneRole, number>()
  private readonly order: RigBone[] = []
  private readonly bones = new Map<BoneRole, RigBone>()
  /** How much each bone's segment is scaled so every image matches the others (they come at their own scale). */
  private readonly boneScale = new Map<BoneRole, number>()
  private time = Math.random() * 10
  private move: { kind: RigMove; elapsed: number; duration: number } | null = null

  private constructor(bones: RigBone[]) {
    for (const bone of bones) {
      this.bones.set(bone.role, bone)
    }

    // Parents are placed before their children.
    const place = (bone: RigBone) => {
      if (!this.order.includes(bone)) {
        if (bone.parent) {
          place(this.bones.get(bone.parent)!)
        }

        this.order.push(bone)
      }
    }

    bones.forEach(place)
    this.view.addChild(this.inner)
  }

  /** The puppet, or null when any image it needs is missing. */
  static create(
    rig: Rig,
    parts: ArtManifest['parts'],
    textures: Map<string, Texture>,
    height: number
  ): RigFigure | null {
    if (rig.bones.some((bone) => !textures.get(partOf(rig, bone, parts)?.id ?? ''))) {
      return null
    }

    const figure = new RigFigure(rig.bones)

    for (const bone of rig.bones) {
      const part = partOf(rig, bone, parts)!
      const texture = textures.get(part.id)!
      const sprite = new Sprite(texture)
      const size = rig.sizes[bone.slot]
      const reference = parts[rig.images[bone.slot]][size.segment - 1]

      if (bone.far) {
        sprite.tint = FAR_TINT
      }

      figure.sizes.set(bone.role, part)
      figure.partScale.set(bone.role, part.width / texture.width)
      figure.boneScale.set(bone.role, (size.length * UNIT) / reference[size.side])
      figure.sprites.set(bone.role, sprite)
      figure.inner.addChild(sprite)
    }

    figure.layout()

    // Feet on the ground at (0, 0), hips centered, `height` tall (the body: what it holds can reach higher).
    const held = (['weapon'] as BoneRole[]).map((role) => figure.sprites.get(role)).filter(Boolean)

    held.forEach((sprite) => (sprite!.visible = false))

    const bounds = figure.inner.getLocalBounds()

    held.forEach((sprite) => (sprite!.visible = true))

    figure.inner.position.set(0, -bounds.maxY)
    figure.view.scale.set(height / (bounds.maxY - bounds.minY))

    return figure
  }

  play(kind: RigMove, duration: number): void {
    this.move = { kind, elapsed: 0, duration }
  }

  update(deltaMS: number): void {
    this.time += deltaMS / 1000

    if (this.move) {
      this.move.elapsed += deltaMS

      if (this.move.elapsed >= this.move.duration) {
        this.move = null
      }
    }

    this.layout()
  }

  private angle(role: BoneRole): number {
    const breath = Math.sin(this.time * 2.4)
    const idle: Partial<Record<BoneRole, number>> = {
      body: breath * 0.01,
      arm: breath * 0.04
    }
    const keys = this.move ? MOVES[this.move.kind][role] : undefined
    const move = keys && this.move ? sample(keys, this.move.elapsed / this.move.duration) : 0

    return (idle[role] ?? 0) + move
  }

  private layout(): void {
    const worlds = new Map<BoneRole, Matrix>()

    for (const bone of this.order) {
      const parent = bone.parent ? worlds.get(bone.parent)! : new Matrix()
      const size = this.sizes.get(bone.role)!
      const parentSize = bone.parent ? this.sizes.get(bone.parent)! : null
      // A bone's scale sizes its own segment only: the parent's is taken back out.
      const scale = this.boneScale.get(bone.role)! / (bone.parent ? this.boneScale.get(bone.parent)! : 1)
      const world = new Matrix()
        .translate(-bone.pivot[0] * size.width, -bone.pivot[1] * size.height)
        .scale(scale, scale)
        .rotate((bone.rotation ?? 0) + this.angle(bone.role))
        .translate(bone.at[0] * (parentSize?.width ?? 0), bone.at[1] * (parentSize?.height ?? 0))
        .prepend(parent)

      worlds.set(bone.role, world)

      const sprite = this.sprites.get(bone.role)!
      const partScale = this.partScale.get(bone.role)!

      sprite.setFromMatrix(new Matrix().scale(partScale, partScale).prepend(world))
    }
  }
}
