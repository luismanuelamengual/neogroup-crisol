import { Graphics, Sprite, Texture } from 'pixi.js'
import { BIOMES_ORDER, LAKES } from '@/app/(protected)/(engine)/data/terrains'
import { LAIRS } from '@/app/(protected)/(engine)/data/zones'
import { BossKind } from '@/app/(protected)/(engine)/models/BossKind'
import { TileMap } from '@/app/(protected)/(engine)/models/TileMap'
import { World } from '@/app/(protected)/(engine)/models/World'
import { WorldNode } from '@/app/(protected)/(engine)/models/WorldNode'
import { Zone } from '@/app/(protected)/(engine)/models/Zone'
import { heightAt, isPaved, terrainAt } from '@/app/(protected)/(engine)/utils/tileMap'
import { WorldScenery } from '@/app/(protected)/(world)/utils/worldScenery'
import { LairTextures } from '@/app/(protected)/(world)/utils/zoneTextures'

/**
 * The lairs of the captors on the world map (see LAIRS in data/zones.ts), so
 * that the place where a hero is held reads from far: a ring of standing
 * stones around the point, the tree where the captive hangs in a cage beside
 * it, great monuments further out if the lair has them, and, while the
 * captive waits, a spell circle turning on the ground, motes of magic moving
 * and a beam of light over the fog, in the colors of its captor (LAIR_MAGIC).
 * Once freed, the cage hangs open and empty and the magic is gone.
 */

/** Where the tree of the cage stands from the point (world pixels), the ring of stones, and how many stones at most. */
const TREE_DISTANCE = [190, 230, 270, 320, 380]
const RING_RADII = [300, 250, 350]
/** Half the width of the tree of the cage, with the cage. */
const TREE_HALF_WIDTH = 230
const STONES = 11
/** Least angle between a piece and a trail leaving the point (radians), and room kept from the trails. */
const TRAIL_ANGLE = 0.3
const TRAIL_ROOM = 70
/** The spell circle under the point, the beam over it and the motes rising around it. */
const CIRCLE_RADIUS = 150
const BEAM_HEIGHT = 900
const BEAM_WIDTH = 70
const MOTES = 18
const SWIRL_MOTES = 34
/** How far the monuments stand from the point, and the room kept between them. */
const MONUMENT_NEAREST = 380
const MONUMENT_FARTHEST = 1100
const MONUMENT_STEP = 40
const MONUMENT_ROOM = 40

/** The magic of a lair while its captive waits. */
interface LairMagic {
  color: number
  light: number
  /** A third of the motes are of this color. */
  accent: number
  /** What crosses the inner ring of the spell circle: a star, the rays of a sun or a coiled serpent. */
  sigil: 'star' | 'sun' | 'coil'
  /** The motes rise and fade, or whirl up like a storm of sand. */
  motes: 'rise' | 'whirl'
}

const LAIR_MAGIC: Partial<Record<Zone, LairMagic>> = {
  [Zone.WITCHWOOD]: { color: 0xff4fc8, light: 0xffc2f0, accent: 0xb6f05a, sigil: 'star', motes: 'rise' },
  [Zone.JADE_TEMPLE]: { color: 0x27e6a4, light: 0xc8ffe9, accent: 0xffc83a, sigil: 'coil', motes: 'rise' },
  [Zone.NECROPOLIS]: { color: 0xffb81f, light: 0xfff0a8, accent: 0xb13bd0, sigil: 'sun', motes: 'whirl' }
}

interface MonumentSpot {
  texture: Texture
  x: number
  y: number
}

interface Lair {
  node: WorldNode
  /** Directions of the trails leaving the point (radians). */
  trails: number[]
  zone: Zone
  magic: LairMagic
  tree: Sprite | null
  textures: LairTextures | null
}

export class WorldLairs {
  /** The spell circles (on the ground, under the points), the motes (over the scenery) and the beams (over the fog). */
  readonly circles = new Graphics()
  readonly motes = new Graphics()
  readonly beams = new Graphics()
  private readonly lairs: Lair[]
  private freed = new Set<string>()

