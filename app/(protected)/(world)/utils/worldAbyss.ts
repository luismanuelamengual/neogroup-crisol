import { Graphics, Sprite, Texture } from 'pixi.js'
import { LAKES } from '@/app/(protected)/(engine)/data/terrains'
import { SEALS_TO_OPEN_ABYSS } from '@/app/(protected)/(engine)/data/world'
import { ZONES_ORDER } from '@/app/(protected)/(engine)/data/zones'
import { BossKind } from '@/app/(protected)/(engine)/models/BossKind'
import { TileMap } from '@/app/(protected)/(engine)/models/TileMap'
import { World } from '@/app/(protected)/(engine)/models/World'
import { WorldNode } from '@/app/(protected)/(engine)/models/WorldNode'
import { Zone } from '@/app/(protected)/(engine)/models/Zone'
import { heightAt, isPaved, terrainAt } from '@/app/(protected)/(engine)/utils/tileMap'
import { WorldScenery } from '@/app/(protected)/(world)/utils/worldScenery'
import { AbyssTextures } from '@/app/(protected)/(world)/utils/zoneTextures'

/**
 * The two great places of the Abyss on the world map.
 *
 * The door: a colossal ring of stone stands around its point, so that the
 * party walks into it, between chained pillars and braziers. While the Seals
 * hold, it is dark and crossed by a chain for each Seal still needed, and a
 * red beam marks it from far; once they fall, a vortex turns inside it, motes
 * are sucked into it and the beam turns violet.
 *
 * The forge of Crisol: a fortress of burned iron whose gate is the point of
 * Crisol, closed off by a moat of lava and a wall of black crags that only the
 * trails cross (see ZoneDefinition.moat), islands of rock floating around it, embers rising and a heart that beats, shaking
 * the ground with waves of fire and glowing over the fog. All of it goes
 * quiet when Crisol falls.
 */

/** Half the height of the ring of the door (see ABYSS_LOOK), and of its hole, where the vortex turns. */
const RING_RADIUS = 290
const HOLE_RADIUS = 186
/** Flattening of what lies on the ground, seen from above and to the front. */
const SQUASH = 0.62
const FORECOURT_RADIUS = 450
const PORTAL_ARMS = 5
const PORTAL_MOTES = 36
const PORTAL_BEAM = { height: 1300, width: 170 }
const PORTAL = { dark: 0x12041f, deep: 0x3b0f6b, color: 0xa63dff, light: 0xff7ae8, core: 0xffe6fb }
const SEALED = { color: 0xff2a4d, light: 0xff8a9c }
const CHAIN = { iron: 0x2a2233, light: 0x8a7a9e }
const OPEN_TINT = 0xffffff
const SEALED_TINT = 0x8f84a3
const FORGE = { color: 0xff6a13, light: 0xffc233, core: 0xfff1c1, deep: 0xc2240c }
const FORGE_RADIUS = 300
const EMBERS = 110
const EMBERS_REACH = 900
/** Seconds between two beats of the heart of Crisol, and the second beat, after the first and weaker. */
const BEAT = 1.7
const SECOND_BEAT = 0.3
const BEAT_WAVES = 3
/** How far a piece may move from where it should stand to find clear ground. */
const PLACE_REACH = 300
const PLACE_STEP = 30
/** Room between the crags of the wall around the forge. */
const CRAG_GAP = 72
/** The crags of the wall, the tallest that hides nothing at each place. */
const CRAGS: Piece[] = ['crag', 'fang', 'boulder', 'shard']
/** Around the point of Crisol, the trees of the neighbors are taken away. */
const FORGE_CLEARING = 420

type Piece = keyof AbyssTextures

/** A piece of a place: where it should stand from its point (world pixels), and how high it floats, if it does. */
interface Placement {
  piece: Piece
  dx: number
  dy: number
  mirror?: boolean
  floats?: number
  /** Stands exactly there, even on the clearing of the point. */
  fixed?: boolean
}

