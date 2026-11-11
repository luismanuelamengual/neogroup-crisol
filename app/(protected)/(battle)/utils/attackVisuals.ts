import { Container, Graphics } from 'pixi.js'
import { AttackEffect, Look, LOOK_COLORS, SEAL_COLORS, Strike } from '@/app/(protected)/(battle)/utils/attackEffects'
import { Particles } from '@/app/(protected)/(battle)/utils/particles'
import { DamageType } from '@/app/(protected)/(engine)/models/DamageType'
import { StatusType } from '@/app/(protected)/(engine)/models/StatusType'

/**
 * Draws the attack effects of attackEffects.ts on the battle stage: the shots,
 * rays and waves that carry each action to its targets, the mark of every blow
 * and the burst of its element. Everything is drawn by code, with Graphics that
 * live as long as their effect and the pooled particles of particles.ts.
 */

export interface Spot {
  x: number
  y: number
}

/** Where an effect starts: the hand (or the mouth) of the fighter, and the way it faces. */
export interface EffectSource {
  hand: Spot
  direction: 1 | -1
}

/** Where an effect lands on a fighter. */
export interface EffectTarget {
  id: string
  chest: Spot
  feet: Spot
  /** Its height in pixels on the stage. */
  height: number
}

/** What the battle tells the effects about each target: whether the blow missed or was critical. */
export interface HitOutcome {
  missed: boolean
  critical: boolean
}

/** What the effects need from the stage that hosts them. */
export interface EffectHost {
  /** Milliseconds at the current speed of the battle. */
  ms: (value: number) => number
  tween: (duration: number, update: (t: number) => void) => Promise<void>
  wait: (duration: number) => Promise<void>
  /** Size of the stage (1 on a common screen). */
  scale: number
  flash: (color: number, alpha: number, duration: number) => void
  shake: (duration: number, strength: number) => void
}

const OUTLINE = 0x0a0710
const GROUND_WAVES: Look[] = [DamageType.FIRE, DamageType.ICE, DamageType.EARTH, DamageType.LIGHTNING, DamageType.LIGHT]
const PRISM = [0xff7ab6, 0xfde047, 0x7dd3fc, 0xa78bfa]

export class AttackVisuals {
  constructor(
    private readonly host: EffectHost,
    /** Under the fighters: rings, cracks and spikes on the ground. */
    private readonly ground: Container,
    /** Over the fighters: shots, rays and bursts. */
    private readonly top: Container,
    private readonly particles: Particles
  ) {}

  private get s(): number {
    return this.host.scale
  }

  /**
   * Carries `effect` from `source` to every target and plays the impact on each
   * one. It resolves when the last impact lands, so the damage shows on it; the
   * effects keep fading on their own after that.
   */
  async deliver(
    effect: AttackEffect,
    source: EffectSource,
    targets: EffectTarget[],
    outcomes: Map<string, HitOutcome>
  ): Promise<void> {
    const land = (target: EffectTarget) => this.impact(effect, target, outcomes.get(target.id), source.direction)
    const stagger = (each: (target: EffectTarget) => Promise<void>, gap = 80) =>
      Promise.all(targets.map((target, index) => this.host.wait(this.host.ms(index * gap)).then(() => each(target))))

    switch (effect.delivery) {
      case 'contact':
        await stagger(async (target) => land(target), 70)
        break

      case 'bolt':
        await stagger((target) => this.bolt(effect, source, target).then(() => land(target)), 90)
        break

      case 'lance':
        await stagger((target) => this.lance(effect, source, target).then(() => land(target)), 90)
        break

      case 'shards':
        await stagger((target) => this.shards(effect, source, target).then(() => land(target)), 70)
        break

      case 'zigzag':
        await stagger((target) => this.zigzag(effect, source.hand, target.chest).then(() => land(target)), 90)
        break

      case 'chain':
        await this.chain(effect, source, targets, land)
        break

      case 'beam':
        await stagger((target) => this.beam(effect, source, target, () => land(target)), 120)
        break

      case 'drain':
        await stagger((target) => this.drain(effect, source, target, () => land(target)), 120)
        break

      case 'sky':
        await stagger((target) => this.sky(effect, target).then(() => land(target)), 110)
        break

      case 'meteor':
        await this.meteor(effect, source, targets).then(() => Promise.all(targets.map(land)))
        break

      case 'rise':
        await stagger((target) => this.rise(effect, target).then(() => land(target)), 100)
        break

      case 'breath':
        await this.breath(effect, source, targets, land)
        break

      case 'wave':
        await this.wave(effect, source, targets, land)
        break

      case 'storm':
        await this.storm(effect, source, targets, land)
        break

      case 'arrow':
        // The arrows fly in the stage (see BattleRenderer.shoot): only their impact is drawn here.
        await Promise.all(targets.map(land))
        break

      case 'aura':
        await stagger((target) => this.aura(effect, target), 90)
        break
    }
  }

  /** The circle of runes that opens before a spell, in front of the hand of the caster. */
  castCircle(look: Look, at: Spot, direction: 1 | -1, size = 1): Promise<void> {
    const colors = LOOK_COLORS[look]
    const g = this.add(new Graphics(), this.top)
    const radius = 22 * this.s * size
    const glyphs = look === 'arcane' ? SEAL_COLORS : [colors.glow, colors.accent, colors.core]

    g.position.set(at.x + 8 * direction * this.s, at.y)

    return this.host
      .tween(this.host.ms(300), (t) => {
        const open = Math.min(1, t / 0.4)
        const fade = t < 0.6 ? 1 : 1 - (t - 0.6) / 0.4

        g.clear()
        // Seen from the side: a tall ellipse, two rings and the glyphs going round.
        g.ellipse(0, 0, radius * 0.38 * open, radius * open).stroke({
          width: 3 * this.s,
          color: colors.glow,
          alpha: fade
        })
        g.ellipse(0, 0, radius * 0.26 * open, radius * 0.7 * open).stroke({
          width: 1.5 * this.s,
          color: colors.core,
          alpha: fade * 0.8
        })

        for (let index = 0; index < 6; index++) {
          const angle = (index / 6) * Math.PI * 2 + t * 4

          g.circle(Math.cos(angle) * radius * 0.38 * open, Math.sin(angle) * radius * open, 2.5 * this.s).fill({
            color: glyphs[index % glyphs.length],
            alpha: fade
          })
        }
      })
      .then(() => g.destroy())
  }

  /** The mark of the blow and the burst of its element, where it lands. */
  impact(effect: AttackEffect, target: EffectTarget, outcome: HitOutcome | undefined, direction: 1 | -1): void {
    if (outcome?.missed) {
      // A blow into the air: only a puff of dust beside the target.
      this.particles.emit({
        shape: 'dot',
        x: target.chest.x - 20 * direction * this.s,
        y: target.chest.y,
        count: 6,
        tint: 0xd6d3d1,
        speed: [30, 80],
        life: [240, 380],
        size: [10 * this.s, 22 * this.s],
        alpha: 0.45
      })

      return
    }

    const critical = !!outcome?.critical
    const size = effect.scale * (critical ? 1.3 : 1) * Math.max(0.8, target.height / (120 * this.s))

    if (effect.strike) {
      this.strike(effect.strike, effect.look, target.chest, direction, size, critical)
    }

    this.burst(effect.look, target.chest, size, !!effect.strike)

    if (critical) {
      this.host.shake(this.host.ms(200), 5)
    }
  }

