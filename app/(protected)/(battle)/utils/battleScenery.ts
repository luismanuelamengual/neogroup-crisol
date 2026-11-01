import { BlurFilter, Container, Graphics, MeshPlane, Sprite, Texture } from 'pixi.js'
import {
  BiomeLook,
  LandscapePlan,
  LOOKS,
  Mood,
  ParticleKind,
  planLandscape
} from '@/app/(protected)/(battle)/utils/battleLandscape'
import {
  drawCelestial,
  drawCloud,
  drawLandmark,
  drawRange,
  mix
} from '@/app/(protected)/(battle)/utils/landscapeShapes'
import { Biome } from '@/app/(protected)/(engine)/models/Biome'
import { hashText } from '@/app/(protected)/(engine)/utils/encounters'
import { createRandom, Random } from '@/app/(protected)/(engine)/utils/random'

/** The painted pieces of a biome's landscape: its bands (far, middle, near; null if missing) and landmarks. */
export interface LandscapeArt {
  bands: (Texture | null)[]
  landmarks: Texture[]
}

/** A prop the scenery can place, with its height relative to the tallest one of its biome (0 to 1). */
export interface SceneryProp {
  texture: Texture
  height: number
  /** Big enough to frame the scene as a silhouette right in front of the camera (a tree, a pillar). */
  framing: boolean
}

const PARTICLE_COLORS: Record<ParticleKind, number[]> = {
  pollen: [0xfff2b0, 0xffffff],
  fireflies: [0xd8ff7a, 0xfff0a0],
  snow: [0xffffff, 0xe8f0ff],
  embers: [0xff8a2a, 0xffc040],
  ash: [0x9a948c, 0x6a6460],
  dust: [0xe8cfa0, 0xd8b880],
  leaves: [0x8fbf4a, 0xd88a3a, 0xb8a040],
  motes: [0xffffff],
  mist: [0xffffff]
}
/** The painting covers this much more than the screen, so panning never shows its edges. */
const BACKDROP_MARGIN = 1.18
/** How far the camera can pan, as a share of the width. */
export const MAX_PAN = 0.05
/** The bands of land reach this share of the width past each side of the screen. */
const SIDE_MARGIN = 0.18
/** How much each layer of the landscape follows the camera (the fighters: 1). */
const DEPTH = { stars: 0.02, celestial: 0.03, clouds: 0.07, far: 0.12, middle: 0.2, landmark: 0.25, near: 0.3 }

/** Something placed in the scene: its spot with the camera at rest, and how much it follows the camera. */
interface Placed {
  display: Container
  x: number
  factor: number
  /** Pixels per second it drifts by itself (clouds), wrapping around the screen. */
  drift?: number
}

interface Particle {
  sprite: Sprite
  x: number
  y: number
  depth: number
  vx: number
  vy: number
  phase: number
  alpha: number
}

/** Something that pulses (glows, twinkles), turns (blades) or bobs (floating rocks). */
interface Motion {
  display: Container
  kind: 'pulse' | 'spin' | 'bob'
  base: number
  amount: number
  speed: number
  phase: number
}

/** A puff of smoke rising from a crater, over and over. */
interface Puff {
  sprite: Sprite
  x: number
  y: number
  rise: number
  size: number
  offset: number
}

/**
 * The scenery around the fighters, drawn as layers at different depths so the
 * flat screen reads as a 3D place: when the camera pans, the sky stays, the
 * far mountains barely move, the nearer hills a bit more, the ground slides
 * under the fighters and the foreground sweeps past. Each layer is hazier the
 * farther it is, and everything has a lit and a shaded side.
 *
 * Every biome has its own landscape (see LOOKS) and each point of the map gets
 * its own scene from its id (see planLandscape): the light and the sky, the
 * shapes of the land, a landmark, clouds, what lies on the ground, props in
 * the distance and behind the fighters, foreground silhouettes and what
 * floats in the air. When a biome has a final painting, it replaces the sky,
 * the land and the ground.
 */
export class BattleScenery {
  /** Behind the fighters: sky, land, haze, props and the ground with its details. */
  readonly back = new Container()
  /** In front of the fighters: foreground silhouettes, particles, light and grade. */
  readonly front = new Container()
  private readonly look: BiomeLook
  private readonly plan: LandscapePlan
  private backdrop: MeshPlane | null = null
  private backdropRows: number[] = []
  private readonly placed: Placed[] = []
  private readonly motions: Motion[] = []
  private readonly puffs: Puff[] = []
  private particles: Particle[] = []
  private readonly rays: Sprite[] = []
  private readonly owned: Texture[] = []
  private width = 0
  private height = 0
  private groundY = 0
  private horizonY = 0
  private time = 0

  constructor(
    private readonly seed: string,
    private readonly biome: Biome,
    private readonly painting: Texture | null,
    private readonly props: SceneryProp[],
    /** Small things scattered on the ground (tufts, flowers, pebbles, embers). */
    private readonly scatter: Texture[] = [],
    /** The final art of the biome's landscape, as far as it exists (the rest is drawn with shapes). */
    private readonly art: LandscapeArt = { bands: [null, null, null], landmarks: [] }
  ) {
    this.look = LOOKS[biome]
    this.plan = planLandscape(seed, biome)
  }

  private get mood(): Mood {
    return this.plan.mood
  }

  /** Whether there is a final painting (otherwise the scenery paints the landscape itself). */
  get painted(): boolean {
    return !!this.painting
  }

