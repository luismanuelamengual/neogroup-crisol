import { Application, Container, Graphics, Sprite, Texture, WebGLRenderer } from 'pixi.js'
import { Viewport } from 'pixi-viewport'
import { TileMap } from '@/app/(protected)/(engine)/models/TileMap'
import { World } from '@/app/(protected)/(engine)/models/World'
import { WorldNode } from '@/app/(protected)/(engine)/models/WorldNode'
import { placeScenery } from '@/app/(protected)/(engine)/utils/scenery'
import { buildTileMap } from '@/app/(protected)/(engine)/utils/tileMap'
import { darken, markerOf, MarkerStyle } from '@/app/(protected)/(world)/utils/mapStyle'
import { loadMerchantHouses } from '@/app/(protected)/(world)/utils/merchantHouses'
import { loadSceneryArt, paintSceneryTextures, paintShadow } from '@/app/(protected)/(world)/utils/sceneryTextures'
import { loadGroundArt, paintGroundTextures } from '@/app/(protected)/(world)/utils/terrainTextures'
import { WorldGround } from '@/app/(protected)/(world)/utils/worldGround'
import { WorldLairs } from '@/app/(protected)/(world)/utils/worldLairs'
import { WorldScenery } from '@/app/(protected)/(world)/utils/worldScenery'
import { buildLairTextures, buildZoneTextures, loadZoneArt } from '@/app/(protected)/(world)/utils/zoneTextures'

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
  /** Point where the experience lost in the last defeat waits (see GameState.lostXp). */
  lostXpNodeId?: string | null
}

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
/** The lost experience waiting at a point: a glowing orb floating over it, with sparks around. */
const LOST_XP = 0x4fc3ff
const LOST_XP_CORE = 0xe6f8ff
/** Height of the building of each merchant, standing on its point in place of its marker (the door just behind the hero). */
const HOUSE_HEIGHT = 170
const FOG = 'rgba(7, 4, 13, 0.95)'

/** How the map is drawn. */
export interface WorldRendererOptions {
  /** Covers what the party has not seen yet (true by default; off to review the whole map). */
  fog?: boolean
}

/**
 * The world map drawn with PixiJS: the ground made of tiles, the known
 * trails, the points, the fog and the hero, inside a viewport with drag,
 * pinch and wheel zoom. Plain TypeScript, wrapped by the WorldMap component.
 */
export class WorldRenderer {
  private readonly nodes: Map<string, WorldNode>
  private readonly tiles: TileMap
  private readonly ground: WorldGround
  private readonly scenery: WorldScenery
  private readonly lairs: WorldLairs
  private readonly trails = new Graphics()
  private readonly route = new Graphics()
  private readonly markers = new Graphics()
  private readonly outOfReach = new Graphics()
  private readonly beacons = new Graphics()
  private readonly lostXp = new Graphics()
  private readonly selection = new Graphics()
  private readonly hero = new Container()
  private readonly fogCanvas: HTMLCanvasElement
  private readonly fogTexture: Texture
  private view: MapView | null = null
  /** The building of each merchant, by point. */
  private readonly houses = new Map<string, Sprite>()
  private walking = false
  private elapsed = 0
  /** Follows the size of the element (it can change without the window doing so, e.g. panels below it). */
  private resizeObserver: ResizeObserver | null = null

  private constructor(
    private readonly app: Application,
    private readonly viewport: Viewport,
    private readonly world: World,
    onTap: (nodeId: string | null) => void,
    private readonly options: WorldRendererOptions = {}
  ) {
    this.nodes = new Map(world.nodes.map((node) => [node.id, node]))

    this.tiles = buildTileMap(world)
    // Without WebGL 2 the ground is only the picture from far (its shader needs it).
    this.ground = new WorldGround(
      this.tiles,
      paintGroundTextures(),
      (app.renderer as WebGLRenderer).context?.webGLVersion === 2
    )

    this.fogCanvas = document.createElement('canvas')
    this.fogCanvas.width = Math.ceil(world.width / FOG_SCALE)
    this.fogCanvas.height = Math.ceil(world.height / FOG_SCALE)
    this.fogTexture = Texture.from(this.fogCanvas)

    const fog = new Sprite(this.fogTexture)

    fog.scale.set(FOG_SCALE)
    fog.visible = options.fog !== false
    this.drawHero()
    this.scenery = new WorldScenery(world.width, this.hero, paintShadow())
    this.lairs = new WorldLairs(world, this.tiles)

    const provisional = paintSceneryTextures()

    this.scenery.setItems(placeScenery(world, this.tiles), provisional, buildZoneTextures(provisional, new Map()))
    this.outOfReach.alpha = OUT_OF_REACH_ALPHA
    // The trees, the landmarks and the hero stand over the trails and the points, sorted by depth.
    viewport.addChild(
      this.ground,
      this.scenery.ground,
      this.lairs.circles,
      this.trails,
      this.route,
      this.outOfReach,
      this.markers,
      this.scenery.shadows,
      this.scenery.standing,
      this.lairs.motes,
      fog,
      this.lairs.beams,
      this.beacons,
      this.lostXp,
      this.selection
    )

    viewport.on('clicked', ({ world: point }) => onTap(this.nodeAt(point.x, point.y)))
    app.ticker.add((ticker) => this.animate(ticker.deltaMS))
  }