  /** A slash, three claws, a thrust, a bite or the shockwave of a blow. */
  strike(kind: Strike, look: Look, at: Spot, direction: 1 | -1, size: number, critical: boolean): void {
    const colors = LOOK_COLORS[look]
    const radius = 46 * this.s * size

    switch (kind) {
      case 'slash':
        this.crescent(at, radius, -0.55, direction, colors.core, edgeOf(look))

        if (critical) {
          void this.host
            .wait(this.host.ms(70))
            .then(() => this.crescent(at, radius * 0.9, 0.65, direction, colors.core, edgeOf(look)))
        }

        break

      case 'claw':
        for (let index = 0; index < 3; index++) {
          const offset = (index - 1) * 16 * this.s * size

          void this.host
            .wait(this.host.ms(index * 35))
            .then(() =>
              this.crescent(
                { x: at.x + offset * 0.4, y: at.y + offset },
                radius * 0.8,
                -0.9,
                direction,
                colors.core,
                0xff4d6d,
                0.2
              )
            )
        }

        break

      case 'pierce':
        this.thrust(at, direction, radius * 1.4, colors)
        break

      case 'bite':
        this.bite(at, radius * 0.6)
        break

      case 'blunt':
        this.shockwave(at, radius, colors)
        break
    }
  }

  /** The burst of the element of the hit (small sparks for the physical ones that already drew their mark). */
  burst(look: Look, at: Spot, size: number, struck = false): void {
    const colors = LOOK_COLORS[look]
    const s = this.s * size
    const p = this.particles

    switch (look) {
      case DamageType.FIRE:
        this.glowFlash(at, 34 * s, colors.glow, 220)
        p.emit({
          shape: 'dot',
          x: at.x,
          y: at.y,
          count: 22,
          tint: [colors.core, colors.glow, colors.accent],
          speed: [60, 220],
          life: [300, 620],
          size: [16 * s, 3 * s],
          gravity: -160,
          drag: 0.2,
          radius: 10 * s
        })
        p.emit({
          shape: 'spark',
          x: at.x,
          y: at.y,
          count: 8,
          tint: colors.core,
          speed: [160, 320],
          life: [180, 320],
          size: [14 * s, 4 * s],
          drag: 0.1
        })
        break

      case DamageType.ICE:
        this.glowFlash(at, 30 * s, colors.glow, 200)
        p.emit({
          shape: 'shard',
          x: at.x,
          y: at.y,
          count: 14,
          tint: [colors.core, colors.glow],
          speed: [120, 300],
          life: [280, 480],
          size: [16 * s, 6 * s],
          gravity: 260,
          drag: 0.15
        })
        p.emit({
          shape: 'flake',
          x: at.x,
          y: at.y,
          count: 8,
          tint: colors.core,
          speed: [30, 90],
          life: [400, 700],
          size: [10 * s, 6 * s],
          spin: 3,
          radius: 18 * s
        })
        break

      case DamageType.LIGHTNING:
        this.glowFlash(at, 32 * s, colors.glow, 160)
        this.crackles(at, 30 * s, colors)
        p.emit({
          shape: 'spark',
          x: at.x,
          y: at.y,
          count: 16,
          tint: [colors.core, colors.glow, colors.accent],
          speed: [220, 420],
          life: [140, 280],
          size: [16 * s, 4 * s],
          drag: 0.05
        })
        break

      case DamageType.EARTH:
        p.emit({
          shape: 'rock',
          x: at.x,
          y: at.y,
          count: 9,
          tint: [colors.core, colors.glow, 0x8b5e34],
          speed: [120, 260],
          angle: -Math.PI / 2,
          spread: 2.4,
          life: [380, 600],
          size: [12 * s, 8 * s],
          gravity: 900,
          spin: 6
        })
        p.emit({
          shape: 'dot',
          x: at.x,
          y: at.y + 10 * s,
          count: 8,
          tint: 0xc9a27a,
          speed: [30, 90],
          life: [380, 600],
          size: [14 * s, 30 * s],
          alpha: 0.4
        })
        break

      case DamageType.LIGHT:
        this.rays(at, 40 * s, colors.glow, 8)
        p.emit({
          shape: 'dot',
          x: at.x,
          y: at.y,
          count: 14,
          tint: [colors.core, colors.glow, colors.accent],
          speed: [40, 140],
          life: [400, 700],
          size: [10 * s, 2 * s],
          gravity: -90,
          radius: 16 * s
        })
        break

      case DamageType.DARKNESS:
        this.implode(at, 38 * s, colors)
        p.emit({
          shape: 'dot',
          x: at.x,
          y: at.y,
          count: 16,
          tint: [colors.glow, colors.core, colors.accent],
          speed: [-140, -60],
          life: [300, 480],
          size: [12 * s, 3 * s],
          radius: 40 * s
        })
        break

      case 'poison':
        p.emit({
          shape: 'ring',
          x: at.x,
          y: at.y,
          count: 10,
          tint: [colors.core, colors.glow],
          speed: [20, 70],
          angle: -Math.PI / 2,
          spread: 2,
          life: [400, 700],
          size: [5 * s, 14 * s],
          gravity: -80,
          radius: 16 * s
        })
        p.emit({
          shape: 'dot',
          x: at.x,
          y: at.y,
          count: 10,
          tint: [colors.glow, colors.accent],
          speed: [40, 120],
          life: [300, 520],
          size: [14 * s, 4 * s],
          alpha: 0.7
        })
        break

      case 'arcane':
        this.glowFlash(at, 30 * s, colors.glow, 220)
        this.rings(at, 34 * s, SEAL_COLORS)
        p.emit({
          shape: 'dot',
          x: at.x,
          y: at.y,
          count: 14,
          tint: [...SEAL_COLORS, colors.core],
          speed: [80, 220],
          life: [260, 460],
          size: [10 * s, 3 * s],
          drag: 0.2
        })
        break

      case 'blood':
        p.emit({
          shape: 'dot',
          x: at.x,
          y: at.y,
          count: 10,
          tint: [colors.glow, colors.accent],
          speed: [80, 200],
          life: [300, 500],
          size: [8 * s, 4 * s],
          gravity: 700
        })
        break

      case 'heal':
        p.emit({
          shape: 'dot',
          x: at.x,
          y: at.y,
          count: 12,
          tint: [colors.core, colors.glow, colors.accent],
          speed: [20, 70],
          life: [500, 800],
          size: [10 * s, 3 * s],
          gravity: -120,
          radius: 24 * s
        })
        break

      default:
        // Physical: a short spray of sparks (bigger when the blow drew no mark of its own).
        p.emit({
          shape: 'spark',
          x: at.x,
          y: at.y,
          count: struck ? 7 : 12,
          tint: [colors.core, colors.accent],
          speed: [160, 340],
          life: [140, 260],
          size: [14 * s, 4 * s],
          drag: 0.05
        })

        if (!struck) {
          this.glowFlash(at, 24 * s, colors.glow, 160)
        }

        break
    }
  }