  /** Rebuilds the scene for the size of the stage (on start and on resize). */
  layout(width: number, height: number, groundY: number, scale: number): void {
    // The same scene every time for the same point and size.
    const random = createRandom(hashText(this.seed))

    this.width = width
    this.height = height
    this.groundY = groundY
    this.back.removeChildren().forEach((child) => child.destroy({ children: true }))
    this.front.removeChildren().forEach((child) => child.destroy({ children: true }))
    this.owned.splice(0).forEach((texture) => texture.destroy(true))
    this.placed.length = 0
    this.motions.length = 0
    this.puffs.length = 0
    this.rays.length = 0
    this.backdrop = null

    if (this.painting) {
      this.drawBackdrop(this.painting)
    } else {
      this.horizonY = groundY - Math.max(90 * scale, groundY * 0.26)
      this.drawSky(random, scale)
      this.drawClouds(random, scale)
      this.drawLand(random, scale)
      this.drawGround()
    }

    this.drawHaze()
    this.drawGroundFeatures(random, scale)
    this.drawGroundPatches(random, scale)
    this.drawProps(random, scale)
    this.drawScatter(random, scale)
    this.drawForeground(random, scale)
    this.drawParticles(random, scale)
    this.drawLight(random)
    this.update(0, 0)
  }

  /** How much something at height `y` of the screen follows the camera (1 = like the fighters). */
  factorAt(y: number): number {
    if (y <= this.horizonY) {
      return 0.15 + 0.2 * Math.max(0, y / Math.max(1, this.horizonY))
    }

    if (y <= this.groundY) {
      return 0.35 + 0.65 * ((y - this.horizonY) / Math.max(1, this.groundY - this.horizonY))
    }

    return 1 + 0.4 * Math.min(1.5, (y - this.groundY) / Math.max(1, this.height - this.groundY))
  }

  /** How big something standing at height `y` looks, next to a fighter on the ground line (1). */
  private sizeAt(y: number): number {
    if (y <= this.groundY) {
      return 0.25 + 0.75 * Math.max(0, (y - this.horizonY) / Math.max(1, this.groundY - this.horizonY))
    }

    return 1 + 0.6 * ((y - this.groundY) / Math.max(1, this.height - this.groundY))
  }

  /** Moves every layer for the camera (`cameraX`: how far it panned right, in pixels) and animates the air. */
  update(deltaMS: number, cameraX: number): void {
    this.time += deltaMS / 1000

    const seconds = deltaMS / 1000

    if (this.backdrop) {
      const positions = this.backdrop.geometry.positions
      const columns = 2
      const scale = this.backdrop.scale.x

      for (let row = 0; row < this.backdropRows.length; row++) {
        const shift = (-cameraX * this.factorAt(this.backdropRows[row])) / scale

        for (let column = 0; column < columns; column++) {
          positions[(row * columns + column) * 2] = column * this.painting!.width + shift
        }
      }

      this.backdrop.geometry.getBuffer('aPosition').update()
    }

    for (const item of this.placed) {
      if (item.drift) {
        // Drifts across and comes back from the other side.
        const span = this.width * 1.5

        item.x = ((((item.x + item.drift * seconds + this.width * 0.25) % span) + span) % span) - this.width * 0.25
      }

      item.display.x = item.x - cameraX * item.factor
    }

    for (const motion of this.motions) {
      const wave = Math.sin(this.time * motion.speed + motion.phase)

      if (motion.kind === 'pulse') {
        motion.display.alpha = motion.base + motion.amount * wave
      } else if (motion.kind === 'bob') {
        motion.display.y = motion.base + motion.amount * wave
      } else {
        motion.display.rotation += seconds * motion.speed
      }
    }

    for (const puff of this.puffs) {
      const t = (this.time * 0.12 + puff.offset) % 1

      puff.sprite.position.set(puff.x + t * puff.rise * 0.4, puff.y - t * puff.rise)
      puff.sprite.width = puff.sprite.height = puff.size * (0.5 + t * 1.5)
      puff.sprite.alpha = Math.sin(t * Math.PI) * 0.55
    }

    for (const particle of this.particles) {
      particle.x += particle.vx * seconds
      particle.y += particle.vy * seconds

      const wobble = Math.sin(this.time * 1.3 + particle.phase)
      const factor = 0.4 + particle.depth

      // Wraps around the screen (with some room so they do not pop in at the edges).
      if (particle.y > this.height + 30) {
        particle.y = -30
      }

      if (particle.y < -30) {
        particle.y = this.height + 30
      }

      if (particle.x > this.width * 1.1) {
        particle.x -= this.width * 1.2
      }

      if (particle.x < -this.width * 0.1) {
        particle.x += this.width * 1.2
      }

      particle.sprite.position.set(particle.x + wobble * 8 * particle.depth - cameraX * factor, particle.y)

      if (this.mood.particles === 'fireflies' || this.mood.particles === 'motes') {
        particle.sprite.alpha = particle.alpha * (0.35 + 0.65 * Math.max(0, Math.sin(this.time * 2 + particle.phase)))
      } else if (this.mood.particles === 'leaves') {
        particle.sprite.rotation += seconds * (1 + particle.depth) * Math.sign(wobble || 1)
      }
    }

    this.rays.forEach((ray, index) => {
      ray.alpha = 0.07 + 0.05 * Math.sin(this.time * 0.6 + index * 1.7)
    })
  }

  /** The painting as a mesh: every row of vertices shifts with the camera by its depth. */
  private drawBackdrop(texture: Texture): void {
    // Wide enough to pan, with 72 % of the picture above the ground line and the rest reaching below the screen.
    const scale = Math.max(
      (this.width * BACKDROP_MARGIN) / texture.width,
      (this.groundY + 0.06 * this.height) / (texture.height * 0.72),
      (this.height * 1.04 - this.groundY) / (texture.height * 0.28)
    )
    const rows = 24
    const mesh = new MeshPlane({ texture, verticesX: 2, verticesY: rows })
    const top = this.groundY - texture.height * 0.72 * scale

    mesh.scale.set(scale)
    mesh.position.set((this.width - texture.width * scale) / 2, top)
    this.backdrop = mesh
    this.backdropRows = Array.from({ length: rows }, (_, row) => top + (row / (rows - 1)) * texture.height * scale)
    // The painted horizon: the far hills end around 60 % of the picture.
    this.horizonY = top + texture.height * 0.6 * scale
    this.back.addChild(mesh)
  }