  constructor(
    private readonly world: World,
    private readonly tiles: TileMap
  ) {
    const nodes = new Map(world.nodes.map((node) => [node.id, node]))

    this.lairs = world.nodes
      .filter((node) => node.bossKind === BossKind.CAPTOR && LAIRS[node.biome])
      .map((node) => ({
        node,
        trails: world.edges.flatMap(([a, b]) => {
          const other = a === node.id ? nodes.get(b) : b === node.id ? nodes.get(a) : null

          return other ? [Math.atan2(other.y - node.y, other.x - node.x)] : []
        }),
        zone: LAIRS[node.biome]!.zone,
        magic: LAIR_MAGIC[LAIRS[node.biome]!.zone]!,
        tree: null,
        textures: null
      }))
  }

  /** Puts the tree of the cage and the stones of each lair with the drawings of its zone (once; later calls only change the tree). */
  setTextures(texturesOf: (zone: Zone) => LairTextures | null, scenery: WorldScenery): void {
    for (const lair of this.lairs) {
      const textures = texturesOf(lair.zone)
      const placed = lair.textures

      if (!textures) {
        continue
      }

      lair.textures = textures

      if (placed) {
        lair.tree!.texture = this.freed.has(lair.node.id) ? textures.freed : textures.caged
        continue
      }

      const spot = this.treeSpot(lair)
      const tree = new Sprite(this.freed.has(lair.node.id) ? textures.freed : textures.caged)

      tree.anchor.set(0.5, 0.96)
      tree.position.set(spot[0], spot[1])
      lair.tree = tree

      for (const [x, y] of this.stoneSpots(lair, spot)) {
        const stone = new Sprite(textures.stone)

        stone.anchor.set(0.5, 0.96)
        stone.position.set(x, y)
        stone.scale.set(x < lair.node.x ? -1 : 1, 1)
        scenery.add(stone)
      }

      const standing = { texture: textures.caged, x: spot[0], y: spot[1] }

      for (const { texture, x, y } of this.monumentSpots(lair, textures.monuments, standing)) {
        const monument = new Sprite(texture)

        monument.anchor.set(0.5, 0.96)
        monument.position.set(x, y)
        // The drawings look to the right: towards the point.
        monument.scale.set(x > lair.node.x ? -1 : 1, 1)
        scenery.add(monument)
      }

      scenery.add(tree)
    }
  }

  /** Which captives are freed (their captor beaten): their cage hangs open and their magic is gone. */
  setFreed(cleared: Set<string>): void {
    this.freed = new Set(this.lairs.filter(({ node }) => cleared.has(node.id)).map(({ node }) => node.id))

    for (const lair of this.lairs) {
      if (lair.tree && lair.textures) {
        lair.tree.texture = this.freed.has(lair.node.id) ? lair.textures.freed : lair.textures.caged
      }
    }
  }

  /** The magic of the lairs whose captive waits, moving. */
  update(elapsed: number): void {
    this.circles.clear()
    this.motes.clear()
    this.beams.clear()

    for (const { node, magic } of this.lairs) {
      if (!this.freed.has(node.id)) {
        this.drawCircle(node, magic, elapsed)

        if (magic.motes === 'whirl') {
          this.drawWhirl(node, magic, elapsed)
        } else {
          this.drawMotes(node, magic, elapsed)
        }

        this.drawBeam(node, magic, elapsed)
      }
    }
  }

  destroy(): void {
    this.circles.destroy()
    this.motes.destroy()
    this.beams.destroy()
  }

