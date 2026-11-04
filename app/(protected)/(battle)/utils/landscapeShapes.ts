import { Container, Graphics } from 'pixi.js'
import { CloudKind, LandmarkKind, RangeKind } from '@/app/(protected)/(battle)/utils/battleLandscape'
import { Random } from '@/app/(protected)/(engine)/utils/random'

/**
 * The shapes of the battle landscape, drawn in the style of the game's art:
 * flat colors with a lit and a shaded side and a dark outline on what is
 * near. Every function draws at the origin; the scenery places and tints them.
 */

export interface RangeStyle {
  /** From where to where it spans (wider than the screen, so panning never shows its ends). */
  left: number
  right: number
  /** Where it stands and how tall its tallest tip is. */
  base: number
  height: number
  color: number
  /** Dark outline (none for the farthest bands). */
  outline: number | null
  /** Width of the lines, scaled to the screen. */
  line: number
  snowCaps: boolean
  snow: number
  glow?: number
  lightFromLeft: boolean
}

export interface DrawnRange {
  graphics: Graphics
  /** Glowing parts that pulse (crystal tips, craters). */
  pulses: Graphics[]
  /** Craters that smoke. */
  vents: { x: number; y: number }[]
}

/** A band of land on the horizon: its silhouette, its shaded side and its details. */
export function drawRange(kind: RangeKind, random: Random, style: RangeStyle): DrawnRange {
  const g = new Graphics()
  const pulses: Graphics[] = []
  const vents: { x: number; y: number }[] = []
  const { left, right, base, height, color } = style
  const span = right - left
  const bottom = base + 40 * style.line
  const shade = mix(color, 0x000000, 0.28)
  const light = mix(color, 0xffffff, 0.22)

  const fillRidge = (ridge: number[]) => {
    const points = [left, bottom, ...ridge, right, bottom]

    g.poly(points).fill({ color })

    if (style.outline !== null) {
      g.poly(points).stroke({ width: style.line, color: style.outline, join: 'round' })
    }
  }

  if (kind === 'hills' || kind === 'dunes' || kind === 'drifts') {
    const cycles = kind === 'drifts' ? 1 + random() * 1.2 : kind === 'dunes' ? 1.5 + random() * 1.5 : 2 + random() * 2
    const phase = random() * Math.PI * 2
    const phase2 = random() * Math.PI * 2
    const yAt = (x: number) => {
      const t = ((x - left) / span) * cycles * Math.PI * 2
      const wave =
        kind === 'dunes'
          ? 0.55 * Math.sin(t + phase) + 0.25 * Math.sin(2 * t + phase + 0.8)
          : 0.6 * Math.sin(t + phase) + 0.25 * Math.sin(2.7 * t + phase2)

      return base - height * (0.5 + 0.45 * wave)
    }
    const ridge = sample(left, right, 8 * style.line, yAt)

    fillRidge(ridge)
    // The lower half in shade, so the band has a volume.
    g.poly([
      left,
      bottom,
      ...ridge.map((value, index) => (index % 2 ? value + height * 0.35 : value)),
      right,
      bottom
    ]).fill({ color: shade, alpha: 0.35 })
    // A lit rim along the top.
    g.poly(ridge, false).stroke({ width: style.line * 1.6, color: light, alpha: 0.7, cap: 'round', join: 'round' })

    if (style.outline !== null) {
      g.poly(ridge, false).stroke({ width: style.line, color: style.outline, cap: 'round', join: 'round' })
    }

    return { graphics: g, pulses, vents }
  }

  if (kind === 'mountains' || kind === 'peaks' || kind === 'crags') {
    const count = 4 + Math.floor(random() * 4)
    const peaks = Array.from({ length: count }, (_, index) => ({
      x: left + ((index + 0.2 + random() * 0.6) / count) * span,
      h: height * (0.55 + random() * 0.45),
      w: (span / count) * (0.7 + random() * 0.6)
    }))
    const sharp = kind !== 'mountains'
    const jitter = kind === 'crags' ? height * 0.07 : 0
    const yAt = (x: number) => {
      let top = height * 0.12

      for (const peak of peaks) {
        const u = Math.abs(x - peak.x) / peak.w

        if (u < 1) {
          top = Math.max(top, peak.h * (sharp ? 1 - u : 1 - u * u * (0.6 + 0.4 * u)))
        }
      }

      return base - top - (jitter ? (random() - 0.5) * jitter : 0)
    }
    const ridge = sample(left, right, (kind === 'crags' ? 9 : 6) * style.line, yAt)

    fillRidge(ridge)

    // The side away from the light, in shade; snow on the tallest tips.
    for (const peak of peaks) {
      const apexY = base - peak.h
      const side = style.lightFromLeft ? 1 : -1
      const foot = peak.x + side * peak.w * (sharp ? 1 : 0.85)

      g.poly([peak.x, apexY, foot, base, peak.x + side * peak.w * 0.15, base]).fill({ color: shade, alpha: 0.32 })

      if (style.snowCaps && peak.h > height * 0.62) {
        const capH = peak.h * 0.3
        const halfW = (peak.w * capH) / peak.h
        const teeth = [
          peak.x - halfW,
          apexY + capH,
          peak.x - halfW * 0.45,
          apexY + capH * 0.7,
          peak.x,
          apexY + capH * 1.05,
          peak.x + halfW * 0.45,
          apexY + capH * 0.65,
          peak.x + halfW,
          apexY + capH
        ]

        g.poly([peak.x, apexY, ...teeth]).fill({ color: style.snow })

        if (style.outline !== null) {
          g.poly([...teeth], false).stroke({ width: style.line * 0.7, color: style.outline, alpha: 0.6 })
        }
      }
    }

    return { graphics: g, pulses, vents }
  }

  if (kind === 'pines') {
    const hill = (x: number) => base - height * (0.22 + 0.1 * Math.sin(((x - left) / span) * Math.PI * 3))
    const ridge: number[] = []
    let x = left

    while (x < right) {
      const width = height * (0.18 + random() * 0.12)
      const tall = height * (0.45 + random() * 0.55)
      const y = hill(x + width / 2)

      ridge.push(x, y, x + width / 2, y - tall, x + width, y)
      x += width * (0.55 + random() * 0.3)
    }

    fillRidge(ridge)

    for (let index = 0; index < ridge.length; index += 6) {
      const [x0, y0, xc, yc, x1] = ridge.slice(index, index + 5)
      const side = style.lightFromLeft ? x1 : x0

      g.poly([xc, yc, side, y0, xc, y0]).fill({ color: shade, alpha: 0.35 })

      if (style.snowCaps) {
        const t = 0.32

        g.poly([xc, yc, xc + (x1 - xc) * t, yc + (y0 - yc) * t, xc + (x0 - xc) * t, yc + (y0 - yc) * t]).fill({
          color: style.snow
        })
      }
    }

    return { graphics: g, pulses, vents }
  }

  if (kind === 'jungle') {
    const blobs: [number, number, number][] = []
    let x = left

    while (x < right) {
      const radius = height * (0.22 + random() * 0.2)

      blobs.push([x, base - height * (0.25 + random() * 0.4), radius])
      x += radius * (0.9 + random() * 0.5)
    }

    g.rect(left, base - height * 0.3, span, bottom - base + height * 0.3).fill({ color })

    if (style.outline !== null) {
      blobs.forEach(([bx, by, r]) => g.circle(bx, by, r + style.line).fill({ color: style.outline! }))
    }

    blobs.forEach(([bx, by, r]) => g.circle(bx, by, r).fill({ color }))
    blobs.forEach(([bx, by, r]) =>
      g
        .circle(bx + (style.lightFromLeft ? 1 : -1) * r * 0.25, by + r * 0.3, r * 0.75)
        .fill({ color: shade, alpha: 0.3 })
    )
    blobs.forEach(([bx, by, r]) =>
      g
        .circle(bx - (style.lightFromLeft ? 1 : -1) * r * 0.3, by - r * 0.35, r * 0.35)
        .fill({ color: light, alpha: 0.45 })
    )
    g.rect(left, base - height * 0.05, span, bottom - base + height * 0.05).fill({ color })

    return { graphics: g, pulses, vents }
  }

  if (kind === 'mesas') {
    const ridge: number[] = []
    let x = left
    let low = true

    while (x < right) {
      const width = span * (low ? 0.04 + random() * 0.08 : 0.08 + random() * 0.14)
      const top = base - height * (low ? 0.15 + random() * 0.15 : 0.55 + random() * 0.45)
      const slope = width * 0.12

      ridge.push(x + slope, top, x + width - slope, top + (random() - 0.5) * height * 0.04)
      x += width
      low = !low
    }

    fillRidge(ridge)

    // Layered rock: a lighter band near the top of every plateau.
    for (let index = 0; index < ridge.length; index += 4) {
      const [x0, y0, x1, y1] = ridge.slice(index, index + 4)
      const tall = base - Math.min(y0, y1)

      if (tall > height * 0.45) {
        g.rect(x0, Math.max(y0, y1) + tall * 0.14, x1 - x0, tall * 0.08).fill({ color: light, alpha: 0.5 })
        g.rect(x0, Math.max(y0, y1) + tall * 0.42, x1 - x0, tall * 0.06).fill({ color: shade, alpha: 0.3 })
      }
    }

    return { graphics: g, pulses, vents }
  }

  if (kind === 'volcanoes') {
    const count = 1 + Math.floor(random() * 2)
    const hills = (x: number) => base - height * (0.2 + 0.08 * Math.sin(((x - left) / span) * Math.PI * 4))

    fillRidge(sample(left, right, 10 * style.line, hills))

    for (let index = 0; index < count; index++) {
      const cx = left + span * (0.2 + (index + random()) * (0.6 / count))
      const tall = height * (0.75 + random() * 0.25)
      const half = tall * (1.1 + random() * 0.4)
      const mouth = half * 0.16
      const cone = [cx - half, base, cx - mouth, base - tall, cx + mouth, base - tall, cx + half, base]

      g.poly(cone).fill({ color })

      if (style.outline !== null) {
        g.poly(cone).stroke({ width: style.line, color: style.outline, join: 'round' })
      }

      const side = style.lightFromLeft ? 1 : -1

      g.poly([cx + side * mouth, base - tall, cx + side * half, base, cx, base]).fill({ color: shade, alpha: 0.3 })

      if (style.glow !== undefined) {
        const crater = new Graphics()

        crater.ellipse(cx, base - tall, mouth * 0.9, mouth * 0.28).fill({ color: style.glow })

        // Lava running down the slope.
        for (let streak = 0; streak < 2 + Math.floor(random() * 2); streak++) {
          const lean = (random() - 0.5) * 0.9
          const points: number[] = [cx + lean * mouth, base - tall]

          for (let step = 1; step <= 5; step++) {
            const t = step / 5

            points.push(
              cx + lean * half * t + (random() - 0.5) * mouth * 0.6,
              base - tall + tall * t * (0.5 + random() * 0.15)
            )
          }

          crater.poly(points, false).stroke({ width: style.line * 1.6, color: style.glow, cap: 'round', join: 'round' })
        }

        crater.blendMode = 'add'
        pulses.push(crater)
        g.addChild(crater)
      }

      vents.push({ x: cx, y: base - tall })
    }

    return { graphics: g, pulses, vents }
  }

  // Spires: crystal shards of every height, glowing at the tip.
  const ridge: number[] = []
  let x = left

  while (x < right) {
    const width = height * (0.12 + random() * 0.12)
    const tall = height * (0.25 + random() * 0.75)
    const lean = (random() - 0.5) * width * 0.8

    ridge.push(x, base - height * 0.12, x + width / 2 + lean, base - tall, x + width, base - height * 0.12)
    x += width * (0.8 + random() * 1.6)
  }

  fillRidge(ridge)

  const tips = new Graphics()

  for (let index = 0; index < ridge.length; index += 6) {
    const [x0, y0, xc, yc] = ridge.slice(index, index + 4)

    g.poly([x0, y0, xc, yc, (x0 + xc) / 2 + (xc - x0) * 0.1, y0]).fill({ color: light, alpha: 0.35 })

    if (style.glow !== undefined && base - yc > height * 0.75) {
      tips.circle(xc, yc + height * 0.03, height * 0.03).fill({ color: style.glow })
    }
  }

  tips.blendMode = 'add'
  pulses.push(tips)
  g.addChild(tips)

  return { graphics: g, pulses, vents }
}

