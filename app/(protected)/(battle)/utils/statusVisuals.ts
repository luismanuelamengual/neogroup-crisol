import { Container, Graphics } from 'pixi.js'
import { LOOK_COLORS } from '@/app/(protected)/(battle)/utils/attackEffects'
import { Emission, Particles } from '@/app/(protected)/(battle)/utils/particles'
import { StatusType } from '@/app/(protected)/(engine)/models/StatusType'

/**
 * What a fighter carries on it while a status lasts, drawn by code every frame
 * so it can be seen at a glance: bubbles of poison, flames, drops of blood, a
 * block of ice, stars going round the head, a cloud over the eyes, arrows that
 * rise or sink, a shield (whole or broken), wind or a slow clock. Each status
 * also tints the body and changes how fast its puppet moves (frozen: still).
 *
 * The drawings live inside the fighter (a layer behind its body and one in
 * front), so they follow it when it moves, scale with it and hide with it; the
 * loose bits go to the shared particles (see particles.ts), sparingly so the
 * attacks keep their budget.
 */

const OUTLINE = 0x0a0710

/** Every status, with the colors it is drawn with (also the order the preview lists them). */
export const STATUS_COLORS: Record<StatusType, { main: number; light: number; dark: number }> = {
  [StatusType.POISON]: { main: LOOK_COLORS.poison.glow, light: 0xd9f99d, dark: LOOK_COLORS.poison.accent },
  [StatusType.BURN]: { main: 0xff7a00, light: 0xfff1a8, dark: 0xff3d1f },
  [StatusType.BLEED]: { main: 0xe11d48, light: 0xfda4af, dark: 0x881337 },
  [StatusType.FREEZE]: { main: 0x7dd3fc, light: 0xf0fdff, dark: 0x0284c7 },
  [StatusType.STUN]: { main: 0xfde047, light: 0xfffbe6, dark: 0xca8a04 },
  [StatusType.BLIND]: { main: 0x3f3653, light: 0x8b80a3, dark: 0x1a1426 },
  [StatusType.ATTACK_UP]: { main: 0xff4d3d, light: 0xffc2a8, dark: 0xb91c1c },
  [StatusType.ATTACK_DOWN]: { main: 0xbe123c, light: 0xfb7185, dark: 0x4c0519 },
  [StatusType.DEFENSE_UP]: { main: 0x60a5fa, light: 0xdbeafe, dark: 0x1d4ed8 },
  [StatusType.DEFENSE_DOWN]: { main: 0x94a3b8, light: 0xe2e8f0, dark: 0x475569 },
  [StatusType.SPEED_UP]: { main: 0x34d399, light: 0xd1fae5, dark: 0x047857 },
  [StatusType.SPEED_DOWN]: { main: 0xa78bfa, light: 0xede9fe, dark: 0x5b21b6 }
}

/** The tint each status gives the body, and how strong (the first one present wins). */
const TINTS: [StatusType, number, number][] = [
  [StatusType.FREEZE, 0x9fd8ff, 0.75],
  [StatusType.POISON, 0xa3e85a, 0.6],
  [StatusType.BURN, 0xffa36b, 0.4],
  [StatusType.BLIND, 0x8c84a0, 0.45],
  [StatusType.SPEED_DOWN, 0xc4b5fd, 0.35],
  [StatusType.BLEED, 0xff9aa8, 0.3]
]
/** The stat changes, which also get a badge over the health bar (in this order). */
const BADGES = [
  StatusType.ATTACK_UP,
  StatusType.ATTACK_DOWN,
  StatusType.DEFENSE_UP,
  StatusType.DEFENSE_DOWN,
  StatusType.SPEED_UP,
  StatusType.SPEED_DOWN
]
/** How often each status lets out its loose bits (ms, in the high quality). */
const EVERY: Partial<Record<StatusType, number>> = {
  [StatusType.POISON]: 170,
  [StatusType.BURN]: 110,
  [StatusType.BLEED]: 260,
  [StatusType.FREEZE]: 420,
  [StatusType.BLIND]: 320,
  [StatusType.ATTACK_UP]: 260,
  [StatusType.DEFENSE_DOWN]: 700,
  [StatusType.SPEED_DOWN]: 600
}

/** Where the fighter stands on the stage, to place its particles: its spot and its scale. */
export interface AuraPlace {
  x: number
  y: number
  scale: number
}

