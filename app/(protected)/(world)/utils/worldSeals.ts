import { Graphics, Rectangle, Sprite, Texture } from 'pixi.js'
import { BIOMES_ORDER, LAKES } from '@/app/(protected)/(engine)/data/terrains'
import { BossKind } from '@/app/(protected)/(engine)/models/BossKind'
import { TileMap } from '@/app/(protected)/(engine)/models/TileMap'
import { World } from '@/app/(protected)/(engine)/models/World'
import { WorldNode } from '@/app/(protected)/(engine)/models/WorldNode'
import { getAllTrails } from '@/app/(protected)/(engine)/utils/shortcuts'
import { heightAt, isPaved, terrainAt } from '@/app/(protected)/(engine)/utils/tileMap'
import { WorldScenery } from '@/app/(protected)/(world)/utils/worldScenery'
import { SealBiome, SealTextures } from '@/app/(protected)/(world)/utils/zoneTextures'

/**
 * The Seals on the world map, so that the places that hold the Abyss closed
 * read from far as something great: great spires of their biome stand guard
 * around the point, with a ring of shards closer to it, all lit by the violet
 * of the Seals. While the Seal holds, a great sigil turns on the ground under
 * it, threads of light bind it to the spires, waves of power leave it, frost
 * or embers rise around it, and a halo with a beam marks it over the fog.
 * Once beaten, the stones go grey and the magic is gone.
 */

/** Flattening of what lies on the ground, seen from above and to the front. */
const SQUASH = 0.62
/** The sigil under the point, the soft glow around it and how far its waves go. */
const SIGIL_RADIUS = 330
const AURA_RADIUS = 950
const WAVE_REACH = 900
/** Seconds between two waves leaving the sigil. */
const WAVE_EVERY = 2.6
/** The ring of shards: radii tried, and how many at most. */
const RING_RADII = [440, 400, 490, 550, 610]
const SHARDS = 12
/** Around the point the trees and rocks are taken away, so that the sigil reads clear. */
const CLEARING = 470
/** The spires: how many, and where they may stand from the point. */
const SPIRES = 3
const SPIRE_NEAREST = 560
const SPIRE_FARTHEST = 950
const SPIRE_STEP = 40
const SPIRE_ROOM = 60
/** Least angle between a piece and a trail leaving the point (radians), and room kept from the trails. */
const TRAIL_ANGLE = 0.32
const TRAIL_ROOM = 70
const MOTES = 40
/** The beam over the fog. */
const BEAM_HEIGHT = 1400
const BEAM_WIDTH = 160
/** The color of the stones once the Seal is beaten. */
const SPENT_TINT = 0x8d8a99

/** The magic of a Seal: the violet of the Seals with the colors of its biome. */
interface SealMagic {
  color: number
  light: number
  /** The color of its biome: half of the motes and the inner lines of the sigil. */
  accent: number
  accentLight: number
  /** What crosses the inner ring of the sigil: a flake of frost or a star of fire. */
  sigil: 'flake' | 'star'
  /** Frost glitters drifting and turning as they rise, or embers rising fast and flickering. */
  motes: 'frost' | 'embers'
}

const SEAL_MAGIC: Record<SealBiome, SealMagic> = {
  snow: {
    color: 0xa855f7,
    light: 0xe9d5ff,
    accent: 0x5fd8ff,
    accentLight: 0xe6fbff,
    sigil: 'flake',
    motes: 'frost'
  },
  volcanic: {
    color: 0xb04dff,
    light: 0xf0d4ff,
    accent: 0xff7a1a,
    accentLight: 0xffe08a,
    sigil: 'star',
    motes: 'embers'
  }
}

interface Seal {
  node: WorldNode
  biome: SealBiome
  magic: SealMagic
  /** Directions of the trails leaving the point (radians). */
  trails: number[]
  /** Where the spires stand: the threads of light reach their feet. */
  spires: [number, number][]
  stones: Sprite[]
}

function isSealBiome(biome: string): biome is SealBiome {
  return biome in SEAL_MAGIC
}

export class WorldSeals {
  /** The sigils and the threads (on the ground, under the points), the motes (over the scenery) and the halos (over the fog). */
  readonly ground = new Graphics()
  readonly motes = new Graphics()
  readonly sky = new Graphics()
  private readonly seals: Seal[]
  private beaten = new Set<string>()
  private placed = false

