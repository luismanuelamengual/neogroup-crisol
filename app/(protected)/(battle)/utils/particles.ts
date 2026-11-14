import { Container, Graphics, Renderer, Sprite, Texture } from 'pixi.js'
import { isHandheld } from '@/app/(protected)/(art)/utils/device'

/**
 * The small bits of the attack effects (embers, sparks, crystals, rocks...):
 * a few textures drawn by code once per battle and a pool of sprites that move,
 * shrink and fade on their own. Cheap enough for phones: no filters, a budget
 * of live particles, and a lighter quality that halves every burst.
 */

export type ParticleShape = 'dot' | 'spark' | 'shard' | 'flake' | 'rock' | 'ring' | 'leaf'

export type EffectQuality = 'high' | 'low'

/** How many particles may live at once in each quality. */
const BUDGET: Record<EffectQuality, number> = { high: 220, low: 90 }

export interface Emission {
  shape: ParticleShape
  x: number
  y: number
  count: number
  /** Colors, one picked per particle. */
  tint: number | number[]
  /** Pixels per second, a random value between both. */
  speed: [number, number]
  /** Direction in radians, and how far around it they spread (Math.PI * 2: every way). */
  angle?: number
  spread?: number
  /** Milliseconds, a random value between both. */
  life: [number, number]
  /** Size in pixels at birth and at death. */
  size: [number, number]
  /** Pixels per second squared, down (negative: they rise). */
  gravity?: number
  /** Share of the speed kept each second. */
  drag?: number
  /** The particles are born anywhere within this radius around (x, y). */
  radius?: number
  /** Radians per second. */
  spin?: number
  /** Added light (only for the small highlights: on the bright scenery it turns white) or solid (default). */
  glow?: boolean
  alpha?: number
}

interface Particle {
  sprite: Sprite
  vx: number
  vy: number
  gravity: number
  drag: number
  spin: number
  age: number
  life: number
  from: number
  to: number
  alpha: number
}

export class Particles {
  readonly view = new Container()
  private readonly textures: Record<ParticleShape, Texture>
  private readonly live: Particle[] = []
  private readonly pool: Sprite[] = []
  quality: EffectQuality

  constructor(renderer: Renderer, quality: EffectQuality) {
    this.quality = quality
    this.textures = drawTextures(renderer)
  }

  /** The texture of a shape, for effects that place their own sprites. */
  texture(shape: ParticleShape): Texture {
    return this.textures[shape]
  }

  /** Share of the particles a burst gets in the current quality. */
  get density(): number {
    return this.quality === 'high' ? 1 : 0.45
  }

  emit(emission: Emission): void {
    const count = Math.max(1, Math.round(emission.count * this.density))
    const tints = Array.isArray(emission.tint) ? emission.tint : [emission.tint]
    const angle = emission.angle ?? 0
    const spread = emission.spread ?? Math.PI * 2

    for (let index = 0; index < count && this.live.length < BUDGET[this.quality]; index++) {
      const sprite = this.pool.pop() ?? new Sprite()
      const direction = angle + (Math.random() - 0.5) * spread
      const speed = between(emission.speed)
      const reach = (emission.radius ?? 0) * Math.sqrt(Math.random())
      const around = Math.random() * Math.PI * 2
      const texture = this.textures[emission.shape]

      sprite.texture = texture
      sprite.anchor.set(0.5)
      sprite.tint = tints[Math.floor(Math.random() * tints.length)]
      sprite.blendMode = emission.glow ? 'add' : 'normal'
      sprite.position.set(emission.x + Math.cos(around) * reach, emission.y + Math.sin(around) * reach)
      sprite.rotation =
        emission.shape === 'spark' || emission.shape === 'shard' ? direction : Math.random() * Math.PI * 2
      sprite.visible = true
      this.view.addChild(sprite)
      this.live.push({
        sprite,
        vx: Math.cos(direction) * speed,
        vy: Math.sin(direction) * speed,
        gravity: emission.gravity ?? 0,
        drag: emission.drag ?? 1,
        spin: emission.spin ?? 0,
        age: 0,
        life: between(emission.life),
        from: emission.size[0] / texture.width,
        to: emission.size[1] / texture.width,
        alpha: emission.alpha ?? 1
      })
    }
  }