const PORTAL_PIECES: Placement[] = [
  { piece: 'pillar', dx: -330, dy: 300 },
  { piece: 'pillar', dx: 330, dy: 300 },
  { piece: 'brazier', dx: -190, dy: 350 },
  { piece: 'brazier', dx: 190, dy: 350 }
]
const FORGE_PIECES: Placement[] = [
  { piece: 'keep', dx: 0, dy: -84, fixed: true },
  { piece: 'tower', dx: 232, dy: -112, mirror: true },
  { piece: 'heart', dx: -195, dy: -35, floats: 46 },
  { piece: 'brazier', dx: 135, dy: -30 },
  { piece: 'brazier', dx: -130, dy: 40 },
  { piece: 'island', dx: 620, dy: 230, floats: 120 },
  { piece: 'islet', dx: 380, dy: 300, floats: 170 }
]

interface Float {
  sprite: Sprite
  lift: number
  phase: number
}

/** How strong the beat of the heart is at a moment: 0 to 1, two quick thumps and a rest. */
function beatAt(elapsed: number): number {
  const phase = elapsed % BEAT
  const thump = (at: number) => Math.exp(-(((phase - at) / 0.09) ** 2))

  return Math.max(thump(0.1), thump(0.1 + SECOND_BEAT) * 0.7)
}

export class WorldAbyss {
  /** The rune circles and the vortex (on the ground, under the points), what floats (over the scenery) and what is seen over the fog. */
  readonly ground = new Graphics()
  readonly air = new Graphics()
  readonly sky = new Graphics()
  private readonly gate: WorldNode
  private readonly crisol: WorldNode
  private readonly seals: WorldNode[]
  private ring: Sprite | null = null
  private floats: Float[] = []
  /** How many Seals have fallen, whether the door is open and whether Crisol has. */
  private sealsDown = 0
  private crisolDown = false

  constructor(
    private readonly world: World,
    private readonly tiles: TileMap
  ) {
    const nodes = new Map(world.nodes.map((node) => [node.id, node]))

    this.gate = nodes.get(world.gateNodeId)!
    this.crisol = nodes.get(world.finalBossNodeId)!
    this.seals = world.nodes.filter((node) => node.bossKind === BossKind.SEAL)
  }

  private get open(): boolean {
    return this.sealsDown >= SEALS_TO_OPEN_ABYSS
  }

  /** Raises the door and the fortress with their drawings (once). */
  setTextures(textures: AbyssTextures | null, scenery: WorldScenery): void {
    if (!textures || this.ring) {
      return
    }

    const ring = new Sprite(textures.ring)

    ring.anchor.set(0.5, 1)
    ring.position.set(this.gate.x, this.gate.y + RING_RADIUS)
    ring.tint = this.open ? OPEN_TINT : SEALED_TINT
    scenery.clearAround(this.gate.x, this.gate.y, HOLE_RADIUS + 40)
    scenery.add(ring, undefined, true)
    this.ring = ring

    this.raise(this.gate, PORTAL_PIECES, textures, scenery)
    this.raise(this.crisol, FORGE_PIECES, textures, scenery)
    scenery.clearAround(this.crisol.x, this.crisol.y + 120, FORGE_CLEARING)
    this.raiseCrags(textures, scenery)
  }

  /** The wall of the forge: crags all along the shore of its zone, leaving the trails open. */
  private raiseCrags(textures: AbyssTextures, scenery: WorldScenery): void {
    const { columns, rows, tileSize, zones } = this.tiles
    const zone = ZONES_ORDER.indexOf(Zone.CRUCIBLE) + 1
    const placed: [number, number][] = []

    for (let row = 1; row < rows - 1; row++) {
      for (let column = 1; column < columns - 1; column++) {
        const index = row * columns + column
        const onEdge =
          zones[index] === zone &&
          [index - 1, index + 1, index - columns, index + columns].some((other) => zones[other] !== zone)
        const x = (column + 0.5) * tileSize
        const y = (row + 0.5) * tileSize

        if (!onEdge || placed.some(([px, py]) => Math.hypot(px - x, py - y) < CRAG_GAP)) {
          continue
        }

        // Every other one starts lower, so that the wall does not look even.
        const texture = CRAGS.slice(placed.length % 2)
          .map((piece) => textures[piece])
          .find((choice) => this.hidesNothing(x, y, choice))

        if (texture) {
          const crag = new Sprite(texture)

          crag.anchor.set(0.5, 0.96)
          crag.position.set(x, y)
          crag.scale.set(placed.length % 2 ? -1 : 1, 1)
          scenery.add(crag)
          placed.push([x, y])
        }
      }
    }
  }

