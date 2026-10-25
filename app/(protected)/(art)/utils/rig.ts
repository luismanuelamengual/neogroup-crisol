import { Container, Matrix, Sprite, Texture } from 'pixi.js'
import { BoneRole, Rig, RigBone } from '@/app/(protected)/(art)/data/rigs'
import { ArtManifest } from '@/app/(protected)/(art)/models/ArtManifest'

/** A move the puppet plays over its idle breathing. */
export type RigMove = 'attack' | 'cast' | 'hit'

/** Angle offsets (radians) of a bone along a move: [progress, angle] keys. */
type Keys = [number, number][]

const MOVES: Record<RigMove, Partial<Record<BoneRole, Keys>>> = {
  attack: {
    torso: [
      [0, 0],
      [0.45, -0.08],
      [0.65, 0.14],
      [1, 0]
    ],
    head: [
      [0, 0],
      [0.45, -0.05],
      [0.65, 0.08],
      [1, 0]
    ],
    // Up over the head, then down onto the target.
    frontArm: [
      [0, 0],
      [0.45, -3.0],
      [0.65, -0.7],
      [1, 0]
    ],
    frontForearm: [
      [0, 0],
      [0.45, 0.8],
      [0.65, 0.9],
      [1, 0]
    ],
    weapon: [
      [0, 0],
      [0.45, 0.4],
      [0.65, 1.2],
      [1, 0]
    ],
    backArm: [
      [0, 0],
      [0.45, -0.25],
      [0.65, 0.2],
      [1, 0]
    ],
    scarf: [
      [0, 0],
      [0.65, -0.25],
      [1, 0]
    ]
  },
  cast: {
    torso: [
      [0, 0],
      [0.4, -0.06],
      [0.75, -0.06],
      [1, 0]
    ],
    frontArm: [
      [0, 0],
      [0.4, -1.1],
      [0.75, -1.1],
      [1, 0]
    ],
    frontForearm: [
      [0, 0],
      [0.4, 0.3],
      [0.75, 0.3],
      [1, 0]
    ],
    head: [
      [0, 0],
      [0.4, -0.1],
      [1, 0]
    ]
  },
  hit: {
    torso: [
      [0, 0],
      [0.25, -0.18],
      [1, 0]
    ],
    head: [
      [0, 0],
      [0.25, -0.28],
      [1, 0]
    ],
    frontArm: [
      [0, 0],
      [0.25, 0.35],
      [1, 0]
    ],
    backArm: [
      [0, 0],
      [0.25, 0.3],
      [1, 0]
    ],
    scarf: [
      [0, 0],
      [0.25, 0.3],
      [1, 0]
    ]
  }
}

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

/** The parts the puppet needs (ids of images), so they can be loaded first. */
export function rigPartIds(rig: Rig, parts: ArtManifest['parts']): string[] {
  const sheet = parts[rig.sheet] ?? []

  return rig.bones.map((bone) => sheet[bone.part - 1]?.id).filter((id): id is string => Boolean(id))
}

/**
 * A figure put together from the parts of its sheet, with its joints moving:
 * it breathes, its scarf sways, and it swings, casts or flinches on demand.
 * `view` stands on its feet at (0, 0) and is `height` pixels tall.
 */
export class RigFigure {
  readonly view = new Container()
  private readonly inner = new Container()
  private readonly sprites = new Map<BoneRole, Sprite>()
  /** Images are smaller than the sheet: each is drawn back at the sheet's size. */
  private readonly partScale = new Map<BoneRole, number>()
  private readonly order: RigBone[]
  private readonly bones = new Map<BoneRole, RigBone>()
  private time = Math.random() * 10
  private move: { kind: RigMove; elapsed: number; duration: number } | null = null

  private constructor(rig: Rig) {
    this.order = []

    for (const bone of rig.bones) {
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

    rig.bones.forEach(place)
    this.view.addChild(this.inner)
  }

  /** The puppet, or null when its sheet or any of its parts is missing. */
  static create(
    rig: Rig,
    parts: ArtManifest['parts'],
    textures: Map<string, Texture>,
    height: number
  ): RigFigure | null {
    const sheet = parts[rig.sheet]

    if (!sheet || rig.bones.some((bone) => !sheet[bone.part - 1] || !textures.get(sheet[bone.part - 1].id))) {
      return null
    }

    const figure = new RigFigure(rig)

    for (const bone of rig.bones) {
      const part = sheet[bone.part - 1]
      const texture = textures.get(part.id)!
      const sprite = new Sprite(texture)

      figure.partScale.set(bone.role, part.width / texture.width)
      figure.sprites.set(bone.role, sprite)
      figure.inner.addChild(sprite)
    }

    figure.layout()

    // Feet on the ground at (0, 0), hips centered, `height` tall (the body: what it holds can reach higher).
    const held = (['weapon', 'shield'] as BoneRole[]).map((role) => figure.sprites.get(role)).filter(Boolean)

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
      torso: breath * 0.015,
      head: Math.sin(this.time * 2.4 + 0.6) * 0.03,
      scarf: Math.sin(this.time * 3.1) * 0.06,
      frontArm: breath * 0.04,
      backArm: -breath * 0.03
    }
    const keys = this.move ? MOVES[this.move.kind][role] : undefined
    const move = keys && this.move ? sample(keys, this.move.elapsed / this.move.duration) : 0

    return (idle[role] ?? 0) + move
  }

  private layout(): void {
    const worlds = new Map<BoneRole, Matrix>()

    for (const bone of this.order) {
      const parent = bone.parent ? worlds.get(bone.parent)! : new Matrix()
      const world = new Matrix()
        .translate(-bone.pivot[0], -bone.pivot[1])
        .scale(bone.scale ?? 1, bone.scale ?? 1)
        .rotate((bone.rotation ?? 0) + this.angle(bone.role))
        .translate(bone.at[0], bone.at[1])
        .prepend(parent)

      worlds.set(bone.role, world)

      const sprite = this.sprites.get(bone.role)!

      sprite.setFromMatrix(
        new Matrix().scale(this.partScale.get(bone.role)!, this.partScale.get(bone.role)!).prepend(world)
      )
    }
  }
}