  /** Over an ally or the caster: a ring that opens at the feet, rising sparks, and a shield when it guards. */
  async aura(effect: AttackEffect, target: EffectTarget): Promise<void> {
    const colors = LOOK_COLORS[effect.look]
    const ring = this.add(new Graphics(), this.ground)
    const width = target.height * 0.42
    const s = this.s

    ring.position.set(target.feet.x, target.feet.y)
    this.particles.emit({
      shape: effect.look === DamageType.EARTH ? 'leaf' : 'dot',
      x: target.feet.x,
      y: target.feet.y - target.height * 0.3,
      count: 26,
      tint: [colors.core, colors.glow, colors.accent],
      speed: [10, 40],
      life: [600, 900],
      size: [18 * s, 5 * s],
      gravity: -160,
      radius: width * 0.8,
      spin: 2
    })

    if (effect.shield) {
      void this.shield(target, colors)
    }

    await this.host.tween(this.host.ms(460), (t) => {
      ring.clear()
      ring.ellipse(0, 0, width * (0.4 + t * 0.8), width * 0.28 * (0.4 + t * 0.8)).stroke({
        width: 4 * s,
        color: colors.glow,
        alpha: 1 - t
      })
      ring.ellipse(0, 0, width * 0.9 * t, width * 0.25 * t).fill({ color: colors.glow, alpha: 0.25 * (1 - t) })
    })
    ring.destroy()
  }

  /** A shield of hexagons around the target that shines and fades. */
  private shield(target: EffectTarget, colors: { core: number; glow: number; accent: number }): Promise<void> {
    const g = this.add(new Graphics(), this.top)
    const radius = target.height * 0.62

    g.position.set(target.chest.x, target.chest.y)

    return this.host
      .tween(this.host.ms(620), (t) => {
        const open = Math.min(1, t / 0.25)
        const fade = t < 0.6 ? 1 : 1 - (t - 0.6) / 0.4
        const r = radius * (0.85 + open * 0.15)
        const corners: number[] = []

        for (let corner = 0; corner < 6; corner++) {
          const angle = (corner / 6) * Math.PI * 2 + Math.PI / 6

          corners.push(Math.cos(angle) * r * 0.8, Math.sin(angle) * r)
        }

        g.clear()
        g.poly(corners).fill({ color: colors.glow, alpha: 0.18 * fade * open })
        g.poly(corners).stroke({ width: 3 * this.s, color: colors.core, alpha: fade * open })

        // A smaller hexagon inside, and a shine that runs across it.
        g.poly(corners.map((value) => value * 0.55)).stroke({
          width: 1.5 * this.s,
          color: colors.glow,
          alpha: 0.7 * fade * open
        })
        g.rect(-r * 0.8 + r * 1.6 * t - 4 * this.s, -r * 0.7, 8 * this.s, r * 1.4).fill({
          color: 0xffffff,
          alpha: 0.25 * fade
        })
      })
      .then(() => g.destroy())
  }

  /** The particles of a status that hurts at the start of a turn: embers, bubbles or drops. */
  statusTick(status: StatusType, target: EffectTarget): void {
    const s = this.s
    const look: Look = status === StatusType.BURN ? DamageType.FIRE : status === StatusType.POISON ? 'poison' : 'blood'
    const colors = LOOK_COLORS[look]

    this.particles.emit({
      shape: look === 'poison' ? 'ring' : 'dot',
      x: target.chest.x,
      y: target.chest.y,
      count: 10,
      tint: [colors.core, colors.glow, colors.accent],
      speed: [20, 70],
      angle: look === 'blood' ? Math.PI / 2 : -Math.PI / 2,
      spread: 1.6,
      life: [400, 700],
      size: [10 * s, 3 * s],
      gravity: look === 'blood' ? 500 : -120,
      radius: target.height * 0.22
    })
  }

  /** Sparks that leave a point towards another (Ysolde's charges going into her spell). */
  stream(from: Spot, to: Spot, color: number): void {
    const angle = Math.atan2(to.y - from.y, to.x - from.x)
    const distance = Math.hypot(to.x - from.x, to.y - from.y)

    this.particles.emit({
      shape: 'dot',
      x: from.x,
      y: from.y,
      count: 6,
      tint: color,
      speed: [distance * 2.4, distance * 3],
      angle,
      spread: 0.3,
      life: [300, 360],
      size: [12 * this.s, 4 * this.s],
      drag: 0.05
    })
  }

  // The deliveries.

  /** A glowing shot along a low arc, with a trail of its element. */
  private bolt(effect: AttackEffect, source: EffectSource, target: EffectTarget): Promise<void> {
    const colors = LOOK_COLORS[effect.look]
    const look = effect.look
    const s = this.s * effect.scale
    const head = this.add(new Graphics(), this.top)
    const start = source.hand
    const end = target.chest
    const distance = Math.hypot(end.x - start.x, end.y - start.y)
    const lift = distance * 0.08
    const rock = look === DamageType.EARTH

    if (rock) {
      head
        .poly([-11, -4, -4, -11, 8, -9, 12, 2, 5, 11, -7, 9].map((value) => value * s * 1.1))
        .fill({ color: colors.glow })
        .stroke({ width: 2.5 * this.s, color: OUTLINE })
    } else {
      glowBall(head, 22 * s, colors)
    }

    let frame = 0

    return this.host
      .tween(this.host.ms(Math.min(420, 200 + distance * 0.25)), (t) => {
        const x = start.x + (end.x - start.x) * t
        const y = start.y + (end.y - start.y) * t - Math.sin(t * Math.PI) * lift

        head.position.set(x, y)
        head.rotation += rock ? 0.3 : 0.15
        head.scale.set(1 + Math.sin(t * 30) * 0.08)

        if (look === 'arcane') {
          // The three seals of the tome go round the shot.
          head.clear()
          glowBall(head, 18 * s, colors)

          for (let index = 0; index < 3; index++) {
            const angle = t * 18 + (index / 3) * Math.PI * 2

            head
              .circle(Math.cos(angle) * 27 * s, Math.sin(angle) * 27 * s, 6 * s)
              .fill({ color: SEAL_COLORS[index] })
              .stroke({ width: 2 * this.s, color: OUTLINE })
          }
        }

        if (frame++ % 2 === 0) {
          this.particles.emit({
            shape: rock ? 'rock' : 'dot',
            x,
            y,
            count: rock ? 1 : 4,
            tint: look === 'arcane' ? SEAL_COLORS : [colors.core, colors.glow, colors.accent],
            speed: [10, 50],
            life: [200, 380],
            size: rock ? [8 * s, 4 * s] : [24 * s, 4 * s],
            gravity: look === DamageType.FIRE ? -120 : rock ? 400 : 0,
            radius: 4 * s
          })
        }
      })
      .then(() => head.destroy())
  }

