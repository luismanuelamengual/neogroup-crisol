import { Application, Assets, Container, Graphics, Sprite, Texture } from 'pixi.js'
import { Viewport } from 'pixi-viewport'
import { artUrl, loadArtManifest } from '@/app/(protected)/(art)/utils/art'
import { World } from '@/app/(protected)/(engine)/models/World'
import { WorldNode } from '@/app/(protected)/(engine)/models/WorldNode'
import { createNoise } from '@/app/(protected)/(engine)/utils/noise'
import { createRandom } from '@/app/(protected)/(engine)/utils/random'
import { BIOME_GROUND, darken, markerOf, MarkerStyle } from '@/app/(protected)/(world)/utils/mapStyle'

/** What the map shows: it comes from the game state (see WorldMap). */
export interface MapView {
  /** Cleared points: the party walks through them and the fog is lifted around them. */
  cleared: Set<string>
  /** Points seen (cleared ones and their neighbors, the latter as silhouettes). */
  revealed: Set<string>
  respawned: Set<string>
  /** Points the party can travel to now (see getReachableNodeIds). */
  reachable: Set<string>
  openCamps: Set<string>
  positionNodeId: string
  selectedNodeId: string | null
  /** Route to the selected point, highlighted. */
  route: string[] | null
}

/** World pixels per pixel of the background texture. */
const GROUND_SCALE = 20
/** World pixels per pixel of the fog mask. */
const FOG_SCALE = 16
/** Radius of the clear area around a cleared point, and of the half-clear one around a silhouette. */
const CLEAR_RADIUS = 620
const SILHOUETTE_RADIUS = 300
/** Walking speed of the hero, in world pixels per second. */
const WALK_SPEED = 1500
/** Distance between the dots of a trail. */
const TRAIL_DOT_GAP = 38
const MAX_ZOOM = 1.6
/** Zoom when the map opens. */
const START_ZOOM = 0.32
/** Taps this far (in screen pixels) from a point still select it. */
const TAP_RADIUS = 28
const TRAIL_EDGE = 0x1a120c
const TRAIL_DOT = 0xf3e2b3
const ROUTE_DOT = 0xffc233
/** Ring, sonar wave and arrow over the new destinations (points within reach with a fight or something to find). */
const BEACON = 0xffc233
/** Points seen but out of reach: darker, see-through and with a padlock. */
const OUT_OF_REACH_SHADE = 0.4
const OUT_OF_REACH_ALPHA = 0.55
const LOCK = 0x8a8195
const OUTLINE = 0x0a0710
/** Map decorations: how many around each point, how far from it, their size and the room kept free for points and trails. */
const DECORATIONS_PER_NODE = 2
const DECORATION_RING = [70, 150]
const DECORATION_SIZE = [70, 120]
const DECORATION_CLEARANCE = 46
const FOG = 'rgba(7, 4, 13, 0.95)'

/**
 * The world map drawn with PixiJS: a background colored by biome, the known
 * trails, the points, the fog and the hero, inside a viewport with drag,
 * pinch and wheel zoom. Plain TypeScript, wrapped by the WorldMap component.
 */
export class WorldRenderer {
  private readonly nodes: Map<string, WorldNode>
  private readonly decorations = new Container()
  private readonly trails = new Graphics()
  private readonly route = new Graphics()
  private readonly markers = new Graphics()
  private readonly outOfReach = new Graphics()
  private readonly beacons = new Graphics()
  private readonly selection = new Graphics()
  private readonly hero = new Container()
  private readonly fogCanvas: HTMLCanvasElement
  private readonly fogTexture: Texture
  private view: MapView | null = null
  private walking = false
  private elapsed = 0
  /** Follows the size of the element (it can change without the window doing so, e.g. panels below it). */
  private resizeObserver: ResizeObserver | null = null