/** The statuses drawn on one fighter. */
export class StatusAura {
  /** Behind the body: glows, flames at the back, wind, the slow clock on the ground. */
  readonly back = new Graphics()
  /** In front of the body: ice, stars, the cloud, arrows, shields. */
  readonly front = new Graphics()
  private statuses = new Set<StatusType>()
  private readonly timers = new Map<StatusType, number>()
  private time = 0
  private tinted = false

  constructor(
    private readonly particles: Particles,
    /** The body, to tint it. */
    private readonly body: Container,
    /** Height of the figure and half its width, in its own pixels (before the stage scale). */
    private readonly height: number,
    private readonly halfWidth: number,
    /** Where it looks: 1 right (heroes), -1 left (enemies). */
    private readonly direction: 1 | -1,
    /** Where its health bar is (its own pixels): the badges of the stat changes go in a row over it. */
    private readonly barY: number,
    private readonly reducedMotion = false
  ) {}

  /** The statuses it has now (the old ones go, the new ones show). */
  set(statuses: Iterable<StatusType>): void {
    this.statuses = new Set(statuses)

    if (this.statuses.size === 0) {
      this.back.clear()
      this.front.clear()
      this.timers.clear()
    }
  }

  add(status: StatusType): void {
    this.statuses.add(status)
  }

  remove(status: StatusType): void {
    this.set([...this.statuses].filter((other) => other !== status))
  }

  has(status: StatusType): boolean {
    return this.statuses.has(status)
  }

  get list(): StatusType[] {
    return [...this.statuses]
  }

  /** How fast its puppet moves: still when frozen, slower when slowed or stunned, quicker when hasted. */
  get pace(): number {
    if (this.has(StatusType.FREEZE)) {
      return 0
    }

    return (
      (this.has(StatusType.SPEED_DOWN) ? 0.4 : 1) *
      (this.has(StatusType.STUN) ? 0.55 : 1) *
      (this.has(StatusType.SPEED_UP) ? 1.7 : 1)
    )
  }

  /**
   * Draws a frame: `deltaMS` already scaled by the speed of the battle. With
   * `place` the loose bits come out too (not when the fighter is hidden).
   */
  update(deltaMS: number, place: AuraPlace | null): void {
    this.time += deltaMS / 1000
    this.back.clear()
    this.front.clear()
    this.tint()

    if (this.statuses.size === 0) {
      return
    }

    const t = this.time
    const h = this.height
    const w = this.halfWidth

    for (const status of this.statuses) {
      switch (status) {
        case StatusType.POISON:
          this.drawPoison(t, h, w)
          break
        case StatusType.BURN:
          this.drawBurn(t, h, w)
          break
        case StatusType.BLEED:
          this.drawBleed(t, h, w)
          break
        case StatusType.FREEZE:
          this.drawFreeze(t, h, w)
          break
        case StatusType.STUN:
          this.drawStun(t, h, w)
          break
        case StatusType.BLIND:
          this.drawBlind(t, h, w)
          break
        case StatusType.ATTACK_UP:
        case StatusType.ATTACK_DOWN:
          this.drawAttack(t, h, w, status === StatusType.ATTACK_UP)
          break
        case StatusType.DEFENSE_UP:
          this.drawShield(t, h, w)
          break
        case StatusType.DEFENSE_DOWN:
          this.drawBrokenShield(t, h, w)
          break
        case StatusType.SPEED_UP:
          this.drawWind(t, h, w)
          break
        case StatusType.SPEED_DOWN:
          this.drawClock(t, h, w)
          break
      }
    }

    this.drawBadges(t)

    if (place) {
      this.emit(deltaMS, place)
    }
  }