export interface LandmarkStyle {
  stone: number
  wood: number
  accent: number
  leaf: number
  outline: number
  glow?: number
  line: number
  lightFromLeft: boolean
}

export interface DrawnLandmark {
  display: Container
  /** Parts that turn (a windmill's blades), bob (floating rocks) or pulse (runes, falling water). */
  spinners: Container[]
  bobbers: Container[]
  pulses: Graphics[]
}

/** A landmark `size` pixels tall, standing on the origin. */
export function drawLandmark(kind: LandmarkKind, random: Random, size: number, style: LandmarkStyle): DrawnLandmark {
  const root = new Container()
  const g = new Graphics()
  const result: DrawnLandmark = { display: root, spinners: [], bobbers: [], pulses: [] }
  const { outline, line } = style
  const side = style.lightFromLeft ? 1 : -1
  const stroke = { width: line, color: outline, join: 'round' as const }
  const shadeOf = (color: number) => mix(color, 0x000000, 0.3)

  root.addChild(g)

  switch (kind) {
    case 'tower': {
      const w = size * 0.32
      const top = -size * 0.85
      const broken = random() < 0.6
      const body = [
        -w / 2,
        0,
        -w / 2,
        top,
        -w * 0.3,
        top,
        -w * 0.3,
        top - size * 0.08,
        -w * 0.1,
        top - size * 0.08,
        -w * 0.1,
        top,
        w * 0.1,
        top,
        w * 0.1,
        top - size * 0.08,
        w * 0.3,
        top - size * 0.08,
        ...(broken ? [w * 0.38, top + size * 0.12, w / 2, top + size * 0.2] : [w * 0.3, top, w / 2, top]),
        w / 2,
        0
      ]

      g.poly(body).fill({ color: style.stone }).stroke(stroke)
      g.rect(side > 0 ? 0 : -w / 2, top + size * 0.2, w / 2, -top - size * 0.2).fill({
        color: shadeOf(style.stone),
        alpha: 0.4
      })
      g.roundRect(-w * 0.1, top + size * 0.18, w * 0.2, size * 0.12, w * 0.1).fill({ color: outline })
      g.roundRect(-w * 0.14, -size * 0.2, w * 0.28, size * 0.2, w * 0.14).fill({ color: outline })
      // Bricks.
      for (let row = 0; row < 4; row++) {
        const y = top + size * (0.36 + row * 0.12)
        const x = (random() - 0.5) * w * 0.5

        g.rect(x - w * 0.12, y, w * 0.24, size * 0.04).fill({ color: shadeOf(style.stone), alpha: 0.5 })
      }
      break
    }
    case 'windmill': {
      const height = size * 0.62
      const bottom = size * 0.36
      const topW = size * 0.22

      g.poly([-bottom / 2, 0, -topW / 2, -height, topW / 2, -height, bottom / 2, 0])
        .fill({ color: style.stone })
        .stroke(stroke)
      g.poly([0, -height, (side * topW) / 2, -height, (side * bottom) / 2, 0, 0, 0]).fill({
        color: shadeOf(style.stone),
        alpha: 0.35
      })
      g.poly([-topW * 0.62, -height, 0, -height - size * 0.2, topW * 0.62, -height])
        .fill({ color: style.wood })
        .stroke(stroke)
      g.roundRect(-size * 0.05, -size * 0.16, size * 0.1, size * 0.16, size * 0.05).fill({ color: outline })
      g.circle(0, -height * 0.6, size * 0.035).fill({ color: outline })

      const blades = new Graphics()

      for (let blade = 0; blade < 4; blade++) {
        const angle = (blade * Math.PI) / 2
        const cos = Math.cos(angle)
        const sin = Math.sin(angle)
        const length = size * 0.5
        const sail = size * 0.09
        const corner = (along: number, across: number) => [cos * along - sin * across, sin * along + cos * across]

        blades.poly([0, 0, ...corner(length, 0)], false).stroke({ width: line * 1.4, color: style.wood })
        blades
          .poly([
            ...corner(length * 0.25, 0),
            ...corner(length, 0),
            ...corner(length, sail),
            ...corner(length * 0.25, sail)
          ])
          .fill({ color: mix(style.stone, 0xffffff, 0.35) })
          .stroke({ width: line * 0.8, color: outline })
      }

      blades
        .circle(0, 0, size * 0.04)
        .fill({ color: style.wood })
        .stroke(stroke)
      blades.position.set(0, -height + size * 0.02)
      blades.rotation = random() * Math.PI
      root.addChild(blades)
      result.spinners.push(blades)
      break
    }
    case 'castle': {
      const wallW = size * 0.7
      const wallH = size * 0.42
      const towerW = size * 0.2
      const towerH = size * 0.72

      g.rect(-wallW / 2, -wallH, wallW, wallH)
        .fill({ color: style.stone })
        .stroke(stroke)

      for (let index = 0; index < 5; index++) {
        g.rect(-wallW / 2 + (index + 0.25) * (wallW / 5), -wallH - size * 0.06, wallW / 10, size * 0.06)
          .fill({ color: style.stone })
          .stroke(stroke)
      }

      g.roundRect(-size * 0.08, -size * 0.24, size * 0.16, size * 0.24, size * 0.08).fill({ color: outline })

      for (const x of [-wallW / 2, wallW / 2]) {
        g.rect(x - towerW / 2, -towerH, towerW, towerH)
          .fill({ color: style.stone })
          .stroke(stroke)
        g.rect(x + (side > 0 ? 0 : -towerW / 2), -towerH, towerW / 2, towerH).fill({
          color: shadeOf(style.stone),
          alpha: 0.35
        })
        g.poly([x - towerW * 0.62, -towerH, x, -towerH - size * 0.26, x + towerW * 0.62, -towerH])
          .fill({ color: style.accent })
          .stroke(stroke)
        g.poly([x, -towerH - size * 0.26, x, -towerH - size * 0.38], false).stroke({ width: line, color: outline })
        g.poly([x, -towerH - size * 0.38, x + size * 0.1, -towerH - size * 0.345, x, -towerH - size * 0.31]).fill({
          color: style.accent
        })
        g.roundRect(x - towerW * 0.15, -towerH * 0.72, towerW * 0.3, size * 0.1, towerW * 0.15).fill({ color: outline })
      }
      break
    }
    case 'bigTree': {
      const trunkW = size * 0.16

      g.poly([-trunkW, 0, -trunkW * 0.45, -size * 0.55, trunkW * 0.45, -size * 0.55, trunkW, 0])
        .fill({ color: style.wood })
        .stroke(stroke)

      const blobs: [number, number, number][] = Array.from({ length: 6 }, (_, index) => {
        const angle = (index / 6) * Math.PI * 2 + random()

        return [
          Math.cos(angle) * size * 0.24,
          -size * 0.68 + Math.sin(angle) * size * 0.14,
          size * (0.18 + random() * 0.08)
        ]
      })

      blobs.push([0, -size * 0.72, size * 0.26])
      blobs.forEach(([x, y, r]) => g.circle(x, y, r + line).fill({ color: outline }))
      blobs.forEach(([x, y, r]) => g.circle(x, y, r).fill({ color: style.leaf }))
      blobs.forEach(([x, y, r]) =>
        g.circle(x + side * r * 0.25, y + r * 0.3, r * 0.7).fill({ color: shadeOf(style.leaf), alpha: 0.35 })
      )
      blobs.forEach(([x, y, r]) =>
        g.circle(x - side * r * 0.3, y - r * 0.35, r * 0.35).fill({ color: mix(style.leaf, 0xffffff, 0.3), alpha: 0.6 })
      )
      break
    }
    case 'arch': {
      const span = size * 0.8
      const thick = size * 0.18

      g.arc(0, -size * 0.55, span / 2, Math.PI, 0).stroke({ width: thick + line * 2, color: outline })
      g.arc(0, -size * 0.55, span / 2, Math.PI, 0).stroke({ width: thick, color: style.stone })

      for (const x of [-span / 2, span / 2]) {
        g.rect(x - thick / 2, -size * 0.56, thick, size * 0.56)
          .fill({ color: style.stone })
          .stroke(stroke)
      }

      g.rect((span / 2) * side - thick / 2, -size * 0.56, thick / 2, size * 0.56).fill({
        color: shadeOf(style.stone),
        alpha: 0.35
      })
      break
    }
    case 'pyramid': {
      const half = size * 0.8

      g.poly([-half, 0, 0, -size, half, 0]).fill({ color: style.stone }).stroke(stroke)
      g.poly([0, -size, side * half, 0, 0, 0]).fill({ color: shadeOf(style.stone), alpha: 0.35 })

      for (let step = 1; step < 6; step++) {
        const y = -size * (step / 6)
        const w = half * (1 - step / 6)

        g.poly([-w, y, w, y], false).stroke({ width: line * 0.6, color: shadeOf(style.stone), alpha: 0.6 })
      }

      g.roundRect(-size * 0.05, -size * 0.14, size * 0.1, size * 0.14, size * 0.05).fill({ color: outline })
      break
    }
    case 'obelisk': {
      const w = size * 0.18

      g.poly([-w / 2, 0, -w * 0.32, -size * 0.85, 0, -size, w * 0.32, -size * 0.85, w / 2, 0])
        .fill({ color: style.stone })
        .stroke(stroke)
      g.poly([0, -size, side * w * 0.32, -size * 0.85, (side * w) / 2, 0, 0, 0]).fill({
        color: shadeOf(style.stone),
        alpha: 0.35
      })

      const rune = new Graphics()

      rune.circle(0, -size * 0.55, w * 0.22).stroke({ width: line, color: style.glow ?? style.accent })
      rune
        .poly([0, -size * 0.7, 0, -size * 0.4], false)
        .stroke({ width: line * 0.8, color: style.glow ?? style.accent })
      rune.blendMode = 'add'
      root.addChild(rune)
      result.pulses.push(rune)
      break
    }
    case 'floatingRocks': {
      for (let index = 0; index < 3; index++) {
        const rock = new Graphics()
        const w = size * (0.22 + random() * 0.2)
        const depth = w * (0.9 + random() * 0.5)

        rock
          .poly([
            -w,
            0,
            -w * 0.5,
            depth * 0.55,
            w * 0.1,
            depth,
            w * 0.55,
            depth * 0.45,
            w,
            0,
            w * 0.4,
            -w * 0.12,
            -w * 0.5,
            -w * 0.1
          ])
          .fill({ color: style.stone })
          .stroke(stroke)
        rock
          .poly([w * 0.1, depth, w * 0.55 * side, depth * 0.45, w * side, 0, 0, 0])
          .fill({ color: shadeOf(style.stone), alpha: 0.35 })
        rock.ellipse(0, -w * 0.08, w * 0.85, w * 0.12).fill({ color: style.leaf })

        if (style.glow !== undefined) {
          rock.circle(-w * 0.3, depth * 0.35, w * 0.08).fill({ color: style.glow })
        }

        rock.position.set((index - 1) * size * 0.55 + (random() - 0.5) * size * 0.2, -size * (0.55 + random() * 0.6))
        root.addChild(rock)
        result.bobbers.push(rock)
      }
      break
    }
    case 'iceSpire': {
      for (let index = 0; index < 5; index++) {
        const x = (index - 2) * size * 0.14 + (random() - 0.5) * size * 0.06
        const tall = size * (index === 2 ? 1 : 0.4 + random() * 0.4)
        const w = size * 0.12
        const lean = (index - 2) * size * 0.06

        g.poly([x - w / 2, 0, x + lean, -tall, x + w / 2, 0])
          .fill({ color: style.stone })
          .stroke(stroke)
        g.poly([x - w / 2, 0, x + lean, -tall, x, 0]).fill({ color: 0xffffff, alpha: 0.45 })
      }
      break
    }
    case 'waterfall':
    case 'lavaFall': {
      const lava = kind === 'lavaFall'
      const w = size * 0.7
      const fallW = size * 0.18
      const liquid = lava ? (style.glow ?? 0xff8a1a) : 0x9adcff
      const cliff = [
        -w / 2,
        0,
        -w * 0.45,
        -size * 0.8,
        -w * 0.2,
        -size,
        w * 0.25,
        -size * 0.95,
        w * 0.48,
        -size * 0.7,
        w / 2,
        0
      ]

      g.poly(cliff).fill({ color: style.stone }).stroke(stroke)
      g.poly([0, -size, w * 0.5 * side, -size * 0.7, (w / 2) * side, 0, 0, 0]).fill({
        color: shadeOf(style.stone),
        alpha: 0.3
      })
      g.rect(-fallW / 2, -size * 0.97, fallW, size * 0.97).fill({ color: liquid })

      const streaks = new Graphics()

      for (let streak = 0; streak < 4; streak++) {
        const x = -fallW / 2 + fallW * (0.15 + streak * 0.23)

        streaks.poly([x, -size * 0.95, x, -size * (0.2 + random() * 0.4)], false).stroke({
          width: line,
          color: lava ? 0xffe07a : 0xffffff,
          alpha: 0.8
        })
      }

      streaks.ellipse(0, 0, fallW * 1.1, fallW * 0.3).fill({ color: lava ? 0xffe07a : 0xffffff })

      if (lava) {
        streaks.blendMode = 'add'
      }

      root.addChild(streaks)
      result.pulses.push(streaks)
      break
    }
    case 'skullRock': {
      const w = size * 0.9

      g.poly([
        -w / 2,
        0,
        -w * 0.5,
        -size * 0.55,
        -w * 0.3,
        -size * 0.92,
        w * 0.1,
        -size,
        w * 0.42,
        -size * 0.8,
        w / 2,
        -size * 0.35,
        w * 0.45,
        0
      ])
        .fill({ color: style.stone })
        .stroke(stroke)
      g.poly([
        w * 0.1,
        -size,
        w * 0.42 * side,
        -size * 0.8,
        (w / 2) * side,
        -size * 0.35,
        w * 0.45 * side,
        0,
        0,
        0
      ]).fill({
        color: shadeOf(style.stone),
        alpha: 0.35
      })

      const eyes = new Graphics()

      eyes.ellipse(-w * 0.18, -size * 0.58, w * 0.11, size * 0.12).fill({ color: outline })
      eyes.ellipse(w * 0.16, -size * 0.58, w * 0.11, size * 0.12).fill({ color: outline })
      eyes.poly([-w * 0.04, -size * 0.36, 0, -size * 0.46, w * 0.04, -size * 0.36]).fill({ color: outline })
      g.roundRect(-w * 0.25, -size * 0.26, w * 0.5, size * 0.26, w * 0.05).fill({ color: outline })

      for (let tooth = 0; tooth < 4; tooth++) {
        g.rect(-w * 0.22 + tooth * w * 0.115, -size * 0.25, w * 0.09, size * 0.11).fill({ color: style.stone })
      }

      root.addChild(eyes)

      if (style.glow !== undefined) {
        const glow = new Graphics()

        glow.circle(-w * 0.18, -size * 0.56, w * 0.04).fill({ color: style.glow })
        glow.circle(w * 0.16, -size * 0.56, w * 0.04).fill({ color: style.glow })
        glow.blendMode = 'add'
        root.addChild(glow)
        result.pulses.push(glow)
      }
      break
    }
  }

  return result
}