  /** The sky of the mood: its gradient, the stars, an aurora and the sun, the moon or an eclipse. */
  private drawSky(random: Random, scale: number): void {
    const [top, bottom] = this.mood.sky
    const sky = new Sprite(this.gradient([top, mix(top, bottom, 0.55), bottom], [0, 0.55, 1]))

    sky.width = this.width
    sky.height = this.horizonY + 40 * scale
    this.back.addChild(sky)

    if (this.mood.stars) {
      for (let group = 0; group < 3; group++) {
        const stars = new Graphics()

        for (let index = 0; index < 18; index++) {
          const size = (0.8 + random() * 1.4) * scale

          stars
            .circle(-this.width * 0.05 + random() * this.width * 1.1, random() * this.horizonY * 0.75, size)
            .fill({ color: 0xffffff })
        }

        this.place(stars, 0, DEPTH.stars)
        this.motions.push({
          display: stars,
          kind: 'pulse',
          base: 0.65,
          amount: 0.3,
          speed: 1.2 + group * 0.7,
          phase: group * 2
        })
      }
    }

    if (this.mood.aurora) {
      for (let band = 0; band < 2; band++) {
        const aurora = new Graphics()
        const y = this.horizonY * (0.25 + band * 0.15)
        const top: number[] = []
        const lower: number[] = []

        for (let step = 0; step <= 24; step++) {
          const x = -this.width * 0.1 + (step / 24) * this.width * 1.2
          const wave = Math.sin(step * 0.5 + band * 2 + random()) * 18 * scale

          top.push(x, y + wave - 40 * scale)
          lower.unshift(x, y + wave + 10 * scale)
        }

        aurora.poly([...top, ...lower]).fill({ color: band ? 0x80a0ff : 0x60ffc0, alpha: 0.22 })
        aurora.blendMode = 'add'
        this.place(aurora, 0, DEPTH.stars)
        this.motions.push({
          display: aurora,
          kind: 'pulse',
          base: 0.7,
          amount: 0.3,
          speed: 0.5 + band * 0.3,
          phase: band
        })
      }
    }

    const celestial = this.mood.celestial

    if (celestial !== 'none') {
      const radius = { sun: 28, moon: 22, eclipse: 34 }[celestial] * scale
      const body = drawCelestial(celestial, radius, this.mood.light)

      body.y = this.horizonY * (0.3 + this.plan.celestial.y * 0.35)
      this.place(body, this.plan.celestial.x * this.width, DEPTH.celestial)
    }
  }

  /** Clouds (or smoke, or long wisps) drifting slowly behind the mountains. */
  private drawClouds(random: Random, scale: number): void {
    const kind = this.look.clouds
    const color = kind === 'smoke' ? 0x4a3434 : mix(0xffffff, this.mood.haze, 0.25)
    const shade = kind === 'smoke' ? 0x2a1c1c : mix(color, this.mood.sky[0], 0.3)

    for (let index = 0; index < this.plan.clouds; index++) {
      const width = (110 + random() * 120) * scale
      const cloud = drawCloud(kind, random, width, color, shade)

      cloud.y = this.horizonY * (0.12 + random() * 0.5)
      this.place(cloud, random() * this.width, DEPTH.clouds, (4 + random() * 8) * scale * (random() < 0.5 ? -1 : 1))
    }
  }

  /** The bands of land on the horizon, far to near, and the landmark between them. */
  private drawLand(random: Random, scale: number): void {
    const look = this.look
    const haze = this.mood.haze
    const shade = (color: number) =>
      this.plan.shade > 0 ? mix(color, 0xffffff, this.plan.shade * 0.12) : mix(color, 0x000000, -this.plan.shade * 0.12)
    const left = -this.width * SIDE_MARGIN
    const right = this.width * (1 + SIDE_MARGIN)
    // By day the distance fades into the haze; under a dark sky the land stands out as darker silhouettes.
    const night = luminance(this.mood.sky[1]) < 0.3
    const bands = [
      { share: 0.3, height: Math.min(this.horizonY * 0.55, 260 * scale), outline: true, line: 1.2, depth: DEPTH.far },
      {
        share: 0.18,
        height: Math.min(this.horizonY * 0.34, 170 * scale),
        outline: true,
        line: 1.6,
        depth: DEPTH.middle
      },
      { share: 0.06, height: Math.min(this.horizonY * 0.17, 90 * scale), outline: true, line: 2.2, depth: DEPTH.near }
    ]

    bands.forEach((band, index) => {
      const land = shade(look.land[index])
      const color = night
        ? mix(mix(land, 0x000000, 0.5 - index * 0.15), this.mood.sky[1], band.share * 0.8)
        : mix(land, haze, band.share)
      const painted = this.art.bands[index]

      if (painted) {
        // The same light as the drawn bands: hazier the farther, darker under a dark sky.
        const tint = night
          ? mix(mix(0xffffff, 0x000000, 0.5 - index * 0.15), this.mood.sky[1], band.share * 0.8)
          : mix(0xffffff, haze, band.share)

        this.place(this.band(painted, left, right, band.height * 1.15, tint, random() < 0.5), 0, band.depth)
      } else {
        this.drawRangeBand(index, band, color, left, right, random, scale)
      }

      if (index === 1) {
        this.drawLandmark(random, scale)
      }
    })
  }

