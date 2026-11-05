import { Container, Rectangle, Sprite, Texture } from 'pixi.js'
import { SceneryItem } from '@/app/(protected)/(engine)/models/SceneryItem'
import { SceneryTextures } from '@/app/(protected)/(world)/utils/sceneryTextures'
import { ZoneTextures } from '@/app/(protected)/(world)/utils/zoneTextures'

/**
 * The scenery of the world map, drawn so that it looks solid: the small things
 * lie flat on the ground; trees, bushes, rocks, landmarks and the hero stand
 * on their base, each one with a soft shadow, and are drawn from the farthest
 * (highest on screen) to the closest, so whatever is lower hides what is
 * behind it. A tree that hides the hero turns see-through, and the trees sway
 * a little in the wind. Only the pieces around the camera are on the stage:
 * the world is cut in chunks and they come and go with it.
 */

/** Side of a chunk (world pixels); chunks this far around the screen are kept too (tall pieces reach up from below it). */
const CHUNK = 1024
const MARGIN = 256
/** Wider than this on screen, the scenery is hidden (too small to see, too many to draw). */
const FAR_WIDTH = 7000
/** Shadows: width against the drawing, and how far right of the base (the light comes from the top left). */
const SHADOW_WIDTH = { tall: 0.7, low: 0.85 }
const SHADOW_OFFSET = 8
/** How much a tree sways, how fast, and how see-through it gets when it hides the hero. */
const SWAY = 0.035
const SWAY_SPEED = 1.4
const SEE_THROUGH = 0.45
/** Room kept around a landmark: the trees, bushes and rocks that would overlap it are left out. */
const LANDMARK_ROOM = 70

interface Standing {
  sprite: Sprite
  shadow: Sprite
  sways: boolean
  /** Added apart (see add), kept when the pieces are placed again. */
  landmark: boolean
}

interface Chunk {
  ground: Container
  standing: Standing[]
}

export class WorldScenery {
  /** The flat layer (under the trails and the points) and the standing one (over them). */
  readonly ground = new Container()
  readonly standing = new Container()
  readonly shadows = new Container()
  private readonly chunks = new Map<number, Chunk>()
  private readonly columns: number
  private shown = new Set<number>()
  private visible: Standing[] = []

  constructor(
    worldWidth: number,
    private readonly hero: Container,
    private readonly shadow: Texture
  ) {
    this.columns = Math.ceil(worldWidth / CHUNK)
    this.standing.sortableChildren = true
    this.standing.addChild(hero)
  }

  /** Places the pieces with their drawings (again, if the drawings change): those of their zone, or else of their biome. */
  setItems(items: SceneryItem[], textures: SceneryTextures, zones: ZoneTextures = {}): void {
    const landmarks: Standing[] = []

    for (const chunk of this.chunks.values()) {
      this.hide(chunk)
      chunk.ground.destroy({ children: true })
      chunk.standing.forEach((standing) => {
        if (standing.landmark) {
          landmarks.push(standing)
        } else {
          standing.sprite.destroy()
          standing.shadow.destroy()
        }
      })
    }

    this.chunks.clear()
    this.shown = new Set()
    this.visible = []
    landmarks.forEach((standing) => this.chunkAt(standing.sprite.x, standing.sprite.y).standing.push(standing))

    for (const item of items) {
      if (item.layer !== 'ground' && this.nearLandmark(item.x, item.y)) {
        continue
      }

      const choices = (item.zone && zones[item.zone]?.[item.layer]) || textures[item.biome][item.layer]
      const sprite = new Sprite(choices[Math.floor(item.pick * choices.length)])

      sprite.anchor.set(0.5, 0.96)
      sprite.position.set(item.x, item.y)
      sprite.scale.set(item.flip ? -item.scale : item.scale, item.scale)

      if (item.layer === 'ground') {
        this.chunkAt(item.x, item.y).ground.addChild(sprite)
      } else {
        this.stand(sprite, item.layer, item.layer === 'tall', false)
      }
    }
  }

  /** A landmark (a windmill, a well...): it stands like the trees, but does not sway. */
  add(sprite: Sprite): void {
    const room = Math.max(LANDMARK_ROOM, Math.abs(sprite.width) * 0.5)

    for (const key of this.keysAround(sprite.x, sprite.y)) {
      const chunk = this.chunks.get(key)

      if (!chunk) {
        continue
      }

      chunk.standing = chunk.standing.filter((standing) => {
        const overlaps =
          !standing.landmark && Math.hypot(standing.sprite.x - sprite.x, standing.sprite.y - sprite.y) < room

        if (overlaps) {
          this.standing.removeChild(standing.sprite)
          this.shadows.removeChild(standing.shadow)
          standing.sprite.destroy()
          standing.shadow.destroy()
        }

        return !overlaps
      })
      this.shown.delete(key)
    }

    this.stand(sprite, 'low', false, true)
  }