  constructor(
    private readonly world: World,
    private readonly tiles: TileMap
  ) {
    const nodes = new Map(world.nodes.map((node) => [node.id, node]))

    this.seals = world.nodes.flatMap((node) =>
      node.bossKind === BossKind.SEAL && isSealBiome(node.biome)
        ? [
            {
              node,
              biome: node.biome,
              magic: SEAL_MAGIC[node.biome],
              trails: getAllTrails(world).flatMap(([a, b]) => {
                const other = a === node.id ? nodes.get(b) : b === node.id ? nodes.get(a) : null

                return other ? [Math.atan2(other.y - node.y, other.x - node.x)] : []
              }),
              spires: [],
              stones: []
            }
          ]
        : []
    )
  }

  /** Raises the spires and the shards around each Seal with the drawings of its biome (once). */
  setTextures(texturesOf: (biome: SealBiome) => SealTextures | null, scenery: WorldScenery): void {
    if (this.placed) {
      return
    }

    this.placed = true

    for (const seal of this.seals) {
      const textures = texturesOf(seal.biome)

      if (!textures) {
        continue
      }

      scenery.clearAround(seal.node.x, seal.node.y, CLEARING)

      const spires = this.spireSpots(seal, textures.spire)

      seal.spires = spires

      for (const [x, y] of this.shardSpots(seal, spires, textures.shard)) {
        this.stand(seal, textures.shard, x, y, x < seal.node.x, scenery)
      }

      for (const [x, y] of spires) {
        this.stand(seal, textures.spire, x, y, x > seal.node.x, scenery)
      }
    }

    this.tintStones()
  }

  /** Which Seals are beaten: their stones go grey and their magic is gone. */
  setBeaten(cleared: Set<string>): void {
    this.beaten = new Set(this.seals.filter(({ node }) => cleared.has(node.id)).map(({ node }) => node.id))
    this.tintStones()
  }

  /** The magic of the Seals that hold, moving. */
  update(elapsed: number, visible: Rectangle): void {
    this.ground.clear()
    this.motes.clear()
    this.sky.clear()

    for (const seal of this.seals) {
      // Redrawn every frame: only the Seals whose magic can be on screen.
      if (!this.beaten.has(seal.node.id) && onScreen(seal.node, visible)) {
        this.drawAura(seal, elapsed)
        this.drawThreads(seal, elapsed)
        this.drawSigil(seal, elapsed)
        this.drawWaves(seal, elapsed)
        this.drawMotes(seal, elapsed)
        this.drawHalo(seal, elapsed)
      }
    }
  }

  destroy(): void {
    this.ground.destroy()
    this.motes.destroy()
    this.sky.destroy()
  }

  private stand(seal: Seal, texture: Texture, x: number, y: number, mirror: boolean, scenery: WorldScenery): void {
    const sprite = new Sprite(texture)

    sprite.anchor.set(0.5, 0.96)
    sprite.position.set(x, y)
    sprite.scale.set(mirror ? -1 : 1, 1)
    scenery.add(sprite)
    seal.stones.push(sprite)
  }

  private tintStones(): void {
    for (const { node, stones } of this.seals) {
      for (const stone of stones) {
        stone.tint = this.beaten.has(node.id) ? SPENT_TINT : 0xffffff
      }
    }
  }

  /** The spires: spread around the point, each at the closest place where it stands clear. */
  private spireSpots(seal: Seal, texture: Texture): [number, number][] {
    const spots: [number, number][] = []

    // Behind the point first (north), then to its sides.
    for (const start of [-Math.PI / 2, -Math.PI / 2 + (Math.PI * 2) / 3, -Math.PI / 2 - (Math.PI * 2) / 3]) {
      const spot = this.spireSpot(seal, texture, start, spots)

      if (spot) {
        spots.push(spot)
      }

      if (spots.length === SPIRES) {
        break
      }
    }

    return spots
  }