  private constructor(
    private readonly app: Application,
    private readonly viewport: Viewport,
    private readonly world: World,
    onTap: (nodeId: string | null) => void
  ) {
    this.nodes = new Map(world.nodes.map((node) => [node.id, node]))

    const ground = new Sprite(Texture.from(this.paintGround()))

    ground.scale.set(GROUND_SCALE)

    this.fogCanvas = document.createElement('canvas')
    this.fogCanvas.width = Math.ceil(world.width / FOG_SCALE)
    this.fogCanvas.height = Math.ceil(world.height / FOG_SCALE)
    this.fogTexture = Texture.from(this.fogCanvas)

    const fog = new Sprite(this.fogTexture)

    fog.scale.set(FOG_SCALE)
    this.drawHero()
    this.outOfReach.alpha = OUT_OF_REACH_ALPHA
    viewport.addChild(
      ground,
      this.decorations,
      this.trails,
      this.route,
      this.outOfReach,
      this.markers,
      fog,
      this.beacons,
      this.selection,
      this.hero
    )

    viewport.on('clicked', ({ world: point }) => onTap(this.nodeAt(point.x, point.y)))
    app.ticker.add((ticker) => this.animate(ticker.deltaMS))
  }

  /** Creates the map inside an element (it takes its size and follows it). */
  static async create(
    element: HTMLElement,
    world: World,
    onTap: (nodeId: string | null) => void
  ): Promise<WorldRenderer> {
    const app = new Application()

    await app.init({
      resizeTo: element,
      background: '#0d0806',
      antialias: true,
      autoDensity: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2)
    })
    element.appendChild(app.canvas)

    const viewport = new Viewport({
      screenWidth: app.screen.width,
      screenHeight: app.screen.height,
      worldWidth: world.width,
      worldHeight: world.height,
      events: app.renderer.events
    })

    app.stage.addChild(viewport)
    viewport.drag().pinch().wheel({ smooth: 4 }).decelerate({ friction: 0.92 })

    const renderer = new WorldRenderer(app, viewport, world, onTap)

    renderer.resizeObserver = new ResizeObserver(() => app.resize())
    renderer.resizeObserver.observe(element)

    renderer.fitZoom()
    viewport.setZoom(START_ZOOM, true)
    void renderer.addDecorations()
    app.renderer.on('resize', (width: number, height: number) => {
      viewport.resize(width, height)
      renderer.fitZoom()
      renderer.centerOnHero()
    })