  private nearLandmark(x: number, y: number): boolean {
    return this.keysAround(x, y).some((key) =>
      (this.chunks.get(key)?.standing ?? []).some(
        ({ sprite, landmark }) =>
          landmark && Math.hypot(sprite.x - x, sprite.y - y) < Math.max(LANDMARK_ROOM, Math.abs(sprite.width) * 0.5)
      )
    )
  }

  /** The chunk of a point and the ones around it. */
  private keysAround(x: number, y: number): number[] {
    const keys = [-1, 0, 1].flatMap((dy) => [-1, 0, 1].map((dx) => this.keyAt(x + dx * CHUNK, y + dy * CHUNK)))

    return [...new Set(keys)]
  }

  private stand(sprite: Sprite, layer: 'tall' | 'low', sways: boolean, landmark: boolean): void {
    const shadow = new Sprite(this.shadow)
    const width = Math.abs(sprite.width) * SHADOW_WIDTH[layer]

    shadow.anchor.set(0.5)
    shadow.position.set(sprite.x + SHADOW_OFFSET, sprite.y)
    shadow.width = width
    shadow.height = width * 0.4
    sprite.zIndex = sprite.y
    this.chunkAt(sprite.x, sprite.y).standing.push({ sprite, shadow, sways, landmark })
    this.shown.delete(this.keyAt(sprite.x, sprite.y))
  }

  /** Shows the chunks around the camera and animates what is on screen. */
  update(visible: Rectangle, elapsed: number): void {
    const far = visible.width > FAR_WIDTH

    this.ground.visible = !far
    this.standing.visible = true
    this.shadows.visible = !far

    const wanted = new Set<number>()

    if (!far) {
      const left = Math.floor((visible.x - MARGIN) / CHUNK)
      const right = Math.floor((visible.x + visible.width + MARGIN) / CHUNK)
      const top = Math.floor((visible.y - MARGIN) / CHUNK)
      const bottom = Math.floor((visible.y + visible.height + MARGIN) / CHUNK)

      for (let row = Math.max(0, top); row <= bottom; row++) {
        for (let column = Math.max(0, left); column <= Math.min(this.columns - 1, right); column++) {
          wanted.add(row * this.columns + column)
        }
      }
    }

    if (!sameKeys(wanted, this.shown)) {
      for (const key of this.shown) {
        if (!wanted.has(key) && this.chunks.has(key)) {
          this.hide(this.chunks.get(key)!)
        }
      }

      for (const key of wanted) {
        if (!this.shown.has(key) && this.chunks.has(key)) {
          this.show(this.chunks.get(key)!)
        }
      }

      this.shown = wanted
      this.visible = [...wanted].flatMap((key) => this.chunks.get(key)?.standing ?? [])
    }

    const { x, y } = this.hero.position

    this.hero.zIndex = y

    for (const { sprite, sways } of this.visible) {
      if (sways) {
        sprite.skew.x = Math.sin(elapsed * SWAY_SPEED + sprite.x * 0.013 + sprite.y * 0.007) * SWAY
      }

      // In front of the hero and over it: see-through.
      const hides =
        sprite.y > y && Math.abs(sprite.x - x) < Math.abs(sprite.width) * 0.4 && sprite.y - sprite.height * 0.9 < y

      sprite.alpha = hides ? SEE_THROUGH : 1
    }
  }

  /** Frees the pieces, but not their drawings (the final art is shared through the asset cache). */
  destroy(): void {
    for (const chunk of this.chunks.values()) {
      this.hide(chunk)
      chunk.ground.destroy({ children: true })
      chunk.standing.forEach(({ sprite, shadow }) => {
        sprite.destroy()
        shadow.destroy()
      })
    }

    this.standing.removeChild(this.hero)
    this.ground.destroy()
    this.shadows.destroy()
    this.standing.destroy()
  }

  private keyAt(x: number, y: number): number {
    return (
      Math.max(0, Math.floor(y / CHUNK)) * this.columns + Math.min(this.columns - 1, Math.max(0, Math.floor(x / CHUNK)))
    )
  }

  private chunkAt(x: number, y: number): Chunk {
    const key = this.keyAt(x, y)
    let chunk = this.chunks.get(key)

    if (!chunk) {
      chunk = { ground: new Container(), standing: [] }
      this.chunks.set(key, chunk)
    }

    return chunk
  }

  private show(chunk: Chunk): void {
    this.ground.addChild(chunk.ground)

    for (const { sprite, shadow } of chunk.standing) {
      this.standing.addChild(sprite)
      this.shadows.addChild(shadow)
    }
  }

  private hide(chunk: Chunk): void {
    this.ground.removeChild(chunk.ground)

    for (const { sprite, shadow } of chunk.standing) {
      this.standing.removeChild(sprite)
      this.shadows.removeChild(shadow)
    }
  }
}

function sameKeys(a: Set<number>, b: Set<number>): boolean {
  return a.size === b.size && [...a].every((key) => b.has(key))
}