  /** North of the point if it can (behind its marker), away from its trails, on its level. */
  private treeSpot({ node, trails }: Lair): [number, number] {
    const angles = [-90, -60, -120, -30, -150, 0, 180, 30, 150, 60, 120, 90].map((degrees) => (degrees * Math.PI) / 180)

    for (const distance of TREE_DISTANCE) {
      for (const angle of angles) {
        const x = node.x + Math.cos(angle) * distance
        const y = node.y + Math.sin(angle) * distance

        // In front of the point, it would hide it.
        const hides = y > node.y && Math.abs(x - node.x) < TREE_HALF_WIDTH

        if (!hides && this.awayFromTrails(trails, angle, 0.6) && this.rests(node, x, y, 46)) {
          return [x, y]
        }
      }
    }

    return [node.x, node.y - TREE_DISTANCE[0]]
  }

  /** Evenly around the point, but not over its trails, the tree, lakes or cliffs. */
  private stoneSpots({ node, trails }: Lair, tree: [number, number]): [number, number][] {
    const spots: [number, number][] = []

    for (let index = 0; index < STONES; index++) {
      const angle = (index / STONES) * Math.PI * 2 + 0.2

      if (!this.awayFromTrails(trails, angle, 1)) {
        continue
      }

      // The first radius where it rests; the ring a little flattened (the ground is seen from above and to the front).
      const spot = RING_RADII.map((radius): [number, number] => [
        node.x + Math.cos(angle) * radius,
        node.y + Math.sin(angle) * radius * 0.78
      ]).find(([x, y]) => Math.hypot(x - tree[0], y - tree[1]) > 150 && this.rests(node, x, y, 22))

      if (spot) {
        spots.push(spot)
      }
    }

    return spots
  }

  /**
   * Past the ring, each one at the closest place where it stands on flat
   * ground, hides no trail or point and touches no other monument.
   */
  private monumentSpots({ node }: Lair, textures: Texture[], tree: MonumentSpot): MonumentSpot[] {
    const placed = [tree]

    for (const texture of textures) {
      const spot = this.monumentSpot(node, texture, placed)

      if (spot) {
        placed.push(spot)
      }
    }

    return placed.slice(1)
  }

  private monumentSpot(node: WorldNode, texture: Texture, placed: MonumentSpot[]): MonumentSpot | null {
    for (let distance = MONUMENT_NEAREST; distance <= MONUMENT_FARTHEST; distance += MONUMENT_STEP) {
      for (let angle = 0; angle < 36; angle++) {
        const x = node.x + Math.cos((angle * Math.PI) / 18) * distance
        const y = node.y + Math.sin((angle * Math.PI) / 18) * distance * 0.78
        const apart = placed.every(
          (other) =>
            Math.abs(other.x - x) > (other.texture.width + texture.width) / 2 + MONUMENT_ROOM ||
            other.y < y - texture.height - MONUMENT_ROOM ||
            y < other.y - other.texture.height - MONUMENT_ROOM
        )

        if (apart && this.standsClear(node, x, y, texture.width, texture.height)) {
          return { texture, x, y }
        }
      }
    }

    return null
  }

  private inBiome({ biome }: WorldNode, x: number, y: number): boolean {
    const { biomes, columns, tileSize } = this.tiles

    return biomes[Math.floor(y / tileSize) * columns + Math.floor(x / tileSize)] === BIOMES_ORDER.indexOf(biome)
  }

  /** Whether a piece this big rests on one level, inside the world, with no trail or lake under it or behind it. */
  private standsClear(node: WorldNode, x: number, y: number, width: number, height: number): boolean {
    const level = heightAt(this.tiles, x, y)

    if (x - width / 2 <= 0 || x + width / 2 >= this.world.width || y - height <= 0 || y >= this.world.height) {
      return false
    }

    for (let dx = -width / 2; dx <= width / 2; dx += 30) {
      if (heightAt(this.tiles, x + dx, y) !== level || !this.inBiome(node, x + dx, y)) {
        return false
      }

      for (let dy = -height; dy <= 30; dy += 30) {
        if (isPaved(this.tiles, x + dx, y + dy) || LAKES.has(terrainAt(this.tiles, x + dx, y + dy))) {
          return false
        }
      }
    }

    return true
  }