  /** Creates the map inside an element (it takes its size and follows it). */
  static async create(
    element: HTMLElement,
    world: World,
    onTap: (nodeId: string | null) => void,
    options: WorldRendererOptions = {}
  ): Promise<WorldRenderer> {
    const app = new Application()

    await app.init({
      resizeTo: element,
      background: '#0d0806',
      antialias: true,
      autoDensity: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      // The ground is drawn by a WebGL shader (see groundShader.ts).
      preference: 'webgl'
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

    const renderer = new WorldRenderer(app, viewport, world, onTap, options)

    renderer.resizeObserver = new ResizeObserver(() => app.resize())
    renderer.resizeObserver.observe(element)

    renderer.fitZoom()
    viewport.setZoom(START_ZOOM, true)
    void renderer.addMerchantHouses()
    void renderer.loadGroundArt()
    void renderer.loadSceneryArt()
    app.renderer.on('resize', (width: number, height: number) => {
      viewport.resize(width, height)
      renderer.fitZoom()
      renderer.centerOnHero()
    })

    return renderer
  }

  /** A house, tent or tower beside each merchant, so that the place reads from far. */
  private async addMerchantHouses(): Promise<void> {
    const houses = await loadMerchantHouses()

    if (this.scenery.standing.destroyed) {
      return
    }

    for (const node of this.world.nodes) {
      if (!node.merchant) {
        continue
      }

      const sprite = new Sprite(houses[node.merchant])

      sprite.anchor.set(0.5, 0.96)
      sprite.scale.set(HOUSE_HEIGHT / sprite.texture.height)
      sprite.position.set(node.x, node.y - 2)
      this.scenery.add(sprite)
      this.houses.set(node.id, sprite)
    }

    if (this.view) {
      this.drawMarkers(this.view)
    }
  }

  /** The final art of the scenery, as far as it exists, with the drawings of the zones and the lairs made from it. */
  private async loadSceneryArt(): Promise<void> {
    const [art, extras] = await Promise.all([loadSceneryArt(paintSceneryTextures()), loadZoneArt()])

    if (this.scenery.standing.destroyed) {
      return
    }

    const zones = buildZoneTextures(art, extras)

    this.scenery.setItems(placeScenery(this.world, this.tiles), art, zones)

    this.lairs.setTextures((zone) => buildLairTextures(zones, extras, zone), this.scenery)
  }

  /** The final art of the terrains, as far as it exists (the provisional textures stay otherwise). */
  private async loadGroundArt(): Promise<void> {
    const art = await loadGroundArt(paintGroundTextures())

    if (art && !this.ground.destroyed) {
      this.ground.setTextures(art)
    }
  }

  /** Zoom limits: from the whole world on screen to the detail of a trail. */
  private fitZoom(): void {
    const minScale = Math.min(this.app.screen.width / this.world.width, this.app.screen.height / this.world.height)

    this.viewport.clampZoom({ minScale, maxScale: MAX_ZOOM })
    this.viewport.clamp({ direction: 'all', underflow: 'center' })
  }

  destroy(): void {
    this.resizeObserver?.disconnect()
    // The scenery first, keeping its textures: they are shared through the asset cache.
    this.scenery.destroy()
    this.lairs.destroy()
    // Not `true`: that also releases resources shared with the other PixiJS apps of the page.
    this.app.destroy({ removeView: true }, { children: true, texture: true })
  }

  /** Draws the map for a new state of the game. */
  update(view: MapView): void {
    const previous = this.view

    this.view = view

    if (!previous || previous.cleared !== view.cleared || previous.respawned !== view.respawned) {
      this.lairs.setFreed(view.cleared)
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
      const house = this.houses.get(id)
      const reachable = id === view.positionNodeId || view.reachable.has(id)

      if (house) {
        // The building is the marker: darker out of reach.
        house.tint = reachable ? 0xffffff : darken(0xffffff, OUT_OF_REACH_SHADE + 0.25)

        if (!reachable) {
          this.lock(node.x + style.radius * 0.7, node.y + style.radius * 0.7)
        }

        continue
      }

      if (!reachable) {
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
    if (this.options.fog === false) {
      return
    }

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

      // Where the lost experience waits, its orb floats in place of the arrow.
      if (id !== this.view.lostXpNodeId) {
        this.beacons
          .poly([node.x - 22, top - 24, node.x + 22, top - 24, node.x, top])
          .fill({ color: BEACON })
          .stroke({ width: 5, color: OUTLINE })
      }
    }
  }

  /**
   * The experience lost in the last defeat, where it waits: a glowing orb
   * bobbing over the point with sparks circling it, over the fog so it is seen
   * from far (the party walked there, so the point is always known).
   */
  private drawLostXp(): void {
    this.lostXp.clear()

    const id = this.view?.lostXpNodeId
    const node = id ? this.nodes.get(id) : null

    if (!node) {
      return
    }

    const glow = (Math.sin(this.elapsed * 2.5) + 1) / 2
    const radius = markerOf(node, false, this.view!.openCamps.has(node.id)).radius
    const x = node.x
    const y = node.y - radius - 58 + Math.sin(this.elapsed * 2) * 8
    const orb = 20

    // A soft beam from the orb down to the point.
    this.lostXp
      .poly([x - orb * 0.6, y, x + orb * 0.6, y, x + radius * 0.8, node.y, x - radius * 0.8, node.y])
      .fill({ color: LOST_XP, alpha: 0.12 + glow * 0.08 })

    // The halo, the orb and its bright core.
    for (const [extra, alpha] of [
      [26, 0.12],
      [16, 0.2],
      [8, 0.32]
    ]) {
      this.lostXp.circle(x, y, orb + extra + glow * 6).fill({ color: LOST_XP, alpha })
    }

    this.lostXp.circle(x, y, orb).fill({ color: LOST_XP }).stroke({ width: 5, color: OUTLINE })
    this.lostXp.circle(x - orb * 0.25, y - orb * 0.25, orb * 0.45).fill({ color: LOST_XP_CORE, alpha: 0.9 })

    // Sparks circling it.
    for (let spark = 0; spark < 4; spark++) {
      const angle = this.elapsed * 1.6 + (spark * Math.PI) / 2
      const sx = x + Math.cos(angle) * (orb + 22)
      const sy = y + Math.sin(angle) * (orb + 12)
      const size = 5 + ((spark + Math.floor(this.elapsed * 3)) % 2) * 2

      this.lostXp
        .poly([sx, sy - size * 1.6, sx + size * 0.5, sy, sx, sy + size * 1.6, sx - size * 0.5, sy])
        .fill({ color: LOST_XP_CORE, alpha: 0.95 })
      this.lostXp
        .poly([sx - size * 1.6, sy, sx, sy + size * 0.5, sx + size * 1.6, sy, sx, sy - size * 0.5])
        .fill({ color: LOST_XP_CORE, alpha: 0.95 })
    }
  }

  /** Small life: the hero breathes, the selected point pulses and the new destinations call. */
  private animate(deltaMS: number): void {
    this.elapsed += deltaMS / 1000

    const pulse = Math.sin(this.elapsed * 4)
    const visible = this.viewport.getVisibleBounds()

    this.ground.update(visible)
    this.scenery.update(visible, this.elapsed)
    this.lairs.update(this.elapsed)
    this.hero.scale.set(1 + pulse * 0.04)
    this.drawBeacons(pulse)
    this.drawLostXp()
    this.selection.clear()

    const selected = this.view?.selectedNodeId ? this.nodes.get(this.view.selectedNodeId) : null

    if (selected) {
      const radius = markerOf(selected, false, this.view!.openCamps.has(selected.id)).radius + 18 + pulse * 4

      this.selection.circle(selected.x, selected.y, radius).stroke({ width: 7, color: 0xffffff, alpha: 0.85 })
    }
  }
}