  /** A band of land drawn with shapes (until the biome has its painted bands). */
  private drawRangeBand(
    index: number,
    band: { height: number; outline: boolean; line: number; share: number; depth: number },
    color: number,
    left: number,
    right: number,
    random: Random,
    scale: number
  ): void {
    const look = this.look
    const haze = this.mood.haze
    const range = drawRange(this.plan.ranges[index], random, {
      left,
      right,
      base: this.horizonY + 2 * scale,
      height: band.height,
      color,
      outline: band.outline ? mix(color, 0x000000, index === 0 ? 0.3 : 0.6) : null,
      line: band.line * scale,
      snowCaps: !!look.snowCaps,
      snow: mix(0xffffff, haze, band.share),
      glow: look.glow,
      lightFromLeft: this.plan.lightFromLeft
    })

    this.place(range.graphics, 0, band.depth)
    range.pulses.forEach((pulse, at) =>
      this.motions.push({ display: pulse, kind: 'pulse', base: 0.75, amount: 0.25, speed: 1.4, phase: at * 1.3 })
    )
    range.vents.forEach((vent) => this.smoke(range.graphics, vent.x, vent.y, band.height, scale))
  }

  /**
   * A painted band `height` pixels tall standing on the horizon, repeated from
   * `left` to `right` with every other copy mirrored (so the copies always meet
   * at the same edge); `flip` starts mirrored, so points differ.
   */
  private band(texture: Texture, left: number, right: number, height: number, tint: number, flip: boolean): Container {
    const holder = new Container()
    const scale = height / texture.height
    const width = texture.width * scale
    // Starts at a different spot on each point (in [0, one copy)), so the same band never lines up the same.
    const offset = (hashText(`${this.seed}:band:${texture.uid}`) % 1000) / 1000

    for (let x = left - width * offset, copy = flip ? 1 : 0; x < right; x += width, copy++) {
      const sprite = new Sprite(texture)
      const mirrored = copy % 2 === 1

      sprite.anchor.set(mirrored ? 1 : 0, 1)
      sprite.scale.set(mirrored ? -scale : scale, scale)
      sprite.position.set(x, this.horizonY + height * 0.04)
      sprite.tint = tint
      holder.addChild(sprite)
    }

    return holder
  }

  /** The landmark of the point (a windmill, a castle, a pyramid…), standing between the middle and near land. */
  private drawLandmark(random: Random, scale: number): void {
    const landmark = this.plan.landmark

    if (!landmark) {
      return
    }

    const tone = (color: number) => mix(color, this.mood.haze, 0.22)
    const size = landmark.size * Math.min(this.horizonY * 0.5, 170 * scale)

    // A painted landmark of the biome, when there are.
    if (this.art.landmarks.length > 0) {
      const texture = this.art.landmarks[Math.floor(random() * this.art.landmarks.length)]
      const sprite = new Sprite(texture)
      const ratio = size / texture.height

      sprite.anchor.set(0.5, 0.97)
      sprite.scale.set(ratio * (random() < 0.5 ? -1 : 1), ratio)
      sprite.tint = tone(0xffffff)
      sprite.y = this.horizonY + 2 * scale
      this.place(sprite, landmark.x * this.width, DEPTH.landmark)

      return
    }

    const drawn = drawLandmark(landmark.kind, random, size, {
      stone: tone(this.look.stone),
      wood: tone(this.look.wood),
      accent: tone(this.look.accent),
      leaf: tone(mix(this.look.land[1], 0xffffff, 0.1)),
      outline: mix(tone(this.look.stone), 0x000000, 0.65),
      glow: this.look.glow,
      line: 1.8 * scale,
      lightFromLeft: this.plan.lightFromLeft
    })

    drawn.display.y = this.horizonY + 2 * scale
    this.place(drawn.display, landmark.x * this.width, DEPTH.landmark)
    drawn.spinners.forEach((display) =>
      this.motions.push({ display, kind: 'spin', base: 0, amount: 0, speed: 0.35, phase: 0 })
    )
    drawn.bobbers.forEach((display, index) =>
      this.motions.push({
        display,
        kind: 'bob',
        base: display.y,
        amount: 6 * scale,
        speed: 0.8 + index * 0.25,
        phase: index * 2
      })
    )
    drawn.pulses.forEach((display, index) =>
      this.motions.push({ display, kind: 'pulse', base: 0.75, amount: 0.25, speed: 2.2, phase: index })
    )
  }

  /** Puffs of smoke rising from a crater, as children of its band (so they move with it). */
  private smoke(parent: Container, x: number, y: number, height: number, scale: number): void {
    for (let index = 0; index < 5; index++) {
      const sprite = new Sprite(textures().soft)

      sprite.anchor.set(0.5)
      sprite.tint = this.look.glow ? 0x3a2a2a : 0x8a8a8a
      parent.addChild(sprite)
      this.puffs.push({ sprite, x, y, rise: height * 1.2, size: 60 * scale, offset: index / 5 })
    }
  }

  /** The ground, from the haze of the horizon to darker right in front of the camera. */
  private drawGround(): void {
    const ground =
      this.plan.shade > 0
        ? mix(this.look.ground, this.look.groundLight, this.plan.shade * 0.3)
        : mix(this.look.ground, this.look.groundDark, -this.plan.shade * 0.3)
    const middle = (this.groundY - this.horizonY) / Math.max(1, this.height - this.horizonY)
    const sprite = new Sprite(
      this.gradient(
        [mix(ground, this.mood.haze, 0.35), ground, mix(ground, this.look.groundDark, 0.45)],
        [0, Math.min(0.95, middle), 1]
      )
    )

    sprite.y = this.horizonY
    sprite.width = this.width
    sprite.height = this.height - this.horizonY
    this.back.addChild(sprite)
  }