  private awayFromTrails(trails: number[], angle: number, share: number): boolean {
    return trails.every((trail) => {
      const difference = Math.abs(Math.atan2(Math.sin(angle - trail), Math.cos(angle - trail)))

      return difference > TRAIL_ANGLE * share + 0.12
    })
  }

  /** Whether a foot this wide rests at that place: on the level of the point, off trails and lakes. */
  private rests(node: WorldNode, x: number, y: number, half: number): boolean {
    const level = heightAt(this.tiles, node.x, node.y)

    return [-half, 0, half].every((dx) =>
      [-TRAIL_ROOM / 2, 0, TRAIL_ROOM / 4].every((dy) => {
        const px = x + dx
        const py = y + dy

        return (
          px > 0 &&
          py > 0 &&
          px < this.world.width &&
          py < this.world.height &&
          heightAt(this.tiles, px, py) === level &&
          this.inBiome(node, px, py) &&
          !isPaved(this.tiles, px, py) &&
          !LAKES.has(terrainAt(this.tiles, px, py))
        )
      })
    )
  }

  /** Two rings turning opposite ways, with runes between them, breathing. */
  private drawCircle({ x, y }: WorldNode, { color, light, sigil }: LairMagic, elapsed: number): void {
    const breath = (Math.sin(elapsed * 2) + 1) / 2
    const g = this.circles
    const squash = 0.62

    g.ellipse(x, y, CIRCLE_RADIUS * 1.25, CIRCLE_RADIUS * 1.25 * squash).fill({
      color,
      alpha: 0.1 + breath * 0.06
    })
    g.ellipse(x, y, CIRCLE_RADIUS, CIRCLE_RADIUS * squash).stroke({ width: 7, color, alpha: 0.55 + breath * 0.3 })
    g.ellipse(x, y, CIRCLE_RADIUS * 0.72, CIRCLE_RADIUS * 0.72 * squash).stroke({
      width: 4,
      color: light,
      alpha: 0.45 + breath * 0.3
    })

    // Runes: little diamonds between the rings, turning.
    for (let index = 0; index < 10; index++) {
      const angle = elapsed * 0.35 + (index / 10) * Math.PI * 2
      const rx = x + Math.cos(angle) * CIRCLE_RADIUS * 0.86
      const ry = y + Math.sin(angle) * CIRCLE_RADIUS * 0.86 * squash
      const size = 9

      g.poly([rx, ry - size, rx + size * 0.6, ry, rx, ry + size, rx - size * 0.6, ry]).fill({
        color: light,
        alpha: 0.6 + breath * 0.35
      })
    }

    if (sigil === 'coil') {
      this.drawCoil(x, y, squash, color, elapsed, 0.35 + breath * 0.3)

      return
    }

    // Across the inner ring, turning the other way: a star of lines or the rays of a sun.
    const lines = sigil === 'sun' ? 12 : 5

    for (let index = 0; index < lines; index++) {
      const a = -elapsed * 0.25 + (index / lines) * Math.PI * 2
      const b = a + (Math.PI * 4) / 5
      const inner = CIRCLE_RADIUS * (index % 2 ? 0.3 : 0.2)
      const [fromX, fromY, toX, toY] =
        sigil === 'sun'
          ? [
              Math.cos(a) * inner,
              Math.sin(a) * inner,
              Math.cos(a) * CIRCLE_RADIUS * 0.72,
              Math.sin(a) * CIRCLE_RADIUS * 0.72
            ]
          : [
              Math.cos(a) * CIRCLE_RADIUS * 0.72,
              Math.sin(a) * CIRCLE_RADIUS * 0.72,
              Math.cos(b) * CIRCLE_RADIUS * 0.72,
              Math.sin(b) * CIRCLE_RADIUS * 0.72
            ]

      g.moveTo(x + fromX, y + fromY * squash)
        .lineTo(x + toX, y + toY * squash)
        .stroke({ width: 3, color, alpha: 0.35 + breath * 0.25 })
    }

    if (sigil === 'sun') {
      g.ellipse(x, y, CIRCLE_RADIUS * 0.18, CIRCLE_RADIUS * 0.18 * squash).fill({ color, alpha: 0.4 + breath * 0.3 })
    }
  }