  /** Whether a crag there leaves in sight every trail and point. */
  private hidesNothing(x: number, y: number, { width, height }: Texture): boolean {
    const half = width / 2

    if (y - height <= 0 || this.coversPoint(x, y, half, height)) {
      return false
    }

    for (let dx = -half; dx <= half; dx += 30) {
      for (let dy = -height; dy <= 30; dy += 30) {
        if (isPaved(this.tiles, x + dx, y + dy)) {
          return false
        }
      }
    }

    return true
  }

  private coversPoint(x: number, y: number, half: number, height: number): boolean {
    return this.world.nodes.some(
      (node) => Math.abs(node.x - x) < half + 34 && node.y > y - height - 34 && node.y < y + 34
    )
  }

  /** What has fallen: the chains of the door break with the Seals and the forge goes quiet with Crisol. */
  setCleared(cleared: Set<string>): void {
    this.sealsDown = this.seals.filter(({ id }) => cleared.has(id)).length
    this.crisolDown = cleared.has(this.crisol.id)

    if (this.ring) {
      this.ring.tint = this.open ? OPEN_TINT : SEALED_TINT
    }
  }

  update(elapsed: number): void {
    this.ground.clear()
    this.air.clear()
    this.sky.clear()
    this.drawForecourt(elapsed)

    if (this.open) {
      this.drawVortex(elapsed)
    } else {
      this.drawDarkHole(elapsed)
      this.drawChains(elapsed)
    }

    this.drawPortalBeam(elapsed)

    if (!this.crisolDown) {
      this.drawForge(elapsed)
    }

    for (const { sprite, lift, phase } of this.floats) {
      sprite.pivot.y = (lift + Math.sin(elapsed * 0.8 + phase) * 14) / Math.abs(sprite.scale.y)
    }
  }

  destroy(): void {
    this.ground.destroy()
    this.air.destroy()
    this.sky.destroy()
  }

  private raise(node: WorldNode, pieces: Placement[], textures: AbyssTextures, scenery: WorldScenery): void {
    pieces.forEach(({ piece, dx, dy, mirror, floats, fixed }, index) => {
      const texture = textures[piece]
      const spot: [number, number] | null = fixed
        ? [node.x + dx, node.y + dy]
        : this.clearSpot(node.x + dx, node.y + dy, texture, floats !== undefined)

      if (!spot) {
        return
      }

      const sprite = new Sprite(texture)

      sprite.anchor.set(0.5, 0.96)
      sprite.position.set(spot[0], spot[1])
      sprite.scale.set(mirror ? -1 : 1, 1)
      scenery.add(sprite)

      if (floats !== undefined) {
        this.floats.push({ sprite, lift: floats, phase: index * 1.7 })
      }
    })
  }

  /** The closest place to the wanted one where a piece stands on one level and hides no trail, lake or point. */
  private clearSpot(wantedX: number, wantedY: number, texture: Texture, floats: boolean): [number, number] | null {
    for (let reach = 0; reach <= PLACE_REACH; reach += PLACE_STEP) {
      for (let turn = 0; turn < (reach ? 12 : 1); turn++) {
        const x = wantedX + Math.cos((turn * Math.PI) / 6) * reach
        const y = wantedY + Math.sin((turn * Math.PI) / 6) * reach * 0.78

        if (this.standsClear(x, y, texture, floats)) {
          return [x, y]
        }
      }
    }

    return null
  }