  /** A small round badge for each stat that went up or down, in a row over the health bar. */
  private drawBadges(t: number): void {
    const shown = BADGES.filter((status) => this.statuses.has(status))
    const gap = 21

    shown.forEach((status, index) => {
      const x = (index - (shown.length - 1) / 2) * gap
      const y = this.barY - 13
      const colors = STATUS_COLORS[status]

      this.front.circle(x, y, 9.5).fill({ color: OUTLINE, alpha: 0.85 }).stroke({ width: 1.5, color: colors.main })

      switch (status) {
        case StatusType.ATTACK_UP:
        case StatusType.ATTACK_DOWN:
          sword(this.front, x, y, colors.main, status === StatusType.ATTACK_UP)
          break
        case StatusType.DEFENSE_UP:
        case StatusType.DEFENSE_DOWN:
          shieldBadge(this.front, x, y, colors.main, colors.light, status === StatusType.DEFENSE_DOWN)
          break
        case StatusType.SPEED_UP:
          chevron(this.front, x, y - 2.5, 4.5, true, colors.main, 1)
          chevron(this.front, x, y + 3, 4.5, true, colors.main, 0.7)
          break
        case StatusType.SPEED_DOWN:
          hourglass(this.front, x, y, colors.main, colors.light, t)
          break
      }
    })
  }

  /** The body takes the color of its strongest status, breathing in and out. */
  private tint(): void {
    const found = TINTS.find(([status]) => this.statuses.has(status))

    if (!found) {
      if (this.tinted) {
        this.body.tint = 0xffffff
        this.tinted = false
      }

      return
    }

    const [status, color, strength] = found
    const pulse = status === StatusType.FREEZE ? 1 : 0.65 + Math.sin(this.time * 3.2) * 0.35

    this.body.tint = mix(0xffffff, color, strength * pulse)
    this.tinted = true
  }

  // The drawings (in the fighter's own pixels: its feet at 0, its head at -h).

  /** A sickly glow at the feet and bubbles that swell and pop over the body. */
  private drawPoison(t: number, h: number, w: number): void {
    const colors = STATUS_COLORS[StatusType.POISON]

    this.back.ellipse(0, -2, w * 1.25, w * 0.32).fill({ color: colors.main, alpha: 0.22 + Math.sin(t * 3) * 0.08 })

    for (let index = 0; index < 4; index++) {
      const cycle = (t * 0.7 + index / 4) % 1
      const x = Math.sin(index * 2.3 + t * 1.3) * w * 0.7
      const y = -h * (0.25 + cycle * 0.7)
      const radius = (4 + cycle * 6) * (index % 2 ? 1 : 1.3)
      const alpha = cycle < 0.85 ? 0.9 : (1 - cycle) / 0.15

      this.front
        .circle(x, y, radius)
        .fill({ color: colors.main, alpha: alpha * 0.75 })
        .stroke({ width: 1.8, color: colors.dark, alpha })
      this.front.circle(x - radius * 0.35, y - radius * 0.35, radius * 0.3).fill({ color: colors.light, alpha })
    }
  }

  /** Flames licking the body, from behind and at the feet. */
  private drawBurn(t: number, h: number, w: number): void {
    const colors = STATUS_COLORS[StatusType.BURN]
    const tongues = 5

    for (let index = 0; index < tongues; index++) {
      const x = (index / (tongues - 1) - 0.5) * w * 1.7
      const flicker = Math.sin(t * 11 + index * 1.7) * 0.18 + Math.sin(t * 7.3 + index) * 0.12
      const tall = h * (0.42 + (index % 2) * 0.16) * (1 + flicker)
      const sway = Math.sin(t * 6 + index) * w * 0.12

      flame(this.back, x, 0, w * 0.55, tall, sway, colors.dark, 0.85)
      flame(this.back, x, 0, w * 0.34, tall * 0.68, sway, colors.main, 0.95)
    }

    for (let index = 0; index < 3; index++) {
      const x = (index - 1) * w * 0.75
      const flicker = 1 + Math.sin(t * 13 + index * 2.1) * 0.25
      const sway = Math.sin(t * 8 + index * 3) * w * 0.08

      flame(this.front, x, 2, w * 0.5, h * 0.3 * flicker, sway, colors.main, 0.9)
      flame(this.front, x, 2, w * 0.28, h * 0.17 * flicker, sway, colors.light, 0.95)
    }
  }