/** A cloud `width` pixels wide, centered on the origin: puffy, a long wisp, or a dark smoke plume. */
export function drawCloud(kind: CloudKind, random: Random, width: number, color: number, shade: number): Graphics {
  const g = new Graphics()

  if (kind === 'wisps') {
    for (let index = 0; index < 3; index++) {
      g.ellipse(
        (random() - 0.5) * width * 0.4,
        (index - 1) * width * 0.04,
        width * (0.3 + random() * 0.2),
        width * 0.035
      ).fill({
        color,
        alpha: 0.5
      })
    }

    return g
  }

  const puffs: [number, number, number][] = []
  const count = 4 + Math.floor(random() * 3)

  for (let index = 0; index < count; index++) {
    const t = index / (count - 1)
    const r = width * (0.1 + Math.sin(t * Math.PI) * (0.1 + random() * 0.06))

    puffs.push([(t - 0.5) * width * 0.75, -r * 0.6, r])
  }

  // The flat base goes first, so the puffs cover it and it only fills the gaps between them.
  g.roundRect(-width * 0.42, -width * 0.04, width * 0.84, width * 0.08, width * 0.04).fill({ color: shade })
  puffs.forEach(([x, y, r]) => g.circle(x, y + r * 0.18, r).fill({ color: shade }))
  puffs.forEach(([x, y, r]) => g.circle(x - r * 0.08, y, r * 0.92).fill({ color }))

  if (kind === 'smoke') {
    g.alpha = 0.75
  }

  return g
}