  /** A crystal spear that flies straight and breaks on the target. */
  private lance(effect: AttackEffect, source: EffectSource, target: EffectTarget): Promise<void> {
    const colors = LOOK_COLORS[effect.look]
    const s = this.s * effect.scale
    const spear = this.add(new Graphics(), this.top)
    const start = source.hand
    const end = target.chest
    const length = 66 * s

    spear
      .poly([0, 0, -length * 0.3, -6 * s, -length, -3 * s, -length * 1.1, 0, -length, 3 * s, -length * 0.3, 6 * s])
      .fill({ color: colors.glow, alpha: 0.9 })
      .stroke({ width: 2 * this.s, color: colors.core })
    spear.poly([0, 0, -length * 0.5, -2 * s, -length * 0.5, 2 * s]).fill({ color: colors.core })
    spear.rotation = Math.atan2(end.y - start.y, end.x - start.x)

    return this.host
      .tween(this.host.ms(240), (t) => {
        const eased = t * t
        const x = start.x + (end.x - start.x) * eased
        const y = start.y + (end.y - start.y) * eased

        spear.position.set(x, y)
        this.particles.emit({
          shape: 'flake',
          x,
          y,
          count: 1,
          tint: colors.core,
          speed: [5, 30],
          life: [300, 500],
          size: [8 * s, 3 * s],
          spin: 4
        })
      })
      .then(() => spear.destroy())
  }

  /** A fan of small crystals that leave the hand and close on the target. */
  private async shards(effect: AttackEffect, source: EffectSource, target: EffectTarget): Promise<void> {
    const colors = LOOK_COLORS[effect.look]
    const count = this.particles.quality === 'high' ? 5 : 3
    const flights: Promise<void>[] = []

    for (let index = 0; index < count; index++) {
      const shard = this.add(new Graphics(), this.top)
      const bend = (index - (count - 1) / 2) * 34 * this.s
      const start = source.hand
      const end = target.chest

      shard
        .poly([10, 0, -2, -4, -10, 0, -2, 4].map((value) => value * this.s * 1.7))
        .fill({ color: colors.core })
        .stroke({ width: 1.5 * this.s, color: colors.accent })
      flights.push(
        this.host.wait(this.host.ms(index * 30)).then(() =>
          this.host
            .tween(this.host.ms(230), (t) => {
              const x = start.x + (end.x - start.x) * t
              const y = start.y + (end.y - start.y) * t + Math.sin(t * Math.PI) * bend

              shard.rotation = Math.atan2(y - shard.y, x - shard.x)
              shard.position.set(x, y)
            })
            .then(() => shard.destroy())
        )
      )
    }

    await Promise.all(flights)
  }

  /** An instant lightning between two points, that flickers two or three times. */
  private zigzag(effect: AttackEffect, from: Spot, to: Spot, duration = 260): Promise<void> {
    const colors = LOOK_COLORS[effect.look === DamageType.LIGHTNING ? DamageType.LIGHTNING : effect.look]
    const g = this.add(new Graphics(), this.top)
    const width = 4.5 * this.s * effect.scale
    let shape = -1

    this.host.flash(colors.core, 0.12, this.host.ms(120))

    return this.host
      .tween(this.host.ms(duration), (t) => {
        const step = Math.floor(t * 3)

        // A new shape each third of its life, fading in the last one.
        if (step !== shape) {
          shape = step

          const points = jagged(from, to, 9, 16 * this.s)

          g.clear()
          path(g, points, width * 5, colors.glow, 0.3)
          path(g, points, width * 2.6, colors.accent, 0.9)
          path(g, points, width * 1.8, colors.glow, 1)
          path(g, points, width, colors.core, 1)
        }

        g.alpha = t < 0.66 ? 1 : 1 - (t - 0.66) / 0.34
      })
      .then(() => g.destroy())
  }

  /** A lightning that jumps from the hand to the first target, from it to the next one, and so on. */
  private async chain(
    effect: AttackEffect,
    source: EffectSource,
    targets: EffectTarget[],
    land: (target: EffectTarget) => void
  ): Promise<void> {
    let from = source.hand

    for (const target of targets) {
      const to = target.chest

      void this.zigzag(effect, from, to, 300)
      await this.host.wait(this.host.ms(110))
      land(target)
      from = to
    }
  }

  /** A ray that grows from the hand, holds for a moment with prism edges and fades. */
  private beam(effect: AttackEffect, source: EffectSource, target: EffectTarget, land: () => void): Promise<void> {
    const colors = LOOK_COLORS[effect.look]
    const g = this.add(new Graphics(), this.top)
    const from = source.hand
    const to = target.chest
    const length = Math.hypot(to.x - from.x, to.y - from.y)
    const thick = 9 * this.s * effect.scale
    let landed = false

    g.position.set(from.x, from.y)
    g.rotation = Math.atan2(to.y - from.y, to.x - from.x)

    return this.host
      .tween(this.host.ms(460), (t) => {
        const reach = length * Math.min(1, t / 0.25)
        const fade = t < 0.75 ? 1 : 1 - (t - 0.75) / 0.25
        const wobble = 1 + Math.sin(t * 50) * 0.12

        if (!landed && t >= 0.25) {
          landed = true
          land()
        }

        g.clear()
        g.rect(0, -thick * 1.6 * wobble, reach, thick * 3.2 * wobble).fill({ color: colors.glow, alpha: 0.22 * fade })

        // The prism edges: thin bands of color on both sides of the core.
        PRISM.forEach((color, index) => {
          const offset = thick * (0.55 + index * 0.22) * wobble

          g.rect(0, -offset, reach, thick * 0.3).fill({ color, alpha: 0.85 * fade })
          g.rect(0, offset - thick * 0.3, reach, thick * 0.3).fill({ color, alpha: 0.85 * fade })
        })
        g.rect(0, -thick * 0.45, reach, thick * 0.9).fill({ color: colors.core, alpha: fade })
        g.circle(0, 0, thick * 1.3 * wobble).fill({ color: colors.core, alpha: 0.6 * fade })

        if (landed) {
          g.circle(length, 0, thick * 1.8 * wobble).fill({ color: colors.glow, alpha: 0.4 * fade })
        }
      })
      .then(() => g.destroy())
  }

  /** A dark thread from the target to the caster, with motes that flow along it. */
  private drain(effect: AttackEffect, source: EffectSource, target: EffectTarget, land: () => void): Promise<void> {
    const colors = LOOK_COLORS[effect.look]
    const g = this.add(new Graphics(), this.top)
    const from = target.chest
    const to = source.hand
    let frame = 0

    land()

    return this.host
      .tween(this.host.ms(480), (t) => {
        const points: Spot[] = []

        for (let index = 0; index <= 12; index++) {
          const share = index / 12
          const wave = Math.sin(share * Math.PI * 3 + t * 14) * 10 * this.s * Math.sin(share * Math.PI)

          points.push({ x: from.x + (to.x - from.x) * share, y: from.y + (to.y - from.y) * share + wave })
        }

        g.clear()
        path(g, points, 7 * this.s, colors.glow, 0.35 * (1 - t))
        path(g, points, 2.5 * this.s, colors.core, 1 - t)

        if (frame++ % 3 === 0) {
          this.stream(from, to, colors.glow)
        }
      })
      .then(() => g.destroy())
  }

