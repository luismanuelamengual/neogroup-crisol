import { Graphics, Sprite } from 'pixi.js'
import { LAKES } from '@/app/(protected)/(engine)/data/terrains'
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
 * stones with glowing runes around the point, the tree where the captive
 * hangs in a cage beside it, and, while the captive waits, a spell circle
 * turning on the ground, motes of magic rising and a beam of light over the
 * fog. Once freed, the cage hangs open and empty and the magic is gone.
 */

/** Where the tree of the cage stands from the point (world pixels), the ring of stones, and how many stones at most. */
const TREE_DISTANCE = [190, 230, 270]
const RING_RADII = [300, 250, 350]
const STONES = 11
/** Least angle between a piece and a trail leaving the point (radians), and room kept from the trails. */
const TRAIL_ANGLE = 0.3
const TRAIL_ROOM = 70
/** The spell circle under the point, the beam over it and the motes rising around it. */
const CIRCLE_RADIUS = 150
const BEAM_HEIGHT = 900
const BEAM_WIDTH = 70
const MOTES = 18
const HEX = 0xff4fc8
const HEX_LIGHT = 0xffc2f0
const SPORE = 0xb6f05a

interface Lair {
  node: WorldNode
  /** Directions of the trails leaving the point (radians). */
  trails: number[]
  zone: Zone
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

    for (const { node } of this.lairs) {
      if (!this.freed.has(node.id)) {
        this.drawCircle(node, elapsed)
        this.drawMotes(node, elapsed)
        this.drawBeam(node, elapsed)
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
    const angles = [-90, -60, -120, -30, -150, 0, 180, 30, 150].map((degrees) => (degrees * Math.PI) / 180)

    for (const distance of TREE_DISTANCE) {
      for (const angle of angles) {
        const x = node.x + Math.cos(angle) * distance
        const y = node.y + Math.sin(angle) * distance

        if (this.awayFromTrails(trails, angle, 0.6) && this.rests(node, x, y, 46)) {
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
          !isPaved(this.tiles, px, py) &&
          !LAKES.has(terrainAt(this.tiles, px, py))
        )
      })
    )
  }

  /** Two rings turning opposite ways, with runes between them, breathing. */
  private drawCircle({ x, y }: WorldNode, elapsed: number): void {
    const breath = (Math.sin(elapsed * 2) + 1) / 2
    const g = this.circles
    const squash = 0.62

    g.ellipse(x, y, CIRCLE_RADIUS * 1.25, CIRCLE_RADIUS * 1.25 * squash).fill({
      color: HEX,
      alpha: 0.1 + breath * 0.06
    })
    g.ellipse(x, y, CIRCLE_RADIUS, CIRCLE_RADIUS * squash).stroke({ width: 7, color: HEX, alpha: 0.55 + breath * 0.3 })
    g.ellipse(x, y, CIRCLE_RADIUS * 0.72, CIRCLE_RADIUS * 0.72 * squash).stroke({
      width: 4,
      color: HEX_LIGHT,
      alpha: 0.45 + breath * 0.3
    })

    // Runes: little diamonds between the rings, turning.
    for (let index = 0; index < 10; index++) {
      const angle = elapsed * 0.35 + (index / 10) * Math.PI * 2
      const rx = x + Math.cos(angle) * CIRCLE_RADIUS * 0.86
      const ry = y + Math.sin(angle) * CIRCLE_RADIUS * 0.86 * squash
      const size = 9

      g.poly([rx, ry - size, rx + size * 0.6, ry, rx, ry + size, rx - size * 0.6, ry]).fill({
        color: HEX_LIGHT,
        alpha: 0.6 + breath * 0.35
      })
    }

    // A star of lines across the inner ring, turning the other way.
    for (let index = 0; index < 5; index++) {
      const a = -elapsed * 0.25 + (index / 5) * Math.PI * 2
      const b = a + (Math.PI * 4) / 5

      g.moveTo(x + Math.cos(a) * CIRCLE_RADIUS * 0.72, y + Math.sin(a) * CIRCLE_RADIUS * 0.72 * squash)
        .lineTo(x + Math.cos(b) * CIRCLE_RADIUS * 0.72, y + Math.sin(b) * CIRCLE_RADIUS * 0.72 * squash)
        .stroke({ width: 3, color: HEX, alpha: 0.35 + breath * 0.25 })
    }
  }

  /** Motes of magic and spores rising from the ring and fading. */
  private drawMotes({ x, y }: WorldNode, elapsed: number): void {
    for (let index = 0; index < MOTES; index++) {
      const life = (elapsed * 0.22 + ((index * 0.618) % 1)) % 1
      const angle = index * 2.399
      const reach = RING_RADII[0] * (0.35 + ((index * 7) % 10) / 14)
      const mx = x + Math.cos(angle) * reach + Math.sin(elapsed * 1.3 + index) * 14
      const my = y + Math.sin(angle) * reach * 0.7 - life * 230
      const alpha = Math.sin(life * Math.PI) * 0.85
      const size = 4 + (index % 3) * 2

      this.motes.circle(mx, my, size * 2.2).fill({ color: index % 3 ? HEX : SPORE, alpha: alpha * 0.25 })
      this.motes.circle(mx, my, size).fill({ color: index % 3 ? HEX_LIGHT : SPORE, alpha })
    }
  }

  /** A soft beam of light up from the point, seen over the fog: someone waits there. */
  private drawBeam({ x, y }: WorldNode, elapsed: number): void {
    const breath = (Math.sin(elapsed * 1.6) + 1) / 2
    const steps = 14

    for (let step = 0; step < steps; step++) {
      const share = step / steps
      const width = BEAM_WIDTH * (1 - share * 0.5)
      const alpha = (1 - share) * (0.1 + breath * 0.06)

      this.beams
        .rect(x - width / 2, y - 40 - (share + 1 / steps) * BEAM_HEIGHT, width, BEAM_HEIGHT / steps)
        .fill({ color: HEX, alpha })
    }

    this.beams
      .ellipse(x, y - 40, BEAM_WIDTH * 0.7, BEAM_WIDTH * 0.25)
      .fill({ color: HEX_LIGHT, alpha: 0.12 + breath * 0.1 })
  }
}