  private spireSpot(
    { node, trails }: Seal,
    texture: Texture,
    start: number,
    placed: [number, number][]
  ): [number, number] | null {
    for (let distance = SPIRE_NEAREST; distance <= SPIRE_FARTHEST; distance += SPIRE_STEP) {
      // Around the wanted direction, at most a third of a turn away from it.
      for (let turn = 0; turn <= 12; turn++) {
        const angle = start + (turn % 2 ? 1 : -1) * Math.ceil(turn / 2) * 0.17
        const x = node.x + Math.cos(angle) * distance
        const y = node.y + Math.sin(angle) * distance * 0.78
        const apart = placed.every(
          ([px, py]) => Math.abs(px - x) > texture.width + SPIRE_ROOM || Math.abs(py - y) > 160
        )

        if (apart && this.awayFromTrails(trails, angle, 1.2) && this.standsClear(node, x, y, texture)) {
          return [x, y]
        }
      }
    }

    return null
  }

  /** Evenly around the point, a little flattened, but not over its trails, the spires, lakes or cliffs. */
  private shardSpots({ node, trails }: Seal, spires: [number, number][], texture: Texture): [number, number][] {
    const spots: [number, number][] = []

    for (let index = 0; index < SHARDS; index++) {
      const angle = (index / SHARDS) * Math.PI * 2 + 0.31

      if (!this.awayFromTrails(trails, angle, 1)) {
        continue
      }

      const spot = RING_RADII.map((radius): [number, number] => [
        node.x + Math.cos(angle) * radius,
        node.y + Math.sin(angle) * radius * 0.78
      ]).find(
        ([x, y]) =>
          spires.every(([sx, sy]) => Math.hypot(x - sx, y - sy) > 170) && this.standsClear(node, x, y, texture)
      )

      if (spot) {
        spots.push(spot)
      }
    }

    return spots
  }

  private awayFromTrails(trails: number[], angle: number, share: number): boolean {
    return trails.every((trail) => {
      const difference = Math.abs(Math.atan2(Math.sin(angle - trail), Math.cos(angle - trail)))

      return difference > TRAIL_ANGLE * share + 0.12
    })
  }

  /** Whether a piece this big rests there: its foot on one level of its biome, off lakes, hiding no trail or point. */
  private standsClear(node: WorldNode, x: number, y: number, { width, height }: Texture): boolean {
    const half = width / 2
    const { biomes, columns, tileSize } = this.tiles
    const biome = BIOMES_ORDER.indexOf(node.biome)

    if (x - half <= 0 || x + half >= this.world.width || y - height <= 0 || y >= this.world.height) {
      return false
    }

    const hidesPoint = this.world.nodes.some(
      (other) => Math.abs(other.x - x) < half + 40 && other.y > y - height - 40 && other.y < y + 40
    )

    if (hidesPoint) {
      return false
    }

    const level = heightAt(this.tiles, x, y)

    // Its foot (the middle of its width) on one level and in its biome; nothing it covers may be a trail.
    for (let dx = -half; dx <= half; dx += 30) {
      const px = x + dx
      const foot = Math.abs(dx) <= half * 0.5

      if (
        foot &&
        (heightAt(this.tiles, px, y) !== level ||
          LAKES.has(terrainAt(this.tiles, px, y)) ||
          biomes[Math.floor(y / tileSize) * columns + Math.floor(px / tileSize)] !== biome)
      ) {
        return false
      }

      for (let dy = -height; dy <= TRAIL_ROOM / 2; dy += 30) {
        if (isPaved(this.tiles, px, y + dy)) {
          return false
        }
      }
    }

    return true
  }

  /** A soft glow on the ground around the point, breathing. */
  private drawAura({ node: { x, y }, magic: { color, accent } }: Seal, elapsed: number): void {
    const breath = (Math.sin(elapsed * 1.4) + 1) / 2
    const g = this.ground

    for (const [share, alpha] of [
      [1, 0.05],
      [0.75, 0.06],
      [0.5, 0.08]
    ]) {
      g.ellipse(x, y, AURA_RADIUS * share, AURA_RADIUS * share * SQUASH).fill({
        color: share === 1 ? accent : color,
        alpha: alpha + breath * 0.04
      })
    }
  }