  /** It falls from above on the target: a lightning, a pillar of light, crystals or rocks. */
  private async sky(effect: AttackEffect, target: EffectTarget): Promise<void> {
    const colors = LOOK_COLORS[effect.look]
    const top = { x: target.feet.x + (Math.random() - 0.5) * 40 * this.s, y: target.chest.y - 360 * this.s }

    switch (effect.look) {
      case DamageType.LIGHTNING:
        this.host.flash(colors.core, 0.15, this.host.ms(140))
        await this.zigzag(effect, top, target.feet, 220)
        this.shockwave(target.feet, 30 * this.s * effect.scale, colors, this.ground)

        return

      case DamageType.LIGHT:
        await this.pillar(target, colors, effect.scale)

        return

      default: {
        // Crystals, rocks or orbs that fall one after the other.
        const count = this.particles.quality === 'high' ? 3 : 2
        const falls: Promise<void>[] = []

        for (let index = 0; index < count; index++) {
          const piece = this.add(new Graphics(), this.top)
          const x = target.chest.x + (index - (count - 1) / 2) * 18 * this.s
          const s = this.s * effect.scale

          if (effect.look === DamageType.ICE) {
            piece
              .poly([0, 16, -6, -4, 0, -18, 6, -4].map((value) => value * s * 1.8))
              .fill({ color: colors.glow, alpha: 0.9 })
              .stroke({ width: 2 * this.s, color: colors.core })
          } else if (effect.look === DamageType.EARTH) {
            piece
              .poly([-11, -4, -4, -11, 8, -9, 12, 2, 5, 11, -7, 9].map((value) => value * s * 2))
              .fill({ color: colors.glow })
              .stroke({ width: 2.5 * this.s, color: OUTLINE })
          } else {
            glowBall(piece, 14 * s, colors)
          }

          falls.push(
            this.host
              .wait(this.host.ms(index * 60))
              .then(() =>
                this.host
                  .tween(this.host.ms(200), (t) => piece.position.set(x, top.y + (target.chest.y - top.y) * t * t))
                  .then(() => piece.destroy())
              )
          )
        }

        await Promise.all(falls)
      }
    }
  }

  /** A column of light over the target, wide then thin, with sparks that rise inside it. */
  private pillar(
    target: EffectTarget,
    colors: { core: number; glow: number; accent: number },
    scale: number
  ): Promise<void> {
    const g = this.add(new Graphics(), this.top)
    const height = 420 * this.s
    const width = 30 * this.s * scale
    let landed = false

    g.position.set(target.feet.x, target.feet.y)

    return new Promise((resolve) => {
      void this.host
        .tween(this.host.ms(480), (t) => {
          const open = t < 0.3 ? t / 0.3 : 1 - (t - 0.3) / 0.7

          if (!landed && t >= 0.3) {
            landed = true
            resolve()
          }

          g.clear()
          g.rect(-width * open, -height, width * 2 * open, height).fill({ color: colors.glow, alpha: 0.25 })
          g.rect(-width * 0.45 * open, -height, width * 0.9 * open, height).fill({ color: colors.core, alpha: 0.7 })
          g.ellipse(0, 0, width * 1.8 * open, width * 0.5 * open).fill({ color: colors.glow, alpha: 0.5 })

          if (Math.random() < 0.5) {
            this.particles.emit({
              shape: 'dot',
              x: target.feet.x,
              y: target.feet.y - 10 * this.s,
              count: 2,
              tint: [colors.core, colors.accent],
              speed: [120, 220],
              angle: -Math.PI / 2,
              spread: 0.3,
              life: [300, 500],
              size: [8 * this.s, 2 * this.s],
              radius: width * 0.5
            })
          }
        })
        .then(() => g.destroy())
    })
  }

  /** A big burning rock that falls from the sky on the middle of the targets and blows up on all of them. */
  private async meteor(effect: AttackEffect, source: EffectSource, targets: EffectTarget[]): Promise<void> {
    const colors = LOOK_COLORS[effect.look]
    const s = this.s * effect.scale
    const center = {
      x: targets.reduce((sum, target) => sum + target.chest.x, 0) / targets.length,
      y: targets.reduce((sum, target) => sum + target.feet.y, 0) / targets.length - 20 * this.s
    }
    const start = { x: center.x - source.direction * 220 * this.s, y: center.y - 420 * this.s }
    const rock = this.add(new Graphics(), this.top)

    glowBall(rock, 44 * s, colors)

    await this.host.tween(this.host.ms(420), (t) => {
      const eased = t * t
      const x = start.x + (center.x - start.x) * eased
      const y = start.y + (center.y - start.y) * eased

      rock.position.set(x, y)
      this.particles.emit({
        shape: 'dot',
        x,
        y,
        count: 3,
        tint: [colors.core, colors.glow, colors.accent],
        speed: [20, 80],
        life: [260, 460],
        size: [26 * s, 4 * s],
        gravity: -80,
        radius: 14 * s
      })
    })
    rock.destroy()
    this.host.flash(colors.glow, 0.3, this.host.ms(260))
    this.host.shake(this.host.ms(420), 12)
    this.glowFlash(center, 90 * s, colors.glow, 360)
    this.shockwave(center, 120 * s, colors, this.ground)
  }