    return renderer
  }

  /**
   * Scatters the decorations of each biome (trees, rocks, ruins) around its
   * points, the same every time, never on a point or a trail. Only for the
   * biomes whose decoration sheet exists (see `yarn art`).
   */
  private async addDecorations(): Promise<void> {
    const { decorations } = await loadArtManifest()
    const textures = new Map<string, Texture[]>()

    for (const [biome, ids] of Object.entries(decorations)) {
      const loaded = await Promise.all(ids.map((id) => Assets.load<Texture>(artUrl(id)).catch(() => null)))

      textures.set(
        biome,
        loaded.filter((texture): texture is Texture => !!texture)
      )
    }

    if (textures.size === 0 || this.decorations.destroyed) {
      return
    }

    const random = createRandom(this.world.seed ^ 0x5eed)
    const segments = this.world.edges.map(([a, b]) => [this.nodes.get(a)!, this.nodes.get(b)!])
    const isFree = (x: number, y: number) =>
      this.world.nodes.every((node) => Math.hypot(node.x - x, node.y - y) > DECORATION_CLEARANCE * 1.4) &&
      segments.every(([a, b]) => distanceToSegment(x, y, a, b) > DECORATION_CLEARANCE)
    const sprites: Sprite[] = []

    for (const node of this.world.nodes) {
      const choices = textures.get(node.biome)

      for (let index = 0; index < DECORATIONS_PER_NODE; index++) {
        const angle = random() * Math.PI * 2
        const radius = DECORATION_RING[0] + random() * (DECORATION_RING[1] - DECORATION_RING[0])
        const x = node.x + Math.cos(angle) * radius
        const y = node.y + Math.sin(angle) * radius
        const texture = choices?.[Math.floor(random() * choices.length)]
        const size = DECORATION_SIZE[0] + random() * (DECORATION_SIZE[1] - DECORATION_SIZE[0])

        if (!texture || !isFree(x, y)) {
          continue
        }

        const sprite = new Sprite(texture)

        sprite.anchor.set(0.5, 0.9)
        sprite.position.set(x, y)
        sprite.scale.set(size / Math.max(texture.width, texture.height))
        sprite.scale.x *= random() < 0.5 ? -1 : 1
        sprites.push(sprite)
      }
    }

    // The lower ones in front.
    sprites.sort((a, b) => a.y - b.y)
    this.decorations.addChild(...sprites)
  }

  /** Zoom limits: from the whole world on screen to the detail of a trail. */
  private fitZoom(): void {
    const minScale = Math.min(this.app.screen.width / this.world.width, this.app.screen.height / this.world.height)

    this.viewport.clampZoom({ minScale, maxScale: MAX_ZOOM })
    this.viewport.clamp({ direction: 'all', underflow: 'center' })
  }

  destroy(): void {
    this.resizeObserver?.disconnect()
    // The decorations first, keeping their textures: they are shared through the asset cache.
    this.decorations.destroy({ children: true })
    // Not `true`: that also releases resources shared with the other PixiJS apps of the page.
    this.app.destroy({ removeView: true }, { children: true, texture: true })
  }

  /** Draws the map for a new state of the game. */
  update(view: MapView): void {
    const previous = this.view

    this.view = view

    if (!previous || previous.cleared !== view.cleared || previous.respawned !== view.respawned) {
      this.drawTrails(view)
      this.drawMarkers(view)
      this.drawFog(view)
    } else if (previous.reachable !== view.reachable) {
      this.drawTrails(view)
      this.drawMarkers(view)
    } else if (previous.openCamps !== view.openCamps) {
      this.drawMarkers(view)
    }

    this.drawRoute(view.route)

    if (!this.walking) {
      const node = this.nodes.get(view.positionNodeId)!

      this.hero.position.set(node.x, node.y)
    }
  }

  /** Moves the camera to a point. */
  centerOn(nodeId: string, animate = true): void {
    const node = this.nodes.get(nodeId)!

    if (animate) {
      this.viewport.animate({
        position: { x: node.x, y: node.y },
        time: 600,
        ease: 'easeInOutSine',
        removeOnInterrupt: true
      })
    } else {
      this.viewport.moveCenter(node.x, node.y)
    }
  }

  centerOnHero(): void {
    this.viewport.moveCenter(this.hero.position.x, this.hero.position.y)
  }

  /** Walks the hero along a route (node ids, from the current one); resolves when it arrives. */
  walk(route: string[]): Promise<void> {
    const points = route.map((id) => this.nodes.get(id)!)

    this.walking = true
    this.viewport.follow(this.hero, {
      radius: Math.min(this.app.screen.width, this.app.screen.height) / (3 * this.viewport.scale.x)
    })

    return new Promise((resolve) => {
      let segment = 0
      let travelled = 0

      const step = (ticker: { deltaMS: number }) => {
        travelled += (WALK_SPEED * ticker.deltaMS) / 1000

        while (segment < points.length - 1) {
          const from = points[segment]
          const to = points[segment + 1]
          const length = Math.hypot(to.x - from.x, to.y - from.y)

          if (travelled < length) {
            const share = travelled / length

            this.hero.position.set(from.x + (to.x - from.x) * share, from.y + (to.y - from.y) * share)

            return
          }

          travelled -= length
          segment++
        }

        const last = points[points.length - 1]

        this.hero.position.set(last.x, last.y)
        this.app.ticker.remove(step)
        this.viewport.plugins.remove('follow')
        this.walking = false
        resolve()
      }

      this.app.ticker.add(step)
    })
  }

  /** The revealed point under a tap, if any. */
  private nodeAt(x: number, y: number): string | null {
    const reach = TAP_RADIUS / this.viewport.scale.x
    let best: string | null = null
    let bestDistance = Infinity

    for (const id of this.view?.revealed ?? []) {
      const node = this.nodes.get(id)!
      const distance = Math.hypot(node.x - x, node.y - y)
      const radius = Math.max(reach, markerOf(node, false, false).radius * 1.4)

      if (distance <= radius && distance < bestDistance) {
        best = id
        bestDistance = distance
      }
    }

    return best
  }

  /** Background: every pixel takes the biome of its closest point, shaded with noise; far from the points, darker. */
  private paintGround(): HTMLCanvasElement {
    const width = Math.ceil(this.world.width / GROUND_SCALE)
    const height = Math.ceil(this.world.height / GROUND_SCALE)
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')!
    const image = context.createImageData(width, height)
    const noise = createNoise(createRandom(this.world.seed), 4)
    const cell = 400
    const columns = Math.ceil(this.world.width / cell)
    const buckets = new Map<number, WorldNode[]>()
    const rgb = Object.fromEntries(
      Object.entries(BIOME_GROUND).map(([biome, hex]) => [
        biome,
        [1, 3, 5].map((at) => parseInt(hex.slice(at, at + 2), 16))
      ])
    )

    for (const node of this.world.nodes) {
      const key = Math.floor(node.y / cell) * columns + Math.floor(node.x / cell)

      buckets.set(key, [...(buckets.get(key) ?? []), node])
    }

    for (let py = 0; py < height; py++) {
      for (let px = 0; px < width; px++) {
        const x = px * GROUND_SCALE
        const y = py * GROUND_SCALE
        const column = Math.floor(x / cell)
        const row = Math.floor(y / cell)
        let closest: WorldNode | null = null
        let distance = Infinity

        for (let dy = -2; dy <= 2; dy++) {
          for (let dx = -2; dx <= 2; dx++) {
            for (const node of buckets.get((row + dy) * columns + column + dx) ?? []) {
              const d = Math.hypot(node.x - x, node.y - y)

              if (d < distance) {
                closest = node
                distance = d
              }
            }
          }
        }

        const color = closest ? rgb[closest.biome] : [10, 7, 16]
        const shade =
          (0.72 + 0.45 * noise(x / 700, y / 700)) * (distance > 450 ? Math.max(0.35, 1 - (distance - 450) / 700) : 1)
        const offset = (py * width + px) * 4

        image.data[offset] = Math.min(255, color[0] * shade)
        image.data[offset + 1] = Math.min(255, color[1] * shade)
        image.data[offset + 2] = Math.min(255, color[2] * shade)
        image.data[offset + 3] = 255
      }
    }

    canvas.width = width
    canvas.height = height
    context.putImageData(image, 0, 0)

    return canvas
  }

  private drawTrails(view: MapView): void {
    this.trails.clear()

    for (const [a, b] of this.world.edges) {
      if (!view.cleared.has(a) && !view.cleared.has(b)) {
        continue
      }

      const from = this.nodes.get(a)!
      const to = this.nodes.get(b)!
      const known = view.cleared.has(a) && view.cleared.has(b)
      // A trail the party can take: both ends within reach (or where it stands).
      const open = [a, b].every((id) => id === view.positionNodeId || view.reachable.has(id))

      this.trails
        .moveTo(from.x, from.y)
        .lineTo(to.x, to.y)
        .stroke({ width: 30, color: TRAIL_EDGE, alpha: open ? 0.75 : 0.3, cap: 'round' })
      this.dots(this.trails, from, to, open ? TRAIL_DOT : darken(TRAIL_DOT, known ? 0.55 : 0.4), 7)
    }
  }

  private drawRoute(route: string[] | null): void {
    this.route.clear()

    for (let index = 1; index < (route?.length ?? 0); index++) {
      this.dots(this.route, this.nodes.get(route![index - 1])!, this.nodes.get(route![index])!, ROUTE_DOT, 10)
    }
  }

  private dots(graphics: Graphics, from: WorldNode, to: WorldNode, color: number, radius: number): void {
    const length = Math.hypot(to.x - from.x, to.y - from.y)
    const count = Math.max(1, Math.round(length / TRAIL_DOT_GAP))

    for (let index = 1; index < count; index++) {
      const share = index / count

      graphics.circle(from.x + (to.x - from.x) * share, from.y + (to.y - from.y) * share, radius)
    }

    graphics.fill({ color })
  }

  private drawMarkers(view: MapView): void {
    this.markers.clear()
    this.outOfReach.clear()

    for (const id of view.revealed) {
      const node = this.nodes.get(id)!
      // An enemy that came back after resting looks again like a fight not won yet.
      const cleared = view.cleared.has(id) && !view.respawned.has(id)
      const style = markerOf(node, cleared, view.openCamps.has(id))

      if (id !== view.positionNodeId && !view.reachable.has(id)) {
        this.marker(this.outOfReach, node, { ...style, color: darken(style.color, OUT_OF_REACH_SHADE) })
        this.lock(node.x + style.radius * 0.7, node.y + style.radius * 0.7)
        continue
      }

      this.marker(this.markers, node, style)
    }
  }

  /** A small padlock on the points out of reach. */
  private lock(x: number, y: number): void {
    this.markers
      .moveTo(x - 8, y - 6)
      .arc(x, y - 6, 8, Math.PI, 0)
      .stroke({ width: 7, color: OUTLINE })
      .moveTo(x - 8, y - 6)
      .arc(x, y - 6, 8, Math.PI, 0)
      .stroke({ width: 3, color: LOCK })
    this.markers
      .roundRect(x - 12, y - 6, 24, 18, 4)
      .fill({ color: LOCK })
      .stroke({ width: 4, color: OUTLINE })
    this.markers.circle(x, y + 2, 3).fill({ color: OUTLINE })
  }

  private marker(g: Graphics, node: WorldNode, { shape, color, radius }: MarkerStyle): void {
    const { x, y } = node
    const stroke = { width: Math.max(5, radius / 6), color: OUTLINE }

    switch (shape) {
      case 'diamond':
        g.poly([x, y - radius, x + radius, y, x, y + radius, x - radius, y])
          .fill({ color })
          .stroke(stroke)
        break
      case 'square':
        g.roundRect(x - radius * 0.8, y - radius * 0.8, radius * 1.6, radius * 1.6, radius / 4)
          .fill({ color })
          .stroke(stroke)
        break
      case 'drop':
        g.poly([
          x,
          y - radius * 1.2,
          x + radius * 0.75,
          y + radius * 0.1,
          x,
          y + radius * 0.8,
          x - radius * 0.75,
          y + radius * 0.1
        ])
          .fill({ color })
          .stroke(stroke)
        break
      case 'flame':
        g.circle(x, y, radius)
          .fill({ color: 0x2a1406 })
          .stroke({ ...stroke, color })
        g.poly([x, y - radius * 0.75, x + radius * 0.45, y + radius * 0.35, x - radius * 0.45, y + radius * 0.35]).fill(
          { color }
        )
        g.poly([x, y - radius * 0.25, x + radius * 0.22, y + radius * 0.3, x - radius * 0.22, y + radius * 0.3]).fill({
          color: 0xfff1c1
        })
        break
      case 'skull':
        g.circle(x, y, radius).fill({ color }).stroke(stroke)
        g.circle(x - radius * 0.35, y - radius * 0.1, radius * 0.22).fill({ color: OUTLINE })
        g.circle(x + radius * 0.35, y - radius * 0.1, radius * 0.22).fill({ color: OUTLINE })
        g.rect(x - radius * 0.3, y + radius * 0.35, radius * 0.6, radius * 0.18).fill({ color: OUTLINE })
        break
      case 'sword':
        // A blade pointing up on a dark shield.
        g.circle(x, y, radius)
          .fill({ color: 0x1a1220 })
          .stroke({ ...stroke, color })
        g.poly([
          x,
          y - radius * 0.8,
          x + radius * 0.16,
          y - radius * 0.55,
          x + radius * 0.16,
          y + radius * 0.25,
          x - radius * 0.16,
          y + radius * 0.25,
          x - radius * 0.16,
          y - radius * 0.55
        ])
          .fill({ color })
          .stroke({ width: 3, color: OUTLINE })
        g.roundRect(x - radius * 0.45, y + radius * 0.22, radius * 0.9, radius * 0.16, radius * 0.06)
          .fill({ color: 0xffc233 })
          .stroke({ width: 3, color: OUTLINE })
        g.rect(x - radius * 0.08, y + radius * 0.38, radius * 0.16, radius * 0.32).fill({ color: 0x6b3f1d })
        break
      case 'gate':
        g.roundRect(x - radius * 0.7, y - radius, radius * 1.4, radius * 1.8, radius * 0.7)
          .fill({ color })
          .stroke({ ...stroke, color: 0xa855f7 })
        break
      default:
        g.circle(x, y, radius).fill({ color }).stroke(stroke)
    }
  }

  /** Fog: a low resolution mask, cleared around each cleared point and half-cleared around the silhouettes. */
  private drawFog(view: MapView): void {
    const context = this.fogCanvas.getContext('2d')!

    context.globalCompositeOperation = 'source-over'
    context.clearRect(0, 0, this.fogCanvas.width, this.fogCanvas.height)
    context.fillStyle = FOG
    context.fillRect(0, 0, this.fogCanvas.width, this.fogCanvas.height)
    context.globalCompositeOperation = 'destination-out'

    for (const id of view.revealed) {
      const node = this.nodes.get(id)!
      const cleared = view.cleared.has(id)
      const radius = (cleared ? CLEAR_RADIUS : SILHOUETTE_RADIUS) / FOG_SCALE
      const x = node.x / FOG_SCALE
      const y = node.y / FOG_SCALE
      const gradient = context.createRadialGradient(x, y, 0, x, y, radius)

      gradient.addColorStop(0, `rgba(0, 0, 0, ${cleared ? 1 : 0.6})`)
      gradient.addColorStop(cleared ? 0.55 : 0.4, `rgba(0, 0, 0, ${cleared ? 0.9 : 0.45})`)
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)')
      context.fillStyle = gradient
      context.fillRect(x - radius, y - radius, radius * 2, radius * 2)
    }

    this.fogTexture.source.update()
  }

  private drawHero(): void {
    const body = new Graphics()

    body.circle(0, 0, 40).fill({ color: OUTLINE, alpha: 0.35 })
    body
      .poly([0, -58, 30, -20, 26, 22, 0, 40, -26, 22, -30, -20])
      .fill({ color: 0x241711 })
      .stroke({ width: 7, color: 0xe8b85a })
    body.poly([0, -34, 14, 4, 0, 22, -14, 4]).fill({ color: 0xff8a00 })
    this.hero.addChild(body)
  }

  /**
   * The new destinations (within reach, with a fight or something to find): a
   * golden ring, a wave that grows from it and an arrow bouncing above it, over
   * the fog so they are seen from far.
   */
  private drawBeacons(pulse: number): void {
    this.beacons.clear()

    if (!this.view || this.walking) {
      return
    }

    const wave = (this.elapsed * 0.8) % 1
    const bounce = Math.abs(Math.sin(this.elapsed * 3)) * 12

    for (const id of this.view.reachable) {
      if (this.view.cleared.has(id) && !this.view.respawned.has(id)) {
        continue
      }

      const node = this.nodes.get(id)!
      const radius = markerOf(node, false, this.view.openCamps.has(id)).radius
      const ring = radius + 12 + pulse * 3
      const top = node.y - radius - 30 - bounce

      this.beacons.circle(node.x, node.y, ring).stroke({ width: 8, color: BEACON, alpha: 0.9 })
      this.beacons
        .circle(node.x, node.y, ring + wave * radius * 1.4)
        .stroke({ width: 5, color: BEACON, alpha: (1 - wave) * 0.6 })
      this.beacons
        .poly([node.x - 22, top - 24, node.x + 22, top - 24, node.x, top])
        .fill({ color: BEACON })
        .stroke({ width: 5, color: OUTLINE })
    }
  }

  /** Small life: the hero breathes, the selected point pulses and the new destinations call. */
  private animate(deltaMS: number): void {
    this.elapsed += deltaMS / 1000

    const pulse = Math.sin(this.elapsed * 4)

    this.hero.scale.set(1 + pulse * 0.04)
    this.drawBeacons(pulse)
    this.selection.clear()

    const selected = this.view?.selectedNodeId ? this.nodes.get(this.view.selectedNodeId) : null

    if (selected) {
      const radius = markerOf(selected, false, this.view!.openCamps.has(selected.id)).radius + 18 + pulse * 4

      this.selection.circle(selected.x, selected.y, radius).stroke({ width: 7, color: 0xffffff, alpha: 0.85 })
    }
  }
}

/** Distance from a point to the segment between two points of the map. */
function distanceToSegment(x: number, y: number, a: WorldNode, b: WorldNode): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const length = dx * dx + dy * dy
  const t = length === 0 ? 0 : Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / length))

  return Math.hypot(a.x + t * dx - x, a.y + t * dy - y)
}