/** The sun, the moon or a dark eclipse, `radius` pixels, centered on the origin. */
export function drawCelestial(kind: 'sun' | 'moon' | 'eclipse', radius: number, glow: number): Graphics {
  const g = new Graphics()

  if (kind === 'sun') {
    g.circle(0, 0, radius * 1.3).fill({ color: 0xfff6c8, alpha: 0.35 })
    g.circle(0, 0, radius).fill({ color: 0xfff2a8 })
    g.circle(-radius * 0.12, -radius * 0.12, radius * 0.75).fill({ color: 0xfffbe0 })
  } else if (kind === 'moon') {
    g.circle(0, 0, radius).fill({ color: 0xf4f0dc })
    g.circle(radius * 0.3, -radius * 0.2, radius * 0.22).fill({ color: 0xd8d2b8 })
    g.circle(-radius * 0.35, radius * 0.25, radius * 0.16).fill({ color: 0xd8d2b8 })
    g.circle(radius * 0.05, radius * 0.45, radius * 0.1).fill({ color: 0xd8d2b8 })
  } else {
    g.circle(0, 0, radius * 1.18).fill({ color: glow, alpha: 0.45 })
    g.circle(0, 0, radius * 1.06).fill({ color: mix(glow, 0xffffff, 0.5) })
    g.circle(0, 0, radius).fill({ color: 0x12061a })
  }

  return g
}

/** Points along a line from `left` to `right`, every `step` pixels, as [x0, y0, x1, y1, …]. */
function sample(left: number, right: number, step: number, yAt: (x: number) => number): number[] {
  const points: number[] = []

  for (let x = left; x < right + step; x += step) {
    points.push(Math.min(x, right), yAt(Math.min(x, right)))
  }

  return points
}

export function mix(a: number, b: number, share: number): number {
  const channel = (shift: number) =>
    Math.round(((a >> shift) & 0xff) * (1 - share) + ((b >> shift) & 0xff) * share) << shift

  return channel(16) | channel(8) | channel(0)
}