  /** Threads of light from the sigil to the foot of each spire, with sparks running along them. */
  private drawThreads({ node: { x, y }, spires, magic: { color, light } }: Seal, elapsed: number): void {
    const breath = (Math.sin(elapsed * 2.2) + 1) / 2

    spires.forEach(([sx, sy], index) => {
      const angle = Math.atan2(sy - y, sx - x)
      const fromX = x + Math.cos(angle) * SIGIL_RADIUS
      const fromY = y + Math.sin(angle) * SIGIL_RADIUS * SQUASH

      this.ground
        .moveTo(fromX, fromY)
        .lineTo(sx, sy)
        .stroke({ width: 24, color, alpha: 0.14 + breath * 0.08 })
      this.ground
        .moveTo(fromX, fromY)
        .lineTo(sx, sy)
        .stroke({ width: 7, color: light, alpha: 0.45 + breath * 0.3 })

      const run = (elapsed * 0.6 + index * 0.37) % 1

      this.ground.circle(fromX + (sx - fromX) * run, fromY + (sy - fromY) * run, 14).fill({ color: light, alpha: 0.9 })
      this.ground.circle(sx, sy, 40 + breath * 8).fill({ color, alpha: 0.22 + breath * 0.12 })
    })
  }

  /** The great sigil: two rings turning opposite ways with runes between them, and the flake or the star of its biome. */
  private drawSigil({ node: { x, y }, magic }: Seal, elapsed: number): void {
    const { color, light, accent, accentLight, sigil } = magic
    const breath = (Math.sin(elapsed * 2) + 1) / 2
    const g = this.ground
    const r = SIGIL_RADIUS

    g.ellipse(x, y, r * 1.12, r * 1.12 * SQUASH).stroke({ width: 8, color, alpha: 0.4 + breath * 0.25 })
    g.ellipse(x, y, r, r * SQUASH).stroke({ width: 15, color, alpha: 0.6 + breath * 0.3 })
    g.ellipse(x, y, r * 0.7, r * 0.7 * SQUASH).stroke({ width: 9, color: light, alpha: 0.5 + breath * 0.3 })

    // Runes between the rings, turning: diamonds and bars by turns.
    for (let index = 0; index < 16; index++) {
      const angle = elapsed * 0.3 + (index / 16) * Math.PI * 2
      const rx = x + Math.cos(angle) * r * 0.85
      const ry = y + Math.sin(angle) * r * 0.85 * SQUASH
      const size = 17

      if (index % 2) {
        g.rect(rx - 5, ry - size * 0.8, 10, size * 1.6).fill({ color: accentLight, alpha: 0.55 + breath * 0.35 })
      } else {
        g.poly([rx, ry - size, rx + size * 0.6, ry, rx, ry + size, rx - size * 0.6, ry]).fill({
          color: light,
          alpha: 0.65 + breath * 0.35
        })
      }
    }

    const turn = -elapsed * 0.2
    const inner = r * 0.66
    const point = (angle: number, reach: number): [number, number] => [
      x + Math.cos(angle) * reach,
      y + Math.sin(angle) * reach * SQUASH
    ]

    if (sigil === 'flake') {
      // Six arms with two pairs of branches each.
      for (let arm = 0; arm < 6; arm++) {
        const angle = turn + (arm / 6) * Math.PI * 2
        const [ex, ey] = point(angle, inner)

        g.moveTo(x, y)
          .lineTo(ex, ey)
          .stroke({ width: 9, color: accent, alpha: 0.55 + breath * 0.3 })

        for (const along of [0.45, 0.7]) {
          const [bx, by] = point(angle, inner * along)

          for (const side of [-1, 1]) {
            const [tx, ty] = point(angle + side * 0.45, inner * (along + 0.22))

            g.moveTo(bx, by)
              .lineTo(tx, ty)
              .stroke({ width: 7, color: accentLight, alpha: 0.45 + breath * 0.3 })
          }
        }
      }
    } else {
      // Two triangles crossed, and a burning core.
      for (const offset of [0, Math.PI / 3]) {
        const corners = [0, 1, 2].flatMap((corner) => point(turn + offset + (corner / 3) * Math.PI * 2, inner))

        g.poly(corners).stroke({ width: 9, color: accentLight, alpha: 0.55 + breath * 0.3 })
      }

      g.ellipse(x, y, r * 0.2, r * 0.2 * SQUASH).fill({ color: accent, alpha: 0.35 + breath * 0.3 })
    }

    g.ellipse(x, y, r * 0.12, r * 0.12 * SQUASH).fill({ color: light, alpha: 0.4 + breath * 0.35 })
  }