  /** Open cuts that drip: a few red streaks on the body. */
  private drawBleed(t: number, h: number, w: number): void {
    const colors = STATUS_COLORS[StatusType.BLEED]

    for (let index = 0; index < 2; index++) {
      const x = (index ? 0.28 : -0.22) * w
      const y = -h * (index ? 0.48 : 0.62)
      const drip = ((t * 0.9 + index * 0.5) % 1) * h * 0.12

      this.front
        .moveTo(x - w * 0.2, y - 6)
        .lineTo(x + w * 0.2, y + 6)
        .stroke({ width: 4.5, color: OUTLINE, cap: 'round' })
        .moveTo(x - w * 0.2, y - 6)
        .lineTo(x + w * 0.2, y + 6)
        .stroke({ width: 2.5, color: colors.main, cap: 'round' })
      this.front
        .moveTo(x, y)
        .lineTo(x, y + drip)
        .stroke({ width: 2.2, color: colors.main, cap: 'round' })
      this.front.circle(x, y + drip + 2, 2.6).fill({ color: colors.main })
    }
  }

  /** A block of ice around the whole body, with crystals at its foot and a glint that runs over it. */
  private drawFreeze(t: number, h: number, w: number): void {
    const colors = STATUS_COLORS[StatusType.FREEZE]
    const top = h * 1.02
    const block = [
      -w * 1.1,
      2,
      -w * 1.22,
      -top * 0.38,
      -w * 0.98,
      -top * 0.78,
      -w * 0.45,
      -top,
      w * 0.2,
      -top * 0.94,
      w * 0.85,
      -top * 0.82,
      w * 1.2,
      -top * 0.42,
      w * 1.08,
      2
    ]

    this.front
      .poly(block)
      .fill({ color: colors.main, alpha: 0.26 })
      .stroke({ width: 3, color: colors.light, alpha: 0.9 })
    // Facets inside the block.
    this.front
      .moveTo(-w * 0.98, -top * 0.78)
      .lineTo(-w * 0.2, -top * 0.5)
      .lineTo(w * 0.85, -top * 0.82)
      .moveTo(-w * 0.2, -top * 0.5)
      .lineTo(-w * 0.1, 2)
      .moveTo(-w * 1.22, -top * 0.38)
      .lineTo(-w * 0.2, -top * 0.5)
      .lineTo(w * 1.2, -top * 0.42)
      .stroke({ width: 1.5, color: colors.light, alpha: 0.45 })

    // A glint sweeping up the block now and then.
    const sweep = (t * 0.45) % 1

    if (sweep < 0.4) {
      const y = 2 - (sweep / 0.4) * (top + 10)

      this.front
        .moveTo(-w * 0.9, y + w * 0.5)
        .lineTo(w * 0.9, y - w * 0.5)
        .stroke({ width: 5, color: 0xffffff, alpha: 0.55 * Math.sin((sweep / 0.4) * Math.PI) })
    }

    // Crystals at the foot.
    for (const [x, tall, lean] of [
      [-w * 1.15, 0.36, -0.35],
      [-w * 0.6, 0.22, -0.1],
      [w * 0.55, 0.26, 0.15],
      [w * 1.12, 0.4, 0.4]
    ]) {
      const tip = { x: x + lean * h * 0.2, y: -h * tall }

      this.front
        .poly([x - w * 0.16, 3, tip.x, tip.y, x + w * 0.16, 3])
        .fill({ color: colors.light, alpha: 0.85 })
        .stroke({ width: 2, color: colors.dark, alpha: 0.9 })
    }

    this.back.ellipse(0, -1, w * 1.45, w * 0.36).fill({ color: colors.light, alpha: 0.4 })
  }

  /** Stars going round over the head (dimmer when they pass behind it). */
  private drawStun(t: number, h: number, w: number): void {
    const colors = STATUS_COLORS[StatusType.STUN]
    const count = 3
    const y = -h * 0.9
    const cx = this.direction * w * 0.3

    this.back.ellipse(cx, y, w * 0.85, 8).stroke({ width: 2, color: colors.main, alpha: 0.45 })

    for (let index = 0; index < count; index++) {
      const angle = t * 3.4 + (index / count) * Math.PI * 2
      const depth = Math.sin(angle)
      const layer = depth < 0 ? this.back : this.front
      const radius = 9 + depth * 2.2

      star(layer, cx + Math.cos(angle) * w * 0.85, y + depth * 8, radius, angle * 1.5, colors.main, depth < 0 ? 0.7 : 1)
    }
  }