  /** It grows from the ground under the target: spikes, roots, a pillar of fire, a whirl or an ice block. */
  private async rise(effect: AttackEffect, target: EffectTarget): Promise<void> {
    const colors = LOOK_COLORS[effect.look]
    const s = this.s * effect.scale
    const g = this.add(new Graphics(), this.top)
    const base = this.add(new Graphics(), this.ground)
    const { x, y } = target.feet
    const width = target.height * 0.4
    const look = effect.look
    const ice = look === DamageType.ICE
    const fire = look === DamageType.FIRE
    const solid = look === DamageType.EARTH || look === 'poison'
    const spikes = [-0.7, -0.25, 0.2, 0.65].map((share, index) => ({
      x: share * width,
      height: (0.55 + ((index * 37) % 10) / 20) * target.height * 0.55
    }))
    let landed = false

    g.position.set(x, y)
    base.position.set(x, y)

    await new Promise<void>((resolve) => {
      void this.host
        .tween(this.host.ms(ice ? 620 : 520), (t) => {
          const grow = Math.min(1, t / 0.3)
          const fade = t < 0.65 ? 1 : 1 - (t - 0.65) / 0.35

          if (!landed && t >= 0.3) {
            landed = true
            resolve()
          }

          g.clear()
          base.clear()
          base.ellipse(0, 0, width * 1.3 * grow, width * 0.32 * grow).fill({ color: colors.glow, alpha: 0.35 * fade })

          if (solid) {
            // Spikes of rock (or thorns) that come out of the ground and sink again.
            const sink = t < 0.65 ? 1 : fade

            for (const spike of spikes) {
              const top = spike.height * grow * sink

              g.poly([spike.x - 11 * s, 0, spike.x, -top, spike.x + 11 * s, 0])
                .fill({ color: look === 'poison' ? colors.accent : colors.glow })
                .stroke({ width: 2.5 * this.s, color: OUTLINE })
            }
          } else if (ice) {
            // A block of ice around the figure.
            const h = target.height * 1.05 * grow
            const w = width * 1.1

            g.poly([-w, 0, -w * 1.1, -h * 0.6, -w * 0.5, -h, w * 0.6, -h * 0.92, w * 1.1, -h * 0.5, w, 0])
              .fill({ color: colors.glow, alpha: 0.35 * fade })
              .stroke({ width: 3 * this.s, color: colors.core, alpha: fade })
            g.moveTo(-w * 0.4, -h * 0.2)
              .lineTo(-w * 0.1, -h * 0.8)
              .stroke({ width: 2 * this.s, color: colors.core, alpha: 0.7 * fade })
          } else if (fire) {
            const h = target.height * 1.4 * grow

            g.rect(-width * 0.5, -h, width, h).fill({ color: colors.glow, alpha: 0.35 * fade })
            g.rect(-width * 0.22, -h, width * 0.44, h).fill({ color: colors.core, alpha: 0.5 * fade })
            this.particles.emit({
              shape: 'dot',
              x,
              y: y - 6 * this.s,
              count: 3,
              tint: [colors.core, colors.glow, colors.accent],
              speed: [200, 380],
              angle: -Math.PI / 2,
              spread: 0.35,
              life: [260, 420],
              size: [22 * s, 4 * s],
              radius: width * 0.4
            })
          } else {
            // A whirl on the ground that pulls everything in.
            for (let ring = 0; ring < 3; ring++) {
              const turn = t * 6 + ring * 2

              g.ellipse(0, 0, width * (1.2 - ring * 0.3) * grow, width * (0.3 - ring * 0.07) * grow).stroke({
                width: 3 * this.s,
                color: ring === 1 ? colors.core : colors.glow,
                alpha: fade
              })
              g.circle(
                Math.cos(turn) * width * (1.2 - ring * 0.3),
                Math.sin(turn) * width * (0.3 - ring * 0.07),
                3 * this.s
              ).fill({ color: colors.core, alpha: fade })
            }

            if (Math.random() < 0.6) {
              this.particles.emit({
                shape: 'dot',
                x,
                y: y - 4 * this.s,
                count: 2,
                tint: [colors.glow, colors.core],
                speed: [80, 160],
                angle: -Math.PI / 2,
                spread: 0.6,
                life: [300, 500],
                size: [10 * s, 2 * s],
                radius: width
              })
            }
          }
        })
        .then(() => {
          g.destroy()
          base.destroy()

          if (ice) {
            this.burst(DamageType.ICE, target.chest, effect.scale)
          }
        })
    })
  }

  /** A cone of fire or frost from the front of the caster, on every target. */
  private async breath(
    effect: AttackEffect,
    source: EffectSource,
    targets: EffectTarget[],
    land: (target: EffectTarget) => void
  ): Promise<void> {
    const colors = LOOK_COLORS[effect.look]
    const center = {
      x: targets.reduce((sum, target) => sum + target.chest.x, 0) / targets.length,
      y: targets.reduce((sum, target) => sum + target.chest.y, 0) / targets.length
    }
    const distance = Math.hypot(center.x - source.hand.x, center.y - source.hand.y)
    const angle = Math.atan2(center.y - source.hand.y, center.x - source.hand.x)
    const life = 420
    const landed = new Set<string>()

    await this.host.tween(this.host.ms(560), (t) => {
      if (t < 0.75) {
        this.particles.emit({
          shape: effect.look === DamageType.ICE ? 'flake' : 'dot',
          x: source.hand.x,
          y: source.hand.y,
          count: 7,
          tint: [colors.core, colors.glow, colors.accent],
          speed: [distance * 1.9, distance * 2.6],
          angle,
          spread: 0.42,
          life: [life * 0.8, life],
          size: [14 * this.s, 46 * this.s],
          spin: 3,
          alpha: 0.85
        })
      }

      for (const target of targets) {
        if (!landed.has(target.id) && t > 0.35 + landed.size * 0.06) {
          landed.add(target.id)
          land(target)
        }
      }
    })
  }

  /** A front that sweeps the line of the targets from the nearest one: a wall of fire, frost, a scream. */
  private async wave(
    effect: AttackEffect,
    source: EffectSource,
    targets: EffectTarget[],
    land: (target: EffectTarget) => void
  ): Promise<void> {
    const colors = LOOK_COLORS[effect.look]
    const s = this.s * effect.scale
    const xs = targets.map((target) => target.feet.x)
    const ground = targets.reduce((sum, target) => sum + target.feet.y, 0) / targets.length
    const from = source.direction === 1 ? Math.min(...xs) - 80 * this.s : Math.max(...xs) + 80 * this.s
    const to = source.direction === 1 ? Math.max(...xs) + 60 * this.s : Math.min(...xs) - 60 * this.s
    const landed = new Set<string>()
    const scream = !GROUND_WAVES.includes(effect.look)
    const g = this.add(new Graphics(), scream ? this.top : this.ground)

    if (effect.look === DamageType.ICE) {
      this.host.flash(colors.core, effect.scale > 1.3 ? 0.3 : 0.12, this.host.ms(300))
    }

    await this.host.tween(this.host.ms(620), (t) => {
      const front = from + (to - from) * t

      g.clear()

      if (scream) {
        // Rings that leave the caster and pass through the targets.
        for (let ring = 0; ring < 3; ring++) {
          const share = Math.max(0, t - ring * 0.12)
          const radius = (Math.abs(front - source.hand.x) * share) / Math.max(0.01, t)

          g.ellipse(source.hand.x, source.hand.y, radius, radius * 0.7).stroke({
            width: 9 * this.s,
            color: colors.glow,
            alpha: 0.35 * (1 - t)
          })
          g.ellipse(source.hand.x, source.hand.y, radius, radius * 0.7).stroke({
            width: 3.5 * this.s,
            color: ring === 0 ? colors.core : colors.glow,
            alpha: 0.9 * (1 - t)
          })
        }
      } else {
        // The front on the ground, and what it leaves behind.
        g.ellipse(front, ground, 50 * s, 14 * s).fill({ color: colors.glow, alpha: 0.4 * (1 - t * 0.5) })
        this.particles.emit({
          shape: effect.look === DamageType.ICE ? 'shard' : effect.look === DamageType.EARTH ? 'rock' : 'dot',
          x: front,
          y: ground - 10 * this.s,
          count: 3,
          tint: [colors.core, colors.glow, colors.accent],
          speed: [120, 300],
          angle: -Math.PI / 2,
          spread: 0.7,
          life: [260, 480],
          size: [26 * s, 5 * s],
          gravity: effect.look === DamageType.EARTH ? 900 : effect.look === DamageType.ICE ? 500 : -120,
          radius: 26 * s
        })
      }

      for (const target of targets) {
        const passed = source.direction === 1 ? front >= target.feet.x : front <= target.feet.x

        if (passed && !landed.has(target.id)) {
          landed.add(target.id)
          land(target)
        }
      }
    })
    g.destroy()

    for (const target of targets) {
      if (!landed.has(target.id)) {
        land(target)
      }
    }
  }