  /** A band of haze over the horizon: the distance fades into the color of the air. */
  private drawHaze(): void {
    const haze = new Sprite(textures().band)
    const height = (this.groundY - this.horizonY) * 2.2

    haze.tint = this.mood.haze
    haze.alpha = 0.45
    haze.width = this.width
    haze.height = height
    haze.position.set(0, this.horizonY - height * 0.62)
    this.back.addChild(haze)
  }

  /** What lies on the ground of the biome: a trail, stones, ripples of sand, cracks, lava, snow, runes, puddles. */
  private drawGroundFeatures(random: Random, scale: number): void {
    const features = this.painting
      ? this.plan.groundFeatures.filter((feature) => feature !== 'path')
      : this.plan.groundFeatures
    const depth = this.groundY - this.horizonY
    const spot = (from = 0.15) => {
      const y = this.horizonY + depth * from + (this.height - this.horizonY - depth * from) * random()

      return { x: -this.width * 0.05 + random() * this.width * 1.1, y, size: this.sizeAt(y) * scale }
    }
    const outline = mix(this.look.groundDark, 0x000000, 0.4)

    for (const feature of features) {
      switch (feature) {
        case 'path': {
          this.drawPath(random, scale)
          break
        }
        case 'stones': {
          for (let index = 0, count = 3 + Math.floor(random() * 5); index < count; index++) {
            const { x, y, size } = spot()
            const g = new Graphics()
            const w = (8 + random() * 10) * size

            g.ellipse(w * 0.2, w * 0.25, w * 1.2, w * 0.4).fill({ color: 0x000000, alpha: 0.2 })
            g.ellipse(0, 0, w, w * 0.62)
              .fill({ color: this.look.stone })
              .stroke({ width: 1.4 * size, color: outline })
            g.ellipse(-w * 0.3, -w * 0.2, w * 0.4, w * 0.2).fill({ color: mix(this.look.stone, 0xffffff, 0.4) })
            this.placeOnGround(g, x, y)
          }
          break
        }
        case 'ripples': {
          for (let index = 0, count = 8 + Math.floor(random() * 8); index < count; index++) {
            const { x, y, size } = spot(0.05)
            const g = new Graphics()
            const w = (40 + random() * 50) * size

            g.moveTo(-w, 0)
              .quadraticCurveTo(0, -w * 0.12, w, 0)
              .stroke({ width: 2 * size, color: this.look.groundDark, alpha: 0.45 })
            g.moveTo(-w, 2 * size)
              .quadraticCurveTo(0, -w * 0.12 + 2 * size, w, 2 * size)
              .stroke({ width: 1.5 * size, color: this.look.groundLight, alpha: 0.5 })
            this.placeOnGround(g, x, y)
          }
          break
        }
        case 'cracks': {
          const glowing = this.biome === Biome.VOLCANIC || this.biome === Biome.ABYSS

          for (let index = 0, count = 3 + Math.floor(random() * 4); index < count; index++) {
            const { x, y, size } = spot()
            const g = new Graphics()
            const points: number[] = [0, 0]
            const steps = 4 + Math.floor(random() * 3)

            for (let step = 1; step <= steps; step++) {
              points.push(
                step * 14 * size * (random() < 0.5 ? 1 : -1) * 0.5 + points[points.length - 2],
                (random() - 0.5) * 6 * size
              )
            }

            if (glowing && this.look.glow) {
              g.poly(points, false).stroke({
                width: 5 * size,
                color: this.look.glow,
                alpha: 0.35,
                cap: 'round',
                join: 'round'
              })
              g.poly(points, false).stroke({
                width: 1.8 * size,
                color: mix(this.look.glow, 0xffffff, 0.4),
                cap: 'round',
                join: 'round'
              })
              g.blendMode = 'add'
              this.motions.push({ display: g, kind: 'pulse', base: 0.75, amount: 0.25, speed: 1.5, phase: index })
            } else {
              g.poly(points, false).stroke({
                width: 2.2 * size,
                color: outline,
                alpha: 0.7,
                cap: 'round',
                join: 'round'
              })
            }

            this.placeOnGround(g, x, y)
          }
          break
        }
        case 'lava': {
          for (let index = 0, count = 2 + Math.floor(random() * 3); index < count; index++) {
            const { x, y, size } = spot(0.1)
            const g = new Graphics()
            const glow = new Sprite(textures().soft)
            const w = (30 + random() * 40) * size

            g.ellipse(0, 0, w * 1.12, w * 0.34).fill({ color: this.look.groundDark })
            g.ellipse(0, 0, w, w * 0.28).fill({ color: 0xff6a1a })
            g.ellipse(-w * 0.15, -w * 0.03, w * 0.6, w * 0.13).fill({ color: 0xffd04a })
            glow.anchor.set(0.5)
            glow.tint = 0xff8a1a
            glow.blendMode = 'add'
            glow.width = w * 3
            glow.height = w * 1.2
            g.addChild(glow)
            this.motions.push({ display: glow, kind: 'pulse', base: 0.5, amount: 0.25, speed: 1.3, phase: index * 1.7 })
            this.placeOnGround(g, x, y)
          }
          break
        }
        case 'drifts': {
          for (let index = 0, count = 3 + Math.floor(random() * 4); index < count; index++) {
            const { x, y, size } = spot()
            const g = new Graphics()
            const w = (30 + random() * 40) * size

            g.ellipse(0, w * 0.05, w * 1.05, w * 0.28).fill({ color: this.look.groundDark, alpha: 0.6 })
            g.ellipse(0, 0, w, w * 0.32).fill({ color: 0xffffff })
            g.ellipse(-w * 0.25, -w * 0.08, w * 0.5, w * 0.12).fill({ color: 0xffffff })
            this.placeOnGround(g, x, y)
          }
          break
        }
        case 'runes': {
          for (let index = 0, count = 2 + Math.floor(random() * 2); index < count; index++) {
            const { x, y, size } = spot(0.2)
            const g = new Graphics()
            const w = (24 + random() * 20) * size
            const color = this.look.glow ?? this.look.accent

            g.ellipse(0, 0, w, w * 0.3).stroke({ width: 2 * size, color })
            g.ellipse(0, 0, w * 0.7, w * 0.21).stroke({ width: 1.2 * size, color })

            for (let mark = 0; mark < 6; mark++) {
              const angle = (mark / 6) * Math.PI * 2

              g.circle(Math.cos(angle) * w * 0.85, Math.sin(angle) * w * 0.255, 1.8 * size).fill({ color })
            }

            g.blendMode = 'add'
            this.motions.push({ display: g, kind: 'pulse', base: 0.7, amount: 0.3, speed: 1.1, phase: index * 2 })
            this.placeOnGround(g, x, y)
          }
          break
        }
        case 'puddles': {
          const toxic = this.biome === Biome.WASTELANDS
          const water = toxic ? (this.look.glow ?? 0x9aff70) : mix(0x6ab8e8, this.mood.sky[1], 0.4)

          for (let index = 0, count = 1 + Math.floor(random() * 3); index < count; index++) {
            const { x, y, size } = spot(0.2)
            const g = new Graphics()
            const w = (22 + random() * 30) * size

            g.ellipse(0, 0, w * 1.1, w * 0.32).fill({ color: this.look.groundDark, alpha: 0.6 })
            g.ellipse(0, 0, w, w * 0.27).fill({ color: water, alpha: toxic ? 0.8 : 1 })
            g.ellipse(-w * 0.3, -w * 0.06, w * 0.35, w * 0.06).fill({ color: 0xffffff, alpha: 0.7 })
            this.placeOnGround(g, x, y)
          }
          break
        }
      }
    }
  }