  /** A dark cloud over the eyes, made of puffs that drift. */
  private drawBlind(t: number, h: number, w: number): void {
    const colors = STATUS_COLORS[StatusType.BLIND]
    const y = -h * 0.86

    for (let index = 0; index < 6; index++) {
      const x = this.direction * w * 0.3 + (index / 5 - 0.5) * w * 1.4 + Math.sin(t * 1.6 + index * 1.9) * 4
      const radius = w * (0.3 + (index % 3) * 0.07) * (1 + Math.sin(t * 2.2 + index) * 0.08)
      const dy = Math.cos(t * 1.4 + index * 2.4) * 3

      this.front.circle(x, y + dy, radius + 2.5).fill({ color: colors.dark, alpha: 0.85 })
    }

    for (let index = 0; index < 6; index++) {
      const x = this.direction * w * 0.3 + (index / 5 - 0.5) * w * 1.4 + Math.sin(t * 1.6 + index * 1.9) * 4
      const radius = w * (0.3 + (index % 3) * 0.07) * (1 + Math.sin(t * 2.2 + index) * 0.08)
      const dy = Math.cos(t * 1.4 + index * 2.4) * 3

      this.front.circle(x, y + dy - 1.5, radius).fill({ color: colors.main, alpha: 0.92 })
      this.front
        .circle(x - radius * 0.3, y + dy - radius * 0.35, radius * 0.35)
        .fill({ color: colors.light, alpha: 0.35 })
    }
  }

  /** Arrows by its side: red ones that rise (stronger) or dark ones that sink (weaker), with a glow when stronger. */
  private drawAttack(t: number, h: number, w: number, up: boolean): void {
    const colors = STATUS_COLORS[up ? StatusType.ATTACK_UP : StatusType.ATTACK_DOWN]
    const x = -this.direction * w * 1.15

    if (up) {
      this.back
        .ellipse(0, -h * 0.5, w * 1.15, h * 0.56)
        .fill({ color: colors.main, alpha: 0.2 + Math.sin(t * 4) * 0.07 })
    }

    for (let index = 0; index < 2; index++) {
      const cycle = (t * 0.8 + index / 2) % 1
      const y = up ? -h * (0.25 + cycle * 0.6) : -h * (0.85 - cycle * 0.6)
      const alpha = Math.sin(cycle * Math.PI)

      chevron(this.front, x, y, 11, up, colors.main, alpha)
    }
  }

  /** A bubble of light around the body, with a glint that goes round it. */
  private drawShield(t: number, h: number, w: number): void {
    const colors = STATUS_COLORS[StatusType.DEFENSE_UP]
    const rx = w * 1.35
    const ry = h * 0.62
    const cy = -h * 0.5
    const pulse = 1 + Math.sin(t * 2.6) * 0.02

    this.front
      .ellipse(0, cy, rx * pulse, ry * pulse)
      .fill({ color: colors.main, alpha: 0.1 })
      .stroke({ width: 2.5, color: colors.light, alpha: 0.75 })

    // Hexagons faintly on its skin.
    for (let index = 0; index < 5; index++) {
      const angle = -Math.PI / 2 + (index - 2) * 0.55
      const x = Math.cos(angle) * rx * 0.8
      const y = cy + Math.sin(angle) * ry * 0.8 + ry * 0.25

      hexagon(this.front, x, y, 6, colors.light, 0.25 + Math.sin(t * 3 + index) * 0.15)
    }

    const angle = t * 1.8
    const start = angle
    const end = angle + 0.9

    this.front.moveTo(Math.cos(start) * rx * pulse, cy + Math.sin(start) * ry * pulse)

    for (let step = 1; step <= 8; step++) {
      const a = start + ((end - start) * step) / 8

      this.front.lineTo(Math.cos(a) * rx * pulse, cy + Math.sin(a) * ry * pulse)
    }

    this.front.stroke({ width: 4, color: 0xffffff, alpha: 0.7, cap: 'round' })
  }