  /** Particles that cross the whole line of the targets: a blizzard, a sandstorm, a cloud of spores. */
  private async storm(
    effect: AttackEffect,
    source: EffectSource,
    targets: EffectTarget[],
    land: (target: EffectTarget) => void
  ): Promise<void> {
    const colors = LOOK_COLORS[effect.look]
    const xs = targets.map((target) => target.chest.x)
    const top = Math.min(...targets.map((target) => target.feet.y - target.height))
    const bottom = Math.max(...targets.map((target) => target.feet.y))
    const left = Math.min(...xs) - 120 * this.s
    const right = Math.max(...xs) + 120 * this.s
    const start = source.direction === 1 ? left : right
    const shape = effect.look === DamageType.ICE ? 'flake' : 'dot'
    const solid = effect.look === DamageType.EARTH

    for (let index = 0; index < 8; index++) {
      void this.host.wait(this.host.ms(index * 60)).then(() =>
        this.particles.emit({
          shape,
          x: start,
          y: top + (bottom - top) * Math.random(),
          count: 8,
          tint: [colors.core, colors.glow, colors.accent],
          speed: [(right - left) * 1.6, (right - left) * 2.2],
          angle: source.direction === 1 ? 0.25 : Math.PI - 0.25,
          spread: 0.35,
          life: [460, 600],
          size: solid ? [18 * this.s, 34 * this.s] : [20 * this.s, 12 * this.s],
          radius: (bottom - top) * 0.4,
          spin: 4,
          alpha: solid ? 0.5 : 0.9
        })
      )
    }

    await this.host.wait(this.host.ms(260))

    for (const target of targets) {
      land(target)
      await this.host.wait(this.host.ms(70))
    }
  }

  // The marks.

  /** A curved cut that sweeps open across the point, thick in the middle and thin at its ends. */
  private crescent(
    at: Spot,
    radius: number,
    tilt: number,
    direction: 1 | -1,
    core: number,
    edge: number,
    width = 0.28
  ): void {
    const g = this.add(new Graphics(), this.top)
    const span = Math.PI * 0.8
    // The arc is drawn around (0, 0): moved back so its middle crosses the point hit.
    const center = -radius * 0.8

    g.position.set(at.x, at.y)
    g.rotation = tilt
    g.scale.x = direction
    void this.host
      .tween(this.host.ms(300), (t) => {
        const reveal = Math.min(1, t / 0.35)
        const fade = t < 0.4 ? 1 : 1 - (t - 0.4) / 0.6
        const grow = 1 + t * 0.12

        const crescent = (thick: number) => {
          const outer: number[] = []
          const inner: number[] = []
          const steps = 16

          for (let step = 0; step <= steps; step++) {
            const share = step / steps
            const angle = -span / 2 + span * share * reveal
            // Thick near the head of the cut, thin at its tail.
            const thickness = radius * thick * Math.sin(Math.PI * Math.pow(share, 0.7)) * (0.4 + 0.6 * fade)
            const r = radius * grow

            outer.push(center + Math.cos(angle) * r, Math.sin(angle) * r)
            inner.push(center + Math.cos(angle) * (r - thickness), Math.sin(angle) * (r - thickness))
          }

          // Along the outer edge and back along the inner one.
          return [...outer, ...pairsReversed(inner)]
        }

        g.clear()
        g.poly(crescent(width * 1.7)).fill({ color: edge, alpha: 0.5 * fade })
        g.poly(crescent(width)).fill({ color: core, alpha: 0.95 * fade })
      })
      .then(() => g.destroy())
  }

  /** A long thin flash through the target in the way of the blow, with sparks that jump back. */
  private thrust(
    at: Spot,
    direction: 1 | -1,
    length: number,
    colors: { core: number; glow: number; accent: number }
  ): void {
    const g = this.add(new Graphics(), this.top)

    g.position.set(at.x, at.y)
    g.scale.x = direction
    this.particles.emit({
      shape: 'spark',
      x: at.x,
      y: at.y,
      count: 8,
      tint: [colors.core, colors.accent],
      speed: [160, 320],
      angle: direction === 1 ? Math.PI : 0,
      spread: 1.4,
      life: [140, 260],
      size: [14 * this.s, 4 * this.s]
    })
    void this.host
      .tween(this.host.ms(200), (t) => {
        const reach = length * Math.min(1, t / 0.3)
        const fade = t < 0.3 ? 1 : 1 - (t - 0.3) / 0.7

        g.clear()
        g.poly([-reach * 0.5, 0, 0, -6 * this.s, reach * 0.5, 0, 0, 6 * this.s]).fill({
          color: colors.glow,
          alpha: 0.5 * fade
        })
        g.poly([-reach * 0.5, 0, 0, -2 * this.s, reach * 0.5, 0, 0, 2 * this.s]).fill({
          color: colors.core,
          alpha: fade
        })
      })
      .then(() => g.destroy())
  }

  /** Two rows of fangs that close on the target. */
  private bite(at: Spot, size: number): void {
    const g = this.add(new Graphics(), this.top)

    g.position.set(at.x, at.y)
    void this.host
      .tween(this.host.ms(260), (t) => {
        const close = size * (1 - Math.min(1, t / 0.4)) + size * 0.15
        const fade = t < 0.5 ? 1 : 1 - (t - 0.5) / 0.5

        g.clear()

        for (const side of [-1, 1]) {
          for (let tooth = -2; tooth <= 2; tooth++) {
            const x = tooth * size * 0.32
            const y = side * close
            const curve = Math.abs(tooth) * size * 0.12 * side

            g.poly([x - size * 0.13, y + curve, x + size * 0.13, y + curve, x, y + curve - side * size * 0.42])
              .fill({ color: 0xffffff, alpha: fade })
              .stroke({ width: 2 * this.s, color: OUTLINE, alpha: fade })
          }
        }
      })
      .then(() => g.destroy())
  }