  /** A trail winding from in front of the camera to the horizon, each stretch moving with its own depth. */
  private drawPath(random: Random, scale: number): void {
    const color =
      this.biome === Biome.MOUNTAINS || this.biome === Biome.SNOW
        ? mix(this.look.stone, this.look.ground, 0.35)
        : mix(0xd8b47a, this.look.ground, 0.2)
    const rim = mix(color, 0x000000, 0.25)
    const startX = this.width * (0.3 + random() * 0.4)
    const endX = this.width * (0.15 + random() * 0.7)
    const bend = (random() - 0.5) * this.width * 0.6
    // Enough stretches that they always overlap, however tall the screen is.
    const steps = Math.max(18, Math.ceil((this.height - this.horizonY) / (5 * scale)))
    const rims: [Graphics, number, number][] = []
    const fills: [Graphics, number, number][] = []

    for (let step = steps; step >= 0; step--) {
      const t = step / steps
      const y = this.height + 20 * scale - (this.height + 20 * scale - this.horizonY) * Math.pow(t, 0.8)
      const x = startX + (endX - startX) * t + bend * Math.sin(t * Math.PI)
      const w = this.width * 0.22 * Math.pow(1 - t, 1.2) + 6 * scale

      rims.push([new Graphics().ellipse(0, 0, w + 3 * scale, w * 0.22 + 2 * scale).fill({ color: rim }), x, y])
      fills.push([new Graphics().ellipse(0, 0, w, w * 0.22).fill({ color }), x, y])
    }

    for (const [g, x, y] of [...rims, ...fills]) {
      this.placeOnGround(g, x, y)
    }
  }

  /** Soft darker and lighter patches on the ground, so no two battlefields look the same. */
  private drawGroundPatches(random: Random, scale: number): void {
    const count = 5 + Math.floor(random() * 5)

    for (let index = 0; index < count; index++) {
      const y = this.horizonY + (this.height - this.horizonY) * (0.25 + random() * 0.75)
      const patch = new Sprite(textures().soft)
      const size = (140 + random() * 220) * scale * this.sizeAt(y)
      const dark = random() < 0.65

      patch.anchor.set(0.5)
      patch.tint = dark ? this.look.groundDark : this.look.groundLight
      patch.alpha = dark ? 0.2 + random() * 0.15 : 0.15 + random() * 0.1
      patch.width = size * 2
      patch.height = size * 0.45
      this.placeOnGround(patch, random() * this.width, y)
    }
  }

  /** Props far away on the horizon and others behind the fighters, smaller and hazier with the distance. */
  private drawProps(random: Random, scale: number): void {
    if (this.props.length === 0) {
      return
    }

    const tallest = 1.8 * 120 * scale
    const depth = this.groundY - this.horizonY
    const spots: { x: number; y: number; far: boolean }[] = []
    const groups = 3 + Math.floor(random() * 4)

    // In small groves: one to three props side by side.
    for (let group = 0; group < groups; group++) {
      const far = random() < 0.6
      const x = random() * this.width
      const y = this.horizonY + depth * (far ? 0.03 + random() * 0.15 : 0.22 + random() * 0.3)
      const size = 1 + Math.floor(random() * 3)

      for (let index = 0; index < size; index++) {
        spots.push({
          x: x + (index - (size - 1) / 2) * 50 * scale * this.sizeAt(y),
          y: y + (random() - 0.5) * 6 * scale,
          far
        })
      }
    }

    // Farther first, so nearer props cover them.
    spots.sort((a, b) => a.y - b.y)

    for (const spot of spots) {
      const prop = this.props[Math.floor(random() * this.props.length)]
      const sprite = new Sprite(prop.texture)
      const height = tallest * prop.height * this.sizeAt(spot.y) * (0.85 + random() * 0.3)
      const shadow = new Sprite(textures().soft)
      const holder = new Container()

      sprite.anchor.set(0.5, 0.96)
      sprite.scale.set((height / prop.texture.height) * (random() < 0.5 ? -1 : 1), height / prop.texture.height)
      sprite.tint = mix(0xffffff, this.mood.haze, spot.far ? 0.45 : 0.15)
      sprite.alpha = spot.far ? 0.85 : 1
      shadow.anchor.set(0.5)
      shadow.tint = 0x000000
      shadow.alpha = spot.far ? 0.15 : 0.3
      shadow.width = Math.abs(sprite.width) * 0.9
      shadow.height = Math.abs(sprite.width) * 0.18
      holder.addChild(shadow, sprite)
      this.placeOnGround(holder, spot.x, spot.y)
    }
  }

