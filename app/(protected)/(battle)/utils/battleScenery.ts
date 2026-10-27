import { BlurFilter, Container, Graphics, MeshPlane, Sprite, Texture } from 'pixi.js'
import { Biome } from '@/app/(protected)/(engine)/models/Biome'
import { hashText } from '@/app/(protected)/(engine)/utils/encounters'
import { createRandom, Random } from '@/app/(protected)/(engine)/utils/random'
import { BIOME_GROUND } from '@/app/(protected)/(world)/utils/mapStyle'

/** A prop the scenery can place, with its height relative to the tallest one of its biome (0 to 1). */
export interface SceneryProp {
  texture: Texture
  height: number
  /** Big enough to frame the scene as a silhouette right in front of the camera (a tree, a pillar). */
  framing: boolean
}

type ParticleKind = 'pollen' | 'fireflies' | 'snow' | 'embers' | 'ash' | 'dust' | 'leaves' | 'motes' | 'mist'

/** The light of a battle: a color grade over everything, the haze of the distance, a glow and what floats in the air. */
interface Mood {
  /** Multiplied over the scene (white leaves it as painted) and how strongly. */
  grade: number
  gradeAlpha: number
  haze: number
  light: number
  lightAlpha: number
  particles: ParticleKind
  /** Color of the particles, when it is not the kind's own. */
  particleColor?: number
  /** Light shafts falling from the top. */
  rays?: boolean
}