  /** A serpent coiled inside the inner ring, turning the other way. */
  private drawCoil(x: number, y: number, squash: number, color: number, elapsed: number, alpha: number): void {
    const steps = 48
    const turns = 2.5

    this.circles.moveTo(x, y)

    for (let step = 1; step <= steps; step++) {
      const share = step / steps
      const angle = -elapsed * 0.3 + share * turns * Math.PI * 2
      const reach = CIRCLE_RADIUS * 0.68 * share

      this.circles.lineTo(x + Math.cos(angle) * reach, y + Math.sin(angle) * reach * squash)
    }

    this.circles.stroke({ width: 5, color, alpha })
  }

  /** Motes of magic and spores rising from the ring and fading. */
  private drawMotes({ x, y }: WorldNode, { color, light, accent }: LairMagic, elapsed: number): void {
    for (let index = 0; index < MOTES; index++) {
      const life = (elapsed * 0.22 + ((index * 0.618) % 1)) % 1
      const angle = index * 2.399
      const reach = RING_RADII[0] * (0.35 + ((index * 7) % 10) / 14)
      const mx = x + Math.cos(angle) * reach + Math.sin(elapsed * 1.3 + index) * 14
      const my = y + Math.sin(angle) * reach * 0.7 - life * 230
      const alpha = Math.sin(life * Math.PI) * 0.85
      const size = 4 + (index % 3) * 2

      this.motes.circle(mx, my, size * 2.2).fill({ color: index % 3 ? color : accent, alpha: alpha * 0.25 })
      this.motes.circle(mx, my, size).fill({ color: index % 3 ? light : accent, alpha })
    }
  }

  /** Grains of cursed sand whirling up around the point, closing in as they rise, and fading. */
  private drawWhirl({ x, y }: WorldNode, { color, light, accent }: LairMagic, elapsed: number): void {
    for (let index = 0; index < SWIRL_MOTES; index++) {
      const life = (elapsed * 0.16 + ((index * 0.618) % 1)) % 1
      const angle = index * 2.399 + elapsed * 1.2 + life * 5
      const reach = RING_RADII[0] * (1.05 - life * 0.75) * (0.8 + (index % 5) * 0.08)
      const mx = x + Math.cos(angle) * reach
      const my = y + Math.sin(angle) * reach * 0.5 - life * 300
      const alpha = Math.sin(life * Math.PI) * 0.9
      const size = 3 + (index % 3) * 2

      this.motes.circle(mx, my, size * 2).fill({ color: index % 3 ? color : accent, alpha: alpha * 0.25 })
      this.motes.circle(mx, my, size).fill({ color: index % 3 ? light : accent, alpha })
    }
  }

  /** A soft beam of light up from the point, seen over the fog: someone waits there. */
  private drawBeam({ x, y }: WorldNode, { color, light }: LairMagic, elapsed: number): void {
    const breath = (Math.sin(elapsed * 1.6) + 1) / 2
    const steps = 14

    for (let step = 0; step < steps; step++) {
      const share = step / steps
      const width = BEAM_WIDTH * (1 - share * 0.5)
      const alpha = (1 - share) * (0.1 + breath * 0.06)

      this.beams
        .rect(x - width / 2, y - 40 - (share + 1 / steps) * BEAM_HEIGHT, width, BEAM_HEIGHT / steps)
        .fill({ color, alpha })
    }

    this.beams
      .ellipse(x, y - 40, BEAM_WIDTH * 0.7, BEAM_WIDTH * 0.25)
      .fill({ color: light, alpha: 0.12 + breath * 0.1 })
  }
}