  /** A broken shield: pieces of the bubble, apart and wobbling, and arrows that sink. */
  private drawBrokenShield(t: number, h: number, w: number): void {
    const colors = STATUS_COLORS[StatusType.DEFENSE_DOWN]
    const rx = w * 1.35
    const ry = h * 0.62
    const cy = -h * 0.5
    const pieces = 7

    for (let index = 0; index < pieces; index++) {
      const from = (index / pieces) * Math.PI * 2 + 0.12
      const to = from + (Math.PI * 2) / pieces - 0.38
      const push = 4 + Math.sin(t * 2 + index * 1.3) * 2.5
      const mid = (from + to) / 2

      this.front.moveTo(Math.cos(from) * rx + Math.cos(mid) * push, cy + Math.sin(from) * ry + Math.sin(mid) * push)

      for (let step = 1; step <= 4; step++) {
        const a = from + ((to - from) * step) / 4

        this.front.lineTo(Math.cos(a) * rx + Math.cos(mid) * push, cy + Math.sin(a) * ry + Math.sin(mid) * push)
      }

      this.front.stroke({ width: 3.5, color: colors.dark, alpha: 0.7 })
      this.front.stroke({ width: 2, color: colors.light, alpha: 0.95 })
    }

    const x = this.direction * w * 1.15
    const cycle = (t * 0.8) % 1

    chevron(this.front, x, -h * (0.8 - cycle * 0.5), 7, false, colors.dark, Math.sin(cycle * Math.PI))
  }

  /** Streaks of wind that run behind it, as if it went fast. */
  private drawWind(t: number, h: number, w: number): void {
    const colors = STATUS_COLORS[StatusType.SPEED_UP]
    const behind = -this.direction

    for (let index = 0; index < 5; index++) {
      const cycle = (t * 1.6 + index * 0.37) % 1
      const y = -h * (0.15 + index * 0.17)
      const start = w * (0.6 + cycle * 1.2)
      const length = w * (0.9 + (index % 2) * 0.5)
      const alpha = Math.sin(cycle * Math.PI)

      this.front
        .moveTo(behind * start, y)
        .lineTo(behind * (start + length), y)
        .stroke({ width: 5, color: colors.main, alpha: alpha * 0.9, cap: 'round' })
      this.front
        .moveTo(behind * start, y)
        .lineTo(behind * (start + length * 0.5), y)
        .stroke({ width: 2.5, color: colors.light, alpha, cap: 'round' })
    }
  }

  /** A clock on the ground whose hand barely moves, and heavy drops that fall slowly. */
  private drawClock(t: number, h: number, w: number): void {
    const colors = STATUS_COLORS[StatusType.SPEED_DOWN]
    const rx = w * 1.3
    const ry = w * 0.36

    this.back
      .ellipse(0, 0, rx, ry)
      .fill({ color: colors.main, alpha: 0.18 })
      .stroke({ width: 2.5, color: colors.main, alpha: 0.85 })

    for (let tick = 0; tick < 12; tick++) {
      const angle = (tick / 12) * Math.PI * 2
      const inner = tick % 3 === 0 ? 0.72 : 0.84

      this.back
        .moveTo(Math.cos(angle) * rx * inner, Math.sin(angle) * ry * inner)
        .lineTo(Math.cos(angle) * rx * 0.95, Math.sin(angle) * ry * 0.95)
        .stroke({ width: 2, color: colors.light, alpha: 0.8 })
    }

    const hand = t * 0.5

    this.back
      .moveTo(0, 0)
      .lineTo(Math.cos(hand) * rx * 0.68, Math.sin(hand) * ry * 0.68)
      .stroke({ width: 3, color: colors.light, cap: 'round' })

    // A snail's pace: drops that hang and drip down the body.
    for (let index = 0; index < 2; index++) {
      const cycle = (t * 0.35 + index * 0.5) % 1
      const x = (index ? 0.55 : -0.6) * w
      const y = -h * (0.7 - cycle * 0.55)
      const alpha = Math.sin(cycle * Math.PI)

      this.front
        .moveTo(x, y - 10)
        .lineTo(x, y)
        .stroke({ width: 3, color: colors.main, alpha: alpha * 0.8, cap: 'round' })
      this.front
        .circle(x, y + 2, 5)
        .fill({ color: colors.main, alpha })
        .stroke({ width: 1.5, color: colors.dark, alpha })
    }
  }

  // The loose bits.

  private emit(deltaMS: number, place: AuraPlace): void {
    const density = this.particles.density * (this.reducedMotion ? 0.5 : 1)

    for (const status of this.statuses) {
      const every = EVERY[status]

      if (!every) {
        continue
      }

      const left = (this.timers.get(status) ?? Math.random() * every) - deltaMS

      if (left > 0) {
        this.timers.set(status, left)
        continue
      }

      this.timers.set(status, every / density)

      const emission = this.emissionOf(status, place)

      if (emission) {
        this.particles.emit(emission)
      }
    }
  }