const MORNING: Mood = {
  grade: 0xffffff,
  gradeAlpha: 0,
  haze: 0xfff1d6,
  light: 0xffd9a0,
  lightAlpha: 0.35,
  particles: 'pollen'
}
/** Two or three moods per biome; each point of the map always gets the same one. */
const MOODS: Record<Biome, Mood[]> = {
  [Biome.MEADOWS]: [
    MORNING,
    { grade: 0xffb784, gradeAlpha: 0.35, haze: 0xffb070, light: 0xff9a50, lightAlpha: 0.45, particles: 'pollen' },
    { grade: 0x5a6aa8, gradeAlpha: 0.6, haze: 0x34406e, light: 0x9fb4ff, lightAlpha: 0.2, particles: 'fireflies' }
  ],
  [Biome.FOREST]: [
    {
      grade: 0xd8ffd0,
      gradeAlpha: 0.15,
      haze: 0xbfe0c0,
      light: 0xfff0b0,
      lightAlpha: 0.3,
      particles: 'leaves',
      rays: true
    },
    { grade: 0xb8c8d0, gradeAlpha: 0.3, haze: 0xc8d6dc, light: 0xe0f0ff, lightAlpha: 0.15, particles: 'mist' },
    { grade: 0x4a5a8a, gradeAlpha: 0.55, haze: 0x2a3a4a, light: 0xb0d0ff, lightAlpha: 0.15, particles: 'fireflies' }
  ],
  [Biome.TROPICAL]: [
    {
      grade: 0xfff4d0,
      gradeAlpha: 0.15,
      haze: 0xe0f0d0,
      light: 0xfff0b0,
      lightAlpha: 0.3,
      particles: 'mist',
      rays: true
    },
    { grade: 0xff9a7a, gradeAlpha: 0.35, haze: 0xd08070, light: 0xff8a50, lightAlpha: 0.35, particles: 'fireflies' }
  ],
  [Biome.DESERT]: [
    { grade: 0xfff0d0, gradeAlpha: 0.2, haze: 0xffe8c0, light: 0xffffff, lightAlpha: 0.3, particles: 'dust' },
    { grade: 0xff9a6a, gradeAlpha: 0.35, haze: 0xff9a60, light: 0xff7a40, lightAlpha: 0.45, particles: 'dust' },
    { grade: 0x4a5a9a, gradeAlpha: 0.55, haze: 0x3a4a7a, light: 0xc0d0ff, lightAlpha: 0.2, particles: 'dust' }
  ],
  [Biome.MOUNTAINS]: [
    { grade: 0xe8f0ff, gradeAlpha: 0.15, haze: 0xdde8f5, light: 0xffffff, lightAlpha: 0.25, particles: 'mist' },
    { grade: 0x8090a8, gradeAlpha: 0.4, haze: 0xa0a8b8, light: 0xd0e0ff, lightAlpha: 0.1, particles: 'snow' }
  ],
  [Biome.SNOW]: [
    { grade: 0xe0ecff, gradeAlpha: 0.2, haze: 0xf0f6ff, light: 0xffffff, lightAlpha: 0.25, particles: 'snow' },
    { grade: 0x9ab0d8, gradeAlpha: 0.4, haze: 0xc8d8f0, light: 0xd0e0ff, lightAlpha: 0.15, particles: 'snow' },
    { grade: 0x5070b0, gradeAlpha: 0.5, haze: 0x3a5080, light: 0x80ffd0, lightAlpha: 0.3, particles: 'snow' }
  ],
  [Biome.VOLCANIC]: [
    { grade: 0xff9070, gradeAlpha: 0.3, haze: 0xff6a3a, light: 0xff5a20, lightAlpha: 0.4, particles: 'embers' },
    { grade: 0xa08070, gradeAlpha: 0.35, haze: 0x806050, light: 0xff7a40, lightAlpha: 0.25, particles: 'ash' }
  ],
  [Biome.WASTELANDS]: [
    { grade: 0xb0b8a0, gradeAlpha: 0.35, haze: 0xa8b098, light: 0xd0ffb0, lightAlpha: 0.15, particles: 'ash' },
    {
      grade: 0x90c080,
      gradeAlpha: 0.35,
      haze: 0x8aa070,
      light: 0x9aff70,
      lightAlpha: 0.2,
      particles: 'motes',
      particleColor: 0x9aff70
    }
  ],
  [Biome.ABYSS]: [
    { grade: 0xc06080, gradeAlpha: 0.35, haze: 0x601830, light: 0xff3040, lightAlpha: 0.35, particles: 'embers' },
    {
      grade: 0x6040a0,
      gradeAlpha: 0.4,
      haze: 0x302050,
      light: 0xb070ff,
      lightAlpha: 0.3,
      particles: 'motes',
      particleColor: 0xb070ff
    }
  ]
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
/** Biomes whose foreground is grass (the rest: rocks). */
const GRASSY = new Set([Biome.MEADOWS, Biome.FOREST, Biome.TROPICAL, Biome.WASTELANDS])
/** The painting covers this much more than the screen, so panning never shows its edges. */
const BACKDROP_MARGIN = 1.18
/** How far the camera can pan, as a share of the width. */
export const MAX_PAN = 0.05

/** Something placed in the scene: its spot with the camera at rest, and how much it follows the camera. */
interface Placed {
  display: Container
  x: number
  factor: number
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

/**
 * The scenery around the fighters, drawn as layers at different depths so the
 * flat painting reads as a 3D place: when the camera pans, the sky barely
 * moves, the ground slides under the fighters and the foreground sweeps past
 * (the painting itself is a mesh whose rows follow the camera by their depth).
 * Each point of the map gets its own scene from its id: the light and weather,
 * props in the distance and behind the fighters, patches on the ground,
 * foreground silhouettes and what floats in the air.
 */
export class BattleScenery {
  /** Behind the fighters: the painting, the haze, far and middle props, ground patches. */
  readonly back = new Container()
  /** In front of the fighters: foreground silhouettes, particles, light and grade. */
  readonly front = new Container()
  private readonly mood: Mood
  private backdrop: MeshPlane | null = null
  private backdropRows: number[] = []
  private readonly placed: Placed[] = []
  private particles: Particle[] = []
  private readonly rays: Sprite[] = []
  private width = 0
  private height = 0
  private groundY = 0
  private horizonY = 0
  private time = 0

  constructor(
    private readonly seed: string,
    private readonly biome: Biome,
    private readonly painting: Texture | null,
    private readonly props: SceneryProp[]
  ) {
    const moods = MOODS[biome]

    // A different stream than the one of the layout, so the mood does not decide where the props go.
    this.mood = moods[Math.floor(createRandom(hashText(`${seed}:mood`))() * moods.length)]
  }

  /** Whether there is a final painting (otherwise the renderer draws a provisional sky and ground). */
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
    this.placed.length = 0
    this.rays.length = 0
    this.backdrop = null

    if (this.painting) {
      this.drawBackdrop(this.painting)
    } else {
      this.horizonY = groundY - 40 * scale
    }

    this.drawHaze()
    this.drawProps(random, scale)
    this.drawGroundPatches(random, scale)
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
      item.display.x = item.x - cameraX * item.factor
    }

    const seconds = deltaMS / 1000

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

  /** Props far away on the horizon and others behind the fighters, smaller and hazier with the distance. */
  private drawProps(random: Random, scale: number): void {
    if (this.props.length === 0) {
      return
    }

    const tallest = 1.8 * 120 * scale
    const far = 2 + Math.floor(random() * 3)
    const middle = 1 + Math.floor(random() * 3)
    const spots: { x: number; y: number; far: boolean }[] = []

    for (let index = 0; index < far; index++) {
      spots.push({
        x: random() * this.width,
        y: this.horizonY + (this.groundY - this.horizonY) * (0.05 + random() * 0.2),
        far: true
      })
    }

    for (let index = 0; index < middle; index++) {
      spots.push({
        x: random() * this.width,
        y: this.horizonY + (this.groundY - this.horizonY) * (0.25 + random() * 0.25),
        far: false
      })
    }

    // Farther first, so nearer props cover them.
    spots.sort((a, b) => a.y - b.y)

    for (const spot of spots) {
      const prop = this.props[Math.floor(random() * this.props.length)]
      const sprite = new Sprite(prop.texture)
      const height = tallest * prop.height * this.sizeAt(spot.y)
      const shadow = new Sprite(textures().soft)
      const holder = new Container()

      sprite.anchor.set(0.5, 0.96)
      sprite.scale.set((height / prop.texture.height) * (random() < 0.5 ? -1 : 1), height / prop.texture.height)
      sprite.tint = mix(0xffffff, this.mood.haze, spot.far ? 0.45 : 0.15)
      sprite.alpha = spot.far ? 0.8 : 0.95
      shadow.anchor.set(0.5)
      shadow.tint = 0x000000
      shadow.alpha = spot.far ? 0.15 : 0.3
      shadow.width = Math.abs(sprite.width) * 0.9
      shadow.height = Math.abs(sprite.width) * 0.18
      holder.addChild(shadow, sprite)
      holder.y = spot.y
      this.back.addChild(holder)
      this.placed.push({ display: holder, x: spot.x, factor: this.factorAt(spot.y) })
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
      patch.tint = dark ? 0x000000 : 0xffffff
      patch.alpha = dark ? 0.12 + random() * 0.1 : 0.06 + random() * 0.06
      patch.width = size * 2
      patch.height = size * 0.45
      patch.y = y
      this.back.addChild(patch)
      this.placed.push({ display: patch, x: random() * this.width, factor: this.factorAt(y) })
    }
  }

  /** Blurred dark silhouettes at the bottom corners, closer to the camera than the fighters. */
  private drawForeground(random: Random, scale: number): void {
    const layer = new Container()
    const color = mix(parseInt(BIOME_GROUND[this.biome].slice(1), 16), 0x000000, 0.78)
    const edges = random() < 0.35 ? ['left', 'right'] : [random() < 0.5 ? 'left' : 'right']

    layer.filters = [new BlurFilter({ strength: 3 * scale, quality: 2 })]

    for (const edge of edges) {
      const holder = new Container()
      const g = new Graphics()
      const width = this.width * (0.2 + random() * 0.12)
      const direction = edge === 'left' ? 1 : -1

      if (GRASSY.has(this.biome)) {
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
    const fromLeft = random() < 0.5
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

function canvasTexture(width: number, height: number, draw: (context: CanvasRenderingContext2D) => void): Texture {
  const canvas = document.createElement('canvas')

  canvas.width = width
  canvas.height = height
  draw(canvas.getContext('2d')!)

  return Texture.from(canvas)
}

function mix(a: number, b: number, share: number): number {
  const channel = (shift: number) =>
    Math.round(((a >> shift) & 0xff) * (1 - share) + ((b >> shift) & 0xff) * share) << shift

  return channel(16) | channel(8) | channel(0)
}