  private standsClear(x: number, y: number, { width, height }: Texture, floats: boolean): boolean {
    const half = width / 2

    if (x - half <= 0 || x + half >= this.world.width || y - height <= 0 || y >= this.world.height) {
      return false
    }

    if (this.coversPoint(x, y, half, height)) {
      return false
    }

    const level = heightAt(this.tiles, x, y)

    for (let dx = -half; dx <= half; dx += 30) {
      if (!floats && heightAt(this.tiles, x + dx, y) !== level) {
        return false
      }

      if (isPaved(this.tiles, x + dx, y) || (!floats && LAKES.has(terrainAt(this.tiles, x + dx, y)))) {
        return false
      }
    }

    return true
  }

  /** A great circle of runes on the ground of the forecourt, turning slowly around the door. */
  private drawForecourt(elapsed: number): void {
    const { x, y } = this.gate
    const { color, light } = this.open ? PORTAL : SEALED
    const breath = (Math.sin(elapsed * 1.6) + 1) / 2
    const g = this.ground

    g.ellipse(x, y, FORECOURT_RADIUS * 1.12, FORECOURT_RADIUS * 1.12 * SQUASH).fill({
      color,
      alpha: 0.08 + breath * 0.05
    })
    g.ellipse(x, y, FORECOURT_RADIUS, FORECOURT_RADIUS * SQUASH).stroke({ width: 9, color, alpha: 0.5 + breath * 0.3 })
    g.ellipse(x, y, FORECOURT_RADIUS * 0.84, FORECOURT_RADIUS * 0.84 * SQUASH).stroke({
      width: 4,
      color: light,
      alpha: 0.35 + breath * 0.3
    })

    for (let index = 0; index < 16; index++) {
      const angle = elapsed * 0.16 + (index / 16) * Math.PI * 2
      const rx = x + Math.cos(angle) * FORECOURT_RADIUS * 0.92
      const ry = y + Math.sin(angle) * FORECOURT_RADIUS * 0.92 * SQUASH
      const size = 13

      g.poly([rx, ry - size, rx + size * 0.6, ry, rx, ry + size, rx - size * 0.6, ry]).fill({
        color: light,
        alpha: 0.5 + breath * 0.4
      })
    }
  }

  /** The hole of the ring while the Seals hold: dark, with a dim red breath. */
  private drawDarkHole(elapsed: number): void {
    const { x, y } = this.gate
    const breath = (Math.sin(elapsed * 1.2) + 1) / 2

    this.ground.circle(x, y, HOLE_RADIUS + 6).fill({ color: PORTAL.dark, alpha: 0.92 })
    this.ground.circle(x, y, HOLE_RADIUS * 0.7).fill({ color: SEALED.color, alpha: 0.05 + breath * 0.07 })
  }

  /** The chains across the ring, one for each Seal still needed. */
  private drawChains(elapsed: number): void {
    const { x, y } = this.gate
    const left = SEALS_TO_OPEN_ABYSS - this.sealsDown
    const sway = Math.sin(elapsed * 1.1) * 3

    for (let chain = 0; chain < left; chain++) {
      const angle = (chain % 2 ? -1 : 1) * 0.62 + (chain >> 1) * 0.5
      const fromX = x - Math.cos(angle) * HOLE_RADIUS
      const fromY = y - Math.sin(angle) * HOLE_RADIUS
      const toX = x + Math.cos(angle) * HOLE_RADIUS
      const toY = y + Math.sin(angle) * HOLE_RADIUS
      const links = 13

      for (let link = 0; link <= links; link++) {
        const share = link / links
        const lx = fromX + (toX - fromX) * share
        const ly = fromY + (toY - fromY) * share + Math.sin(share * Math.PI) * (16 + sway)
        const flat = link % 2 === 0

        this.air
          .ellipse(lx, ly, flat ? 17 : 8, flat ? 9 : 14)
          .fill({ color: CHAIN.iron })
          .stroke({ width: 4, color: CHAIN.light })
      }
    }
  }