  /** The bits a status lets out, at the fighter's spot on the stage. */
  private emissionOf(status: StatusType, place: AuraPlace): Emission | null {
    const s = place.scale
    const h = this.height * s
    const w = this.halfWidth * s
    const colors = STATUS_COLORS[status]
    const at = (x: number, y: number) => ({ x: place.x + x, y: place.y + y })

    switch (status) {
      case StatusType.POISON:
        return {
          shape: 'ring',
          ...at(0, -h * 0.55),
          count: 1,
          tint: [colors.main, colors.light],
          speed: [20, 45],
          angle: -Math.PI / 2,
          spread: 0.8,
          life: [700, 1100],
          size: [5 * s, 12 * s],
          gravity: -30,
          radius: w * 0.8,
          alpha: 0.8
        }
      case StatusType.BURN:
        return {
          shape: 'dot',
          ...at(0, -h * 0.25),
          count: 1,
          tint: [colors.main, colors.light, colors.dark],
          speed: [40, 90],
          angle: -Math.PI / 2,
          spread: 0.7,
          life: [500, 900],
          size: [7 * s, 2 * s],
          gravity: -60,
          radius: w * 0.9,
          glow: true
        }
      case StatusType.BLEED:
        return {
          shape: 'dot',
          ...at(0, -h * 0.5),
          count: 1,
          tint: [colors.main, colors.dark],
          speed: [10, 40],
          angle: Math.PI / 2,
          spread: 1,
          life: [500, 700],
          size: [6 * s, 4 * s],
          gravity: 380,
          radius: w * 0.4
        }
      case StatusType.FREEZE:
        return {
          shape: 'flake',
          ...at(0, -h * 1.05),
          count: 1,
          tint: [colors.light, colors.main],
          speed: [8, 20],
          angle: Math.PI / 2,
          spread: 1.2,
          life: [1200, 1700],
          size: [9 * s, 5 * s],
          gravity: 25,
          radius: w * 1.1,
          spin: 1.2
        }
      case StatusType.BLIND:
        return {
          shape: 'dot',
          ...at(0, -h * 0.86),
          count: 1,
          tint: [colors.main, colors.light],
          speed: [10, 25],
          angle: -Math.PI / 2,
          spread: 2,
          life: [700, 1000],
          size: [10 * s, 16 * s],
          radius: w * 0.8,
          alpha: 0.6
        }
      case StatusType.ATTACK_UP:
        return {
          shape: 'spark',
          ...at(0, -h * 0.2),
          count: 1,
          tint: [colors.main, colors.light],
          speed: [60, 110],
          angle: -Math.PI / 2,
          spread: 0.15,
          life: [400, 600],
          size: [14 * s, 8 * s],
          radius: w,
          glow: true
        }
      case StatusType.DEFENSE_DOWN:
        return {
          shape: 'shard',
          ...at(0, -h * 0.8),
          count: 1,
          tint: [colors.light, colors.main],
          speed: [20, 50],
          angle: Math.PI / 2,
          spread: 1.2,
          life: [600, 800],
          size: [9 * s, 6 * s],
          gravity: 300,
          radius: w * 1.2,
          spin: 4
        }
      case StatusType.SPEED_DOWN:
        return {
          shape: 'dot',
          ...at(0, -h * 0.1),
          count: 1,
          tint: [colors.main, colors.light],
          speed: [4, 12],
          angle: -Math.PI / 2,
          spread: 1,
          life: [1200, 1600],
          size: [8 * s, 12 * s],
          gravity: -6,
          radius: w * 1.1,
          alpha: 0.5
        }
      default:
        return null
    }
  }
}

// Small shapes.

/** A tongue of fire standing on (x, base), leaning by `sway` at its tip. */
function flame(
  g: Graphics,
  x: number,
  base: number,
  width: number,
  height: number,
  sway: number,
  color: number,
  alpha: number
): void {
  const half = width / 2

  g.moveTo(x - half, base)
    .bezierCurveTo(
      x - half * 1.1,
      base - height * 0.45,
      x - half * 0.2 + sway * 0.5,
      base - height * 0.7,
      x + sway,
      base - height
    )
    .bezierCurveTo(
      x + half * 0.3 + sway * 0.5,
      base - height * 0.65,
      x + half * 1.1,
      base - height * 0.4,
      x + half,
      base
    )
    .closePath()
    .fill({ color, alpha })
}