  /** Tufts, flowers, pebbles or embers scattered over the ground, bigger the nearer they are. */
  private drawScatter(random: Random, scale: number): void {
    if (this.scatter.length === 0) {
      return
    }

    const depth = this.groundY - this.horizonY
    const spots = Array.from({ length: 18 + Math.floor(random() * 16) }, () => ({
      x: -this.width * 0.05 + random() * this.width * 1.1,
      y: this.horizonY + depth * 0.12 + random() * (this.height - this.horizonY - depth * 0.12)
    })).sort((a, b) => a.y - b.y)

    for (const { x, y } of spots) {
      const texture = this.scatter[Math.floor(random() * this.scatter.length)]
      const sprite = new Sprite(texture)
      const height = 24 * scale * this.sizeAt(y) * (0.7 + random() * 0.6)

      sprite.anchor.set(0.5, 0.9)
      sprite.scale.set((height / texture.height) * (random() < 0.5 ? -1 : 1), height / texture.height)
      sprite.tint = mix(0xffffff, this.mood.haze, 0.3 * (1 - Math.min(1, (y - this.horizonY) / depth)))
      this.placeOnGround(sprite, x, y)
    }
  }

  /** Blurred dark silhouettes at the bottom corners, closer to the camera than the fighters. */
  private drawForeground(random: Random, scale: number): void {
    const layer = new Container()
    const color = mix(this.look.groundDark, 0x000000, 0.45)
    const edges = random() < 0.35 ? ['left', 'right'] : [random() < 0.5 ? 'left' : 'right']

    layer.filters = [new BlurFilter({ strength: 3 * scale, quality: 2 })]

    for (const edge of edges) {
      const holder = new Container()
      const g = new Graphics()
      const width = this.width * (0.2 + random() * 0.12)
      const direction = edge === 'left' ? 1 : -1

      if (this.look.grassy) {
        const blades = 18 + Math.floor(random() * 14)

        for (let blade = 0; blade < blades; blade++) {
          const share = blade / blades
          const x = direction * share * width
          const height = (40 + random() * 90) * scale * (1.3 - share)
          const lean = (random() - 0.5) * 30 * scale

          g.poly([x - 5 * scale, 0, x + lean, -height, x + 5 * scale, 0]).fill({ color })
        }
      } else {
        const rocks = 2 + Math.floor(random() * 3)

        for (let rock = 0; rock < rocks; rock++) {
          const share = rock / rocks
          const radius = (30 + random() * 40) * scale * (1.3 - share)

          g.ellipse(direction * share * width, 0, radius * 1.3, radius).fill({ color })
        }
      }

      holder.addChild(g)

      // Now and then a big prop right in front of the camera, at the edge.
      const framing = this.props.filter((prop) => prop.framing)

      if (framing.length > 0 && random() < 0.45) {
        const prop = framing[Math.floor(random() * framing.length)]
        const sprite = new Sprite(prop.texture)
        const height = this.height * (0.35 + 0.35 * prop.height)

        sprite.anchor.set(edge === 'left' ? 0.75 : 0.25, 0.9)
        sprite.scale.set(height / prop.texture.height)
        sprite.tint = color
        holder.addChildAt(sprite, 0)
      }

      holder.y = this.height + 6 * scale
      layer.addChild(holder)
      this.placed.push({
        display: holder,
        x: edge === 'left' ? -this.width * 0.02 : this.width * 1.02,
        factor: 1.45
      })
    }

    this.front.addChild(layer)
  }

  /** What floats in the air, at many depths: nearer ones bigger, faster and following the camera more. */
  private drawParticles(random: Random, scale: number): void {
    const kind = this.mood.particles
    const count = {
      pollen: 34,
      fireflies: 22,
      snow: 60,
      embers: 40,
      ash: 40,
      dust: 46,
      leaves: 18,
      motes: 30,
      mist: 7
    }[kind]
    const colors = this.mood.particleColor ? [this.mood.particleColor] : PARTICLE_COLORS[kind]

    this.particles = Array.from({ length: count }, () => {
      const depth = random()
      const sprite = new Sprite(textures().soft)
      const size = { mist: 260, fireflies: 14, motes: 12, leaves: 9, snow: 7, pollen: 6, embers: 6, ash: 6, dust: 5 }[
        kind
      ]
      const speed = 0.4 + depth * 0.9
      const velocity: Record<ParticleKind, [number, number]> = {
        pollen: [8, -6],
        fireflies: [(random() - 0.5) * 16, (random() - 0.5) * 12],
        snow: [-10, 38],
        embers: [6, -34],
        ash: [-6, 14],
        dust: [70, 4],
        leaves: [-24, 30],
        motes: [(random() - 0.5) * 8, -12],
        mist: [10, 0]
      }
      const [vx, vy] = velocity[kind]
      const alpha = kind === 'mist' ? 0.06 + random() * 0.05 : kind === 'dust' ? 0.25 + 0.3 * depth : 0.45 + 0.5 * depth

      sprite.anchor.set(0.5)
      sprite.tint = colors[Math.floor(random() * colors.length)]
      sprite.alpha = alpha
      sprite.width = size * scale * (0.5 + depth)
      sprite.height = kind === 'leaves' ? sprite.width * 0.5 : kind === 'mist' ? sprite.width * 0.35 : sprite.width

      if (kind === 'fireflies' || kind === 'embers' || kind === 'motes') {
        sprite.blendMode = 'add'
      }

      this.front.addChild(sprite)

      return {
        sprite,
        x: random() * this.width,
        y: kind === 'mist' ? this.horizonY + random() * (this.height - this.horizonY) * 0.7 : random() * this.height,
        depth,
        vx: vx * speed * scale,
        vy: vy * speed * scale,
        phase: random() * Math.PI * 2,
        alpha
      }
    })
  }