  /** The door open: rings of light going down into the dark, turning arms and a burning eye in the middle. */
  private drawVortex(elapsed: number): void {
    const { x, y } = this.gate
    const g = this.ground
    const breath = (Math.sin(elapsed * 2.4) + 1) / 2

    g.circle(x, y, HOLE_RADIUS + 6).fill({ color: PORTAL.dark })
    g.circle(x, y, HOLE_RADIUS).fill({ color: PORTAL.deep, alpha: 0.9 })
    g.circle(x, y, HOLE_RADIUS * 0.74).fill({ color: PORTAL.color, alpha: 0.32 })

    for (let arm = 0; arm < PORTAL_ARMS; arm++) {
      const steps = 34

      g.moveTo(x, y)

      for (let step = 1; step <= steps; step++) {
        const share = step / steps
        const angle = -elapsed * 1.4 + (arm / PORTAL_ARMS) * Math.PI * 2 + share * 3.4
        const reach = HOLE_RADIUS * share ** 0.8

        g.lineTo(x + Math.cos(angle) * reach, y + Math.sin(angle) * reach)
      }

      g.stroke({ width: 15, color: arm % 2 ? PORTAL.light : PORTAL.color, alpha: 0.62 })
    }

    // Waves falling to the middle.
    for (let wave = 0; wave < 3; wave++) {
      const share = 1 - ((elapsed * 0.45 + wave / 3) % 1)

      g.circle(x, y, HOLE_RADIUS * share).stroke({ width: 5, color: PORTAL.light, alpha: (1 - share) * 0.7 })
    }

    g.circle(x, y, 74 + breath * 10).fill({ color: PORTAL.light, alpha: 0.5 })
    g.circle(x, y, 46 + breath * 8).fill({ color: PORTAL.core, alpha: 0.8 })

    this.drawSuckedMotes(elapsed)
    this.drawRingGems(breath)
  }

  /** The four great gems of the ring, burning. */
  private drawRingGems(breath: number): void {
    for (let gem = 0; gem < 4; gem++) {
      const angle = (gem * Math.PI) / 2
      const gx = this.gate.x + Math.cos(angle) * RING_RADIUS * 0.82
      const gy = this.gate.y + Math.sin(angle) * RING_RADIUS * 0.82

      this.air.circle(gx, gy, 66 + breath * 12).fill({ color: PORTAL.color, alpha: 0.16 + breath * 0.1 })
      this.air.circle(gx, gy, 36 + breath * 8).fill({ color: PORTAL.light, alpha: 0.16 + breath * 0.12 })
    }
  }

  /** Motes pulled from around the ring into its middle, faster the closer they get. */
  private drawSuckedMotes(elapsed: number): void {
    const { x, y } = this.gate

    for (let index = 0; index < PORTAL_MOTES; index++) {
      const life = (elapsed * 0.26 + ((index * 0.618) % 1)) % 1
      const pull = 1 - life ** 2
      const angle = index * 2.399 + life * 4 + elapsed * 0.3
      const reach = (RING_RADIUS + 190) * pull
      const mx = x + Math.cos(angle) * reach
      const my = y + Math.sin(angle) * reach * 0.86
      const alpha = Math.min(1, life * 5) * Math.min(1, pull * 3) * 0.9
      const size = 4 + (index % 3) * 2.5

      this.air.circle(mx, my, size * 2.2).fill({ color: PORTAL.color, alpha: alpha * 0.28 })
      this.air.circle(mx, my, size).fill({ color: index % 3 ? PORTAL.light : PORTAL.core, alpha })
    }
  }