function star(g: Graphics, x: number, y: number, radius: number, rotation: number, color: number, alpha: number): void {
  const points: number[] = []

  for (let index = 0; index < 10; index++) {
    const angle = rotation + (index / 10) * Math.PI * 2 - Math.PI / 2
    const reach = index % 2 ? radius * 0.45 : radius

    points.push(x + Math.cos(angle) * reach, y + Math.sin(angle) * reach)
  }

  g.poly(points).fill({ color, alpha }).stroke({ width: 2, color: OUTLINE, alpha })
}

/** A thick arrow head, pointing up or down, outlined so it reads over any background. */
function chevron(g: Graphics, x: number, y: number, size: number, up: boolean, color: number, alpha: number): void {
  const dy = up ? size * 0.55 : -size * 0.55

  for (const [width, tone] of [
    [6.5, OUTLINE],
    [3.5, color]
  ]) {
    g.moveTo(x - size, y + dy)
      .lineTo(x, y - dy)
      .lineTo(x + size, y + dy)
      .stroke({ width, color: tone, alpha, cap: 'round', join: 'round' })
  }
}

function hexagon(g: Graphics, x: number, y: number, radius: number, color: number, alpha: number): void {
  const points: number[] = []

  for (let index = 0; index < 6; index++) {
    const angle = (index / 6) * Math.PI * 2

    points.push(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius)
  }

  g.poly(points).stroke({ width: 1.5, color, alpha })
}

/** A small sword over the head (stronger: bright and with an arrow up; weaker: dull and with one down). */
function sword(g: Graphics, x: number, y: number, color: number, up: boolean): void {
  g.poly([x - 1.8, y + 4, x - 1.8, y - 5, x, y - 8, x + 1.8, y - 5, x + 1.8, y + 4]).fill({
    color: up ? 0xffffff : 0xbfb3bd
  })
  g.rect(x - 4.5, y + 3.5, 9, 2).fill({ color })
  g.rect(x - 1.2, y + 5.5, 2.4, 3).fill({ color })
  // The little arrow at its side.
  const ax = x + 6
  const ay = y + (up ? -3 : 3)

  g.poly(up ? [ax - 3, ay + 1, ax, ay - 3, ax + 3, ay + 1] : [ax - 3, ay - 1, ax, ay + 3, ax + 3, ay - 1]).fill({
    color
  })
}

/** A small shield over the head, cracked when the defense went down. */
function shieldBadge(g: Graphics, x: number, y: number, color: number, light: number, cracked: boolean): void {
  g.poly([x - 6, y - 6, x + 6, y - 6, x + 6, y, x, y + 7, x - 6, y])
    .fill({ color })
    .stroke({ width: 1.5, color: light })

  if (cracked) {
    g.moveTo(x - 1, y - 6)
      .lineTo(x + 1.5, y - 2)
      .lineTo(x - 1.5, y + 1)
      .lineTo(x + 0.5, y + 6)
      .stroke({ width: 1.8, color: OUTLINE })
  }
}

/** A small hourglass over the head that turns over now and then. */
function hourglass(g: Graphics, x: number, y: number, color: number, light: number, t: number): void {
  const flip = (t * 0.25) % 1
  const angle = flip > 0.85 ? ((flip - 0.85) / 0.15) * Math.PI : 0
  const c = Math.cos(angle)
  const s = Math.sin(angle)
  const p = (px: number, py: number) => [x + px * c - py * s, y + px * s + py * c]

  g.poly([...p(-5, -6), ...p(5, -6), ...p(0, 0), ...p(5, 6), ...p(-5, 6), ...p(0, 0)])
    .fill({ color: light })
    .stroke({ width: 1.5, color })
  g.poly([...p(-3, 6), ...p(3, 6), ...p(0, 3)]).fill({ color })
}

function mix(a: number, b: number, share: number): number {
  const channel = (shift: number) => Math.round(((a >> shift) & 0xff) * (1 - share) + ((b >> shift) & 0xff) * share)

  return (channel(16) << 16) | (channel(8) << 8) | channel(0)
}