  /** Moves every particle `deltaMS` (already scaled by the speed of the battle). */
  update(deltaMS: number): void {
    const seconds = deltaMS / 1000

    for (let index = this.live.length - 1; index >= 0; index--) {
      const particle = this.live[index]

      particle.age += deltaMS

      if (particle.age >= particle.life) {
        particle.sprite.visible = false
        this.view.removeChild(particle.sprite)
        this.pool.push(particle.sprite)
        this.live.splice(index, 1)
        continue
      }

      const t = particle.age / particle.life
      const keep = Math.pow(particle.drag, seconds)

      particle.vx *= keep
      particle.vy = particle.vy * keep + particle.gravity * seconds
      particle.sprite.x += particle.vx * seconds
      particle.sprite.y += particle.vy * seconds
      particle.sprite.rotation += particle.spin * seconds
      particle.sprite.scale.set(particle.from + (particle.to - particle.from) * t)
      // Full while young, fading in the second half of its life.
      particle.sprite.alpha = particle.alpha * (t < 0.5 ? 1 : 1 - (t - 0.5) / 0.5)
    }
  }

  get count(): number {
    return this.live.length
  }

  destroy(): void {
    for (const sprite of [...this.pool, ...this.live.map((particle) => particle.sprite)]) {
      sprite.destroy()
    }

    for (const texture of Object.values(this.textures)) {
      texture.destroy(true)
    }
  }
}

function between([min, max]: [number, number]): number {
  return min + Math.random() * (max - min)
}

/** The shapes, in white (each particle gets its tint), 32 pixels wide. */
function drawTextures(renderer: Renderer): Record<ParticleShape, Texture> {
  const make = (draw: (g: Graphics) => void) => {
    const g = new Graphics()

    // An invisible frame, so every texture is centered and the same size.
    g.rect(-16, -16, 32, 32).fill({ color: 0xffffff, alpha: 0 })
    draw(g)

    const texture = renderer.generateTexture({ target: g, resolution: 2 })

    g.destroy()

    return texture
  }

  return {
    // A soft round glow: rings that get brighter towards the center.
    dot: make((g) => {
      for (let ring = 8; ring >= 1; ring--) {
        g.circle(0, 0, ring * 2).fill({ color: 0xffffff, alpha: 0.2 })
      }

      g.circle(0, 0, 7).fill({ color: 0xffffff })
    }),
    spark: make((g) => {
      g.poly([-16, 0, 0, -3, 16, 0, 0, 3]).fill({ color: 0xffffff, alpha: 0.5 })
      g.poly([-12, 0, 0, -1.5, 12, 0, 0, 1.5]).fill({ color: 0xffffff })
    }),
    shard: make((g) => {
      g.poly([-14, 0, -2, -6, 14, 0, -2, 6]).fill({ color: 0xffffff, alpha: 0.9 })
      g.poly([-8, 0, -1, -2.5, 10, 0, -1, 2.5]).fill({ color: 0xffffff })
    }),
    flake: make((g) => {
      for (let arm = 0; arm < 3; arm++) {
        const angle = (arm / 3) * Math.PI

        g.moveTo(Math.cos(angle) * -12, Math.sin(angle) * -12)
          .lineTo(Math.cos(angle) * 12, Math.sin(angle) * 12)
          .stroke({ width: 3, color: 0xffffff, cap: 'round' })
      }

      g.circle(0, 0, 3).fill({ color: 0xffffff })
    }),
    rock: make((g) => {
      g.poly([-11, -4, -4, -11, 8, -9, 12, 2, 5, 11, -7, 9])
        .fill({ color: 0xffffff })
        .stroke({ width: 2.5, color: 0x3a2a1c })
    }),
    ring: make((g) => {
      g.circle(0, 0, 13).stroke({ width: 3, color: 0xffffff })
    }),
    leaf: make((g) => {
      g.ellipse(0, 0, 12, 5).fill({ color: 0xffffff })
    })
  }
}

/**
 * The quality to start with: lighter on phones with few cores (the battle
 * lowers it later if the frames slow down, see BattleRenderer.animate).
 */
export function initialQuality(): EffectQuality {
  if (typeof window === 'undefined') {
    return 'high'
  }

  // A phone or a tablet starts light: its screen has many pixels to fill with each particle.
  return isHandheld() ? 'low' : 'high'
}

/** Whether the player asked the system for less motion: no shaking and soft flashes. */
export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false)
}