  /** A column of light up from the ring, seen over the fog: red while shut, violet open; gone once Crisol falls. */
  private drawPortalBeam(elapsed: number): void {
    if (this.crisolDown) {
      return
    }

    const { x, y } = this.gate
    const { color, light } = this.open ? PORTAL : SEALED
    const breath = (Math.sin(elapsed * 1.3) + 1) / 2
    const strength = this.open ? 1 : 0.65
    const steps = 18
    const top = y - RING_RADIUS + 30

    for (let step = 0; step < steps; step++) {
      const share = step / steps
      const width = PORTAL_BEAM.width * (1 - share * 0.6)
      const alpha = (1 - share) * (0.16 + breath * 0.08) * strength

      this.sky
        .rect(x - width / 2, top - (share + 1 / steps) * PORTAL_BEAM.height, width, PORTAL_BEAM.height / steps)
        .fill({ color, alpha })
      this.sky
        .rect(x - width / 6, top - (share + 1 / steps) * PORTAL_BEAM.height, width / 3, PORTAL_BEAM.height / steps)
        .fill({ color: light, alpha: alpha * 0.9 })
    }
  }

  /** The heart of Crisol, beating: its fire on the ground, the waves it sends, the embers and its glow over the fog. */
  private drawForge(elapsed: number): void {
    const { x, y } = this.crisol
    const beat = beatAt(elapsed)
    const g = this.ground

    g.ellipse(x, y, FORGE_RADIUS * 1.2, FORGE_RADIUS * 1.2 * SQUASH).fill({
      color: FORGE.color,
      alpha: 0.14 + beat * 0.2
    })
    g.ellipse(x, y, FORGE_RADIUS, FORGE_RADIUS * SQUASH).stroke({
      width: 10,
      color: FORGE.light,
      alpha: 0.6 + beat * 0.4
    })
    g.ellipse(x, y, FORGE_RADIUS * 0.76, FORGE_RADIUS * 0.76 * SQUASH).stroke({
      width: 5,
      color: FORGE.color,
      alpha: 0.6 + beat * 0.4
    })

    for (let ray = 0; ray < 16; ray++) {
      const angle = -elapsed * 0.22 + (ray / 16) * Math.PI * 2
      const from = FORGE_RADIUS * 0.8
      const to = FORGE_RADIUS * (ray % 2 ? 0.96 : 1.34 + beat * 0.12)

      g.moveTo(x + Math.cos(angle) * from, y + Math.sin(angle) * from * SQUASH)
        .lineTo(x + Math.cos(angle) * to, y + Math.sin(angle) * to * SQUASH)
        .stroke({ width: 6, color: FORGE.light, alpha: 0.45 + beat * 0.4 })
    }

    // The waves leaving with each beat, over the ground.
    for (let wave = 0; wave < BEAT_WAVES; wave++) {
      const age = ((elapsed + wave * BEAT) % (BEAT * BEAT_WAVES)) / (BEAT * BEAT_WAVES)
      const reach = FORGE_RADIUS * (1 + age * 3)

      g.ellipse(x, y, reach, reach * SQUASH).stroke({ width: 12, color: FORGE.color, alpha: (1 - age) ** 2 * 0.55 })
    }

    for (let index = 0; index < EMBERS; index++) {
      const life = (elapsed * 0.17 + ((index * 0.618) % 1)) % 1
      const angle = index * 2.399
      const reach = EMBERS_REACH * (0.08 + ((index * 7) % 13) / 13)
      const mx = x + Math.cos(angle) * reach + Math.sin(elapsed * 1.5 + index) * 18
      const my = y + Math.sin(angle) * reach * 0.6 - life * 300
      const alpha = Math.sin(life * Math.PI) * 0.95
      const size = 2 + (index % 3) * 1.2

      this.air.circle(mx, my, size * 2).fill({ color: FORGE.color, alpha: alpha * 0.3 })
      this.air.circle(mx, my, size).fill({ color: index % 4 ? FORGE.light : FORGE.core, alpha })
    }

    // Over the fog: the glow of the heart, seen from far.
    for (const [radius, alpha] of [
      [430, 0.05],
      [300, 0.07],
      [190, 0.1]
    ]) {
      this.sky.circle(x, y - 40, radius + beat * 60).fill({ color: FORGE.color, alpha: alpha + beat * 0.08 })
    }
  }
}