  /** A ring that opens fast with short rays and a puff of dust: the weight of a blow. */
  private shockwave(
    at: Spot,
    radius: number,
    colors: { core: number; glow: number; accent: number },
    layer = this.top
  ): void {
    const g = this.add(new Graphics(), layer)

    g.position.set(at.x, at.y)
    this.particles.emit({
      shape: 'dot',
      x: at.x,
      y: at.y,
      count: 8,
      tint: colors.accent,
      speed: [60, 140],
      life: [300, 480],
      size: [12 * this.s, 26 * this.s],
      alpha: 0.4
    })
    void this.host
      .tween(this.host.ms(280), (t) => {
        const reach = radius * (0.3 + t * 0.9)
        const fade = 1 - t

        g.clear()
        g.ellipse(0, 0, reach, reach * (layer === this.ground ? 0.3 : 0.85)).stroke({
          width: 5 * this.s * fade + 1,
          color: colors.glow,
          alpha: fade
        })

        for (let ray = 0; ray < 8; ray++) {
          const angle = (ray / 8) * Math.PI * 2 + 0.2

          g.moveTo(Math.cos(angle) * reach * 0.45, Math.sin(angle) * reach * 0.45)
            .lineTo(Math.cos(angle) * reach * 0.8, Math.sin(angle) * reach * 0.8)
            .stroke({ width: 3 * this.s, color: colors.core, alpha: fade, cap: 'round' })
        }
      })
      .then(() => g.destroy())
  }

  /** A round flash of light that fades fast. */
  private glowFlash(at: Spot, radius: number, color: number, duration: number): void {
    const g = this.add(new Graphics(), this.top)

    g.position.set(at.x, at.y)
    g.circle(0, 0, radius).fill({ color, alpha: 0.35 })
    g.circle(0, 0, radius * 0.55).fill({ color: 0xffffff, alpha: 0.55 })
    void this.host
      .tween(this.host.ms(duration), (t) => {
        g.alpha = 1 - t
        g.scale.set(0.7 + t * 0.6)
      })
      .then(() => g.destroy())
  }

  /** Rays that open from a point and fade (light). */
  private rays(at: Spot, radius: number, color: number, count: number): void {
    const g = this.add(new Graphics(), this.top)

    g.position.set(at.x, at.y)
    void this.host
      .tween(this.host.ms(320), (t) => {
        const reach = radius * (0.5 + t * 0.7)

        g.clear()
        g.circle(0, 0, radius * 0.4 * (1 - t)).fill({ color: 0xffffff, alpha: 0.6 * (1 - t) })

        for (let ray = 0; ray < count; ray++) {
          const angle = (ray / count) * Math.PI * 2 + t * 0.6

          g.moveTo(Math.cos(angle) * reach * 0.3, Math.sin(angle) * reach * 0.3)
            .lineTo(Math.cos(angle) * reach, Math.sin(angle) * reach)
            .stroke({ width: 4 * this.s, color, alpha: 1 - t, cap: 'round' })
        }
      })
      .then(() => g.destroy())
  }

  /** Short lightnings that jump out of a point. */
  private crackles(at: Spot, radius: number, colors: { core: number; glow: number }): void {
    const g = this.add(new Graphics(), this.top)

    for (let index = 0; index < 4; index++) {
      const angle = Math.random() * Math.PI * 2
      const end = { x: at.x + Math.cos(angle) * radius * 1.6, y: at.y + Math.sin(angle) * radius * 1.6 }
      const points = jagged(at, end, 4, 6 * this.s)

      path(g, points, 4 * this.s, colors.glow, 0.5)
      path(g, points, 1.5 * this.s, colors.core, 1)
    }

    void this.host.tween(this.host.ms(200), (t) => (g.alpha = 1 - t)).then(() => g.destroy())
  }

  /** A ring that closes on a point (darkness). */
  private implode(at: Spot, radius: number, colors: { core: number; glow: number }): void {
    const g = this.add(new Graphics(), this.top)

    g.position.set(at.x, at.y)
    void this.host
      .tween(this.host.ms(320), (t) => {
        g.clear()
        g.circle(0, 0, radius * (1 - t * 0.85)).stroke({ width: 5 * this.s, color: colors.glow, alpha: 0.4 + t * 0.6 })
        g.circle(0, 0, radius * 0.35 * t).fill({ color: colors.core, alpha: 0.5 * (1 - t) })
      })
      .then(() => g.destroy())
  }

  /** Rings of several colors that open from a point (the seals). */
  private rings(at: Spot, radius: number, colors: number[]): void {
    const g = this.add(new Graphics(), this.top)

    g.position.set(at.x, at.y)
    void this.host
      .tween(this.host.ms(320), (t) => {
        g.clear()
        colors.forEach((color, index) => {
          g.circle(0, 0, radius * (0.4 + t * (0.6 + index * 0.25))).stroke({ width: 3 * this.s, color, alpha: 1 - t })
        })
      })
      .then(() => g.destroy())
  }

  private add<T extends Container>(child: T, layer: Container): T {
    layer.addChild(child)

    return child
  }
}

/** A ball of light: a soft halo and a bright core. */
function glowBall(g: Graphics, radius: number, colors: { core: number; glow: number; accent: number }): void {
  g.circle(0, 0, radius * 1.55).fill({ color: colors.glow, alpha: 0.28 })
  g.circle(0, 0, radius)
    .fill({ color: colors.glow })
    .stroke({ width: Math.max(2, radius * 0.14), color: colors.accent })
  g.circle(-radius * 0.12, -radius * 0.12, radius * 0.62).fill({ color: mixColor(colors.glow, colors.core, 0.6) })
  g.circle(-radius * 0.22, -radius * 0.22, radius * 0.3).fill({ color: colors.core })
}

/** Between two colors (share 0: the first one). */
function mixColor(a: number, b: number, share: number): number {
  const channel = (shift: number) => Math.round(((a >> shift) & 0xff) * (1 - share) + ((b >> shift) & 0xff) * share)

  return (channel(16) << 16) | (channel(8) << 8) | channel(0)
}

/** A broken line between two points, its middle points pushed aside at random. */
export function jagged(from: Spot, to: Spot, segments: number, amplitude: number): Spot[] {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const length = Math.hypot(dx, dy) || 1
  const normal = { x: -dy / length, y: dx / length }
  const points: Spot[] = [from]

  for (let index = 1; index < segments; index++) {
    const share = index / segments
    const push = (Math.random() - 0.5) * 2 * amplitude * Math.sin(share * Math.PI)

    points.push({ x: from.x + dx * share + normal.x * push, y: from.y + dy * share + normal.y * push })
  }

  points.push(to)

  return points
}

function path(g: Graphics, points: Spot[], width: number, color: number, alpha: number): void {
  g.moveTo(points[0].x, points[0].y)

  for (const point of points.slice(1)) {
    g.lineTo(point.x, point.y)
  }

  g.stroke({ width, color, alpha, cap: 'round', join: 'round' })
}

/** The pairs (x, y) of a flat list, in the opposite order. */
function pairsReversed(values: number[]): number[] {
  const result: number[] = []

  for (let index = values.length - 2; index >= 0; index -= 2) {
    result.push(values[index], values[index + 1])
  }

  return result
}

/** The color around a cut: the glow of its element, or a cold blue for a plain blade. */
function edgeOf(look: Look): number {
  return look === DamageType.SLASH || look === DamageType.PIERCE ? 0x7aa2ff : LOOK_COLORS[look].glow
}