  /** Waves of power leaving the sigil, widening and fading. */
  private drawWaves({ node: { x, y }, magic: { color, light } }: Seal, elapsed: number): void {
    for (const lag of [0, 0.5]) {
      const life = (elapsed / WAVE_EVERY + lag) % 1
      const reach = SIGIL_RADIUS + (WAVE_REACH - SIGIL_RADIUS) * life
      const alpha = (1 - life) ** 1.5

      this.ground.ellipse(x, y, reach, reach * SQUASH).stroke({ width: 18 * (1 - life) + 4, color, alpha: alpha * 0.5 })
      this.ground.ellipse(x, y, reach, reach * SQUASH).stroke({ width: 4, color: light, alpha: alpha * 0.6 })
    }
  }

  /** Frost glitters or embers rising around the point, half of them violet. */
  private drawMotes({ node: { x, y }, magic }: Seal, elapsed: number): void {
    const { color, light, accent, accentLight, motes } = magic
    const embers = motes === 'embers'

    for (let index = 0; index < MOTES; index++) {
      const life = (elapsed * (embers ? 0.3 : 0.16) + ((index * 0.618) % 1)) % 1
      const angle = index * 2.399 + (embers ? 0 : elapsed * 0.4 + life * 2)
      const reach = AURA_RADIUS * (0.2 + ((index * 7) % 10) / 13)
      const sway = Math.sin(elapsed * (embers ? 3 : 1.2) + index) * (embers ? 10 : 22)
      const mx = x + Math.cos(angle) * reach + sway
      const my = y + Math.sin(angle) * reach * SQUASH - life * (embers ? 360 : 260)
      const flicker = embers ? 0.65 + Math.sin(elapsed * 14 + index * 3) * 0.35 : 1
      const alpha = Math.sin(life * Math.PI) * 0.9 * flicker
      const size = 6 + (index % 3) * 3
      const violet = index % 2 === 0

      this.motes.circle(mx, my, size * 2.4).fill({ color: violet ? color : accent, alpha: alpha * 0.25 })

      if (embers || violet) {
        this.motes.circle(mx, my, size).fill({ color: violet ? light : accentLight, alpha })
      } else {
        // A little four-pointed glitter of frost.
        this.motes
          .poly([mx, my - size * 1.8, mx + size * 0.45, my, mx, my + size * 1.8, mx - size * 0.45, my])
          .fill({ color: accentLight, alpha })
        this.motes
          .poly([mx - size * 1.8, my, mx, my + size * 0.45, mx + size * 1.8, my, mx, my - size * 0.45])
          .fill({ color: accentLight, alpha })
      }
    }
  }

  /** Over the fog: a halo around the point and a beam up from it, so that the Seal is seen from far. */
  private drawHalo({ node: { x, y }, magic: { color, light } }: Seal, elapsed: number): void {
    const breath = (Math.sin(elapsed * 1.6) + 1) / 2
    const steps = 14

    for (const [share, alpha] of [
      [1, 0.04],
      [0.7, 0.05],
      [0.42, 0.07]
    ]) {
      this.sky.ellipse(x, y, AURA_RADIUS * 0.8 * share, AURA_RADIUS * 0.8 * share * SQUASH).fill({
        color,
        alpha: alpha + breath * 0.03
      })
    }

    for (let step = 0; step < steps; step++) {
      const share = step / steps
      const width = BEAM_WIDTH * (1 - share * 0.55)
      const alpha = (1 - share) * (0.12 + breath * 0.07)

      this.sky
        .rect(x - width / 2, y - 40 - (share + 1 / steps) * BEAM_HEIGHT, width, BEAM_HEIGHT / steps)
        .fill({ color, alpha })
    }

    this.sky.rect(x - BEAM_WIDTH * 0.12, y - 40 - BEAM_HEIGHT * 0.7, BEAM_WIDTH * 0.24, BEAM_HEIGHT * 0.7).fill({
      color: light,
      alpha: 0.08 + breath * 0.06
    })
    this.sky.ellipse(x, y - 40, BEAM_WIDTH * 0.8, BEAM_WIDTH * 0.28).fill({ color: light, alpha: 0.14 + breath * 0.1 })
  }
}

/** Whether the magic of a Seal (its glow, its motes and the beam over it) can be inside the visible area. */
function onScreen({ x, y }: WorldNode, visible: Rectangle): boolean {
  const side = AURA_RADIUS + 60

  return (
    x + side >= visible.x &&
    x - side <= visible.x + visible.width &&
    y + side >= visible.y &&
    y - BEAM_HEIGHT - side <= visible.y + visible.height
  )
}