  /** The glow of the light source, light shafts, the color grade and a vignette over everything. */
  private drawLight(random: Random): void {
    const fromLeft = this.plan.lightFromLeft
    const glow = new Sprite(textures().soft)
    const size = Math.max(this.width, this.height) * 1.1

    glow.anchor.set(0.5)
    glow.tint = this.mood.light
    glow.alpha = this.mood.lightAlpha
    glow.blendMode = 'add'
    glow.width = size
    glow.height = size * 0.8
    glow.position.set(fromLeft ? this.width * 0.1 : this.width * 0.9, this.height * 0.05)
    this.front.addChild(glow)

    if (this.mood.rays) {
      for (let index = 0; index < 4; index++) {
        const ray = new Sprite(textures().band)

        ray.anchor.set(0.5, 0)
        ray.tint = this.mood.light
        ray.blendMode = 'add'
        ray.width = this.width * (0.05 + random() * 0.08)
        ray.height = this.height * 1.6
        ray.rotation = (fromLeft ? -1 : 1) * (0.35 + random() * 0.15)
        ray.position.set(this.width * (0.15 + random() * 0.7), -this.height * 0.1)
        this.rays.push(ray)
        this.front.addChild(ray)
      }
    }

    if (this.mood.gradeAlpha > 0) {
      const grade = new Graphics().rect(0, 0, this.width, this.height).fill({ color: this.mood.grade })

      grade.alpha = this.mood.gradeAlpha
      grade.blendMode = 'multiply'
      this.front.addChild(grade)
    }

    const vignette = new Sprite(textures().vignette)

    vignette.width = this.width
    vignette.height = this.height
    this.front.addChild(vignette)
  }

  /** Adds something behind the fighters that follows the camera by `factor` (and drifts, if given). */
  private place(display: Container, x: number, factor: number, drift?: number): void {
    this.back.addChild(display)
    this.placed.push({ display, x, factor, drift })
  }

  /** Adds something lying or standing on the ground at (x, y), following the camera by its depth. */
  private placeOnGround(display: Container, x: number, y: number): void {
    display.y = y
    this.place(display, x, this.factorAt(y))
  }

  /** A vertical gradient texture of these colors at these stops (0 top, 1 bottom), freed on the next layout. */
  private gradient(colors: number[], stops: number[]): Texture {
    const texture = canvasTexture(4, 256, (context) => {
      const gradient = context.createLinearGradient(0, 0, 0, 256)

      colors.forEach((color, index) => gradient.addColorStop(stops[index], `#${color.toString(16).padStart(6, '0')}`))
      context.fillStyle = gradient
      context.fillRect(0, 0, 4, 256)
    })

    this.owned.push(texture)

    return texture
  }
}

/** Gradient textures drawn once on a canvas: a soft dot, a vertical band and a vignette. */
let shared: { soft: Texture; band: Texture; vignette: Texture } | null = null

function textures(): { soft: Texture; band: Texture; vignette: Texture } {
  shared ??= {
    soft: canvasTexture(64, 64, (context) => {
      const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32)

      gradient.addColorStop(0, 'rgba(255,255,255,1)')
      gradient.addColorStop(0.4, 'rgba(255,255,255,0.6)')
      gradient.addColorStop(1, 'rgba(255,255,255,0)')
      context.fillStyle = gradient
      context.fillRect(0, 0, 64, 64)
    }),
    band: canvasTexture(4, 256, (context) => {
      const gradient = context.createLinearGradient(0, 0, 0, 256)

      gradient.addColorStop(0, 'rgba(255,255,255,0)')
      gradient.addColorStop(0.62, 'rgba(255,255,255,1)')
      gradient.addColorStop(1, 'rgba(255,255,255,0)')
      context.fillStyle = gradient
      context.fillRect(0, 0, 4, 256)
    }),
    vignette: canvasTexture(256, 256, (context) => {
      const gradient = context.createRadialGradient(128, 118, 70, 128, 128, 190)

      gradient.addColorStop(0, 'rgba(0,0,0,0)')
      gradient.addColorStop(1, 'rgba(0,0,0,0.55)')
      context.fillStyle = gradient
      context.fillRect(0, 0, 256, 256)
    })
  }

  return shared
}

/** Perceived brightness of a color, from 0 (black) to 1 (white). */
function luminance(color: number): number {
  return (0.299 * ((color >> 16) & 0xff) + 0.587 * ((color >> 8) & 0xff) + 0.114 * (color & 0xff)) / 255
}

function canvasTexture(width: number, height: number, draw: (context: CanvasRenderingContext2D) => void): Texture {
  const canvas = document.createElement('canvas')

  canvas.width = width
  canvas.height = height
  draw(canvas.getContext('2d')!)

  return Texture.from(canvas)
}
