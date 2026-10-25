import { Application, Container, Graphics, Text } from 'pixi.js'
import { getCharacterDefinition } from '@/app/(protected)/(engine)/data/characters'
import { getSpecies } from '@/app/(protected)/(engine)/data/enemies'
import { Archetype } from '@/app/(protected)/(engine)/models/Archetype'
import { BattleEvent } from '@/app/(protected)/(engine)/models/BattleEvent'
import { BattleState } from '@/app/(protected)/(engine)/models/BattleState'
import { CharacterId } from '@/app/(protected)/(engine)/models/CharacterId'
import { Combatant } from '@/app/(protected)/(engine)/models/Combatant'
import { DamageType } from '@/app/(protected)/(engine)/models/DamageType'
import { StatusType } from '@/app/(protected)/(engine)/models/StatusType'
import { BIOME_GROUND } from '@/app/(protected)/(world)/utils/mapStyle'

/** Texts the scene shows over the fighters (already translated). */
export interface BattleLabels {
  skill: (skillId: string) => string
  item: (itemId: string) => string
  status: (status: StatusType) => string
  weak: string
  resist: string
  immune: string
  miss: string
  transform: string
}

/** One fighter drawn on the stage. */
interface Figure {
  root: Container
  body: Container
  healthBar: Graphics
  barsText: Text | null
  statusText: Text
  side: Combatant['side']
  size: number
  health: number
  maxHealth: number
  bars: number
  home: { x: number; y: number }
}

const DAMAGE_COLORS: Partial<Record<DamageType, number>> = {
  [DamageType.FIRE]: 0xff8a00,
  [DamageType.ICE]: 0x7dd3fc,
  [DamageType.LIGHTNING]: 0xfde047,
  [DamageType.EARTH]: 0xd6a35c,
  [DamageType.LIGHT]: 0xfff7c2,
  [DamageType.DARKNESS]: 0xc084fc
}
const FONT = 'Bungee, "Arial Black", sans-serif'
/** Height of a fighter of size 1, in stage pixels at scale 1. */
const FIGURE_HEIGHT = 120
const OUTLINE = 0x0a0710

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * The side-view battle scene (Hero Wars style) drawn with PixiJS: heroes on
 * the left, monsters on the right, provisional figures made of shapes,
 * floating numbers, flashes and camera shake. It only shows what the engine
 * says (see `play`); the choices are made in the React interface.
 */
export class BattleRenderer {
  private readonly stage = new Container()
  private readonly background = new Graphics()
  private readonly fighters = new Container()
  private readonly effects = new Container()
  private readonly figures = new Map<string, Figure>()
  private readonly marker = new Graphics()
  private markedId: string | null = null
  private elapsed = 0
  /** Follows the size of the element (it can change without the window doing so, e.g. panels below it). */
  private resizeObserver: ResizeObserver | null = null
  /** Animation speed (×1 or ×2). */
  speed = 1

  private constructor(
    private readonly app: Application,
    private readonly biome: BattleState['biome'],
    private readonly labels: BattleLabels,
    private readonly onTap: (combatantId: string) => void
  ) {
    this.stage.addChild(this.background, this.marker, this.fighters, this.effects)
    app.stage.addChild(this.stage)
    app.ticker.add((ticker) => this.animate(ticker.deltaMS))
  }

  static async create(
    element: HTMLElement,
    battle: BattleState,
    labels: BattleLabels,
    onTap: (combatantId: string) => void
  ): Promise<BattleRenderer> {
    const app = new Application()

    await app.init({
      resizeTo: element,
      background: '#07040d',
      antialias: true,
      autoDensity: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2)
    })
    element.appendChild(app.canvas)

    const renderer = new BattleRenderer(app, battle.biome, labels, onTap)

    renderer.resizeObserver = new ResizeObserver(() => app.resize())
    renderer.resizeObserver.observe(element)

    renderer.layout(battle)
    app.renderer.on('resize', () => renderer.layout(battle))

    return renderer
  }

  destroy(): void {
    this.resizeObserver?.disconnect()
    // Not `true`: that also releases resources shared with the other PixiJS apps of the page.
    this.app.destroy({ removeView: true }, { children: true })
  }

  private get width(): number {
    return this.app.screen.width
  }

  private get height(): number {
    return this.app.screen.height
  }

  private get scale(): number {
    return Math.max(0.5, Math.min(1.1, this.width / 560, this.height / 380))
  }

  /** The ground line: low on wide screens, closer to the middle on tall ones. */
  private get groundY(): number {
    return Math.min(this.height * 0.74, this.height / 2 + 150 * this.scale)
  }

  /** Draws the background and places every fighter at its spot (on start and on resize). */
  layout(battle: BattleState): void {
    this.drawBackground()

    for (const combatant of battle.combatants) {
      this.ensureFigure(combatant, battle)
    }

    this.placeAll(battle)
  }

  private drawBackground(): void {
    const ground = parseInt(BIOME_GROUND[this.biome].slice(1), 16)
    const g = this.background
    const horizon = this.groundY - 40 * this.scale

    g.clear()
    g.rect(0, 0, this.width, horizon).fill({ color: 0x120a24 })
    g.rect(0, horizon * 0.55, this.width, horizon * 0.45).fill({ color: mix(0x120a24, ground, 0.25) })

    // Stars and a moon, so a tall sky is not empty.
    for (let index = 0; index < 40; index++) {
      const x = ((index * 73) % 101) / 100
      const y = ((index * 37) % 89) / 89

      g.circle(x * this.width, y * horizon * 0.6, 1 + (index % 3) * 0.5).fill({
        color: 0xffffff,
        alpha: 0.25 + (index % 4) * 0.15
      })
    }

    g.circle(this.width * 0.82, horizon * 0.18, 22 * this.scale).fill({ color: 0xf5e6c8, alpha: 0.85 })

    // Far hills.
    for (let index = 0; index < 7; index++) {
      const x = (index / 6) * this.width
      const radius = this.width * (0.12 + ((index * 37) % 5) * 0.02)

      g.circle(x, horizon + radius * 0.35, radius).fill({ color: mix(0x120a24, ground, 0.45) })
    }

    g.rect(0, horizon, this.width, this.height - horizon).fill({ color: mix(ground, 0x000000, 0.35) })
    g.rect(0, horizon, this.width, 6).fill({ color: mix(ground, 0xffffff, 0.15) })
  }

  /** Spot of a fighter: heroes on the left, enemies on the right, in staggered rows. */
  private spotOf(combatant: Combatant, battle: BattleState): { x: number; y: number } {
    const side = battle.combatants.filter(
      (other) =>
        other.side === combatant.side &&
        (combatant.side === 'hero' ? !other.reserve : other.id.startsWith(combatant.id.split('-')[0]))
    )
    const index = Math.max(
      0,
      side.findIndex((other) => other.id === combatant.id)
    )
    const rows = [0, -46, 46]
    const y = this.groundY + rows[index % 3] * this.scale

    if (combatant.side === 'hero') {
      return { x: this.width * (0.31 - 0.1 * (index % 3)), y }
    }

    return { x: this.width * (0.69 + 0.1 * (index % 3)), y }
  }

  private placeAll(battle: BattleState): void {
    for (const combatant of battle.combatants) {
      const figure = this.figures.get(combatant.id)

      if (!figure) {
        continue
      }

      const spot = this.spotOf(combatant, battle)

      figure.home = spot
      figure.root.position.set(spot.x, spot.y)
      figure.root.scale.set(this.scale)
      figure.root.visible = !(combatant.side === 'hero' && combatant.reserve)

      if (combatant.side === 'enemy' && combatant.id.split('-')[0] !== `e${battle.phase + 1}`) {
        figure.root.visible = false
      }
    }

    this.fighters.children.sort((a, b) => a.y - b.y)
  }

  private ensureFigure(combatant: Combatant, battle: BattleState): Figure {
    const existing = this.figures.get(combatant.id)

    if (existing) {
      return existing
    }

    const size = combatant.side === 'enemy' ? getSpecies(combatant.speciesId!).size * (combatant.elite ? 1.15 : 1) : 1
    const root = new Container()
    const body = combatant.side === 'hero' ? drawHero(combatant.characterId!) : drawEnemy(combatant)
    const healthBar = new Graphics()
    const statusText = new Text({
      text: '',
      style: { fontFamily: FONT, fontSize: 11, fill: 0xe9d5ff, stroke: { color: OUTLINE, width: 4 } }
    })
    const barsText =
      combatant.bars > 1
        ? new Text({
            text: '',
            style: { fontFamily: FONT, fontSize: 14, fill: 0xffc233, stroke: { color: OUTLINE, width: 4 } }
          })
        : null

    body.scale.set(size)
    healthBar.position.set(0, -FIGURE_HEIGHT * size - 18)
    // Below the feet, so it never covers the numbers that rise over the head.
    statusText.anchor.set(0.5, 0)
    statusText.position.set(0, 10)
    root.addChild(body, healthBar, statusText)

    if (barsText) {
      barsText.anchor.set(0, 0.5)
      barsText.position.set(44, -FIGURE_HEIGHT * size - 14)
      root.addChild(barsText)
    }

    root.eventMode = 'static'
    root.cursor = 'pointer'
    root.on('pointertap', () => this.onTap(combatant.id))

    const figure: Figure = {
      root,
      body,
      healthBar,
      barsText,
      statusText,
      side: combatant.side,
      size,
      health: combatant.health,
      maxHealth: combatant.stats.maxHealth,
      bars: combatant.bars,
      home: this.spotOf(combatant, battle)
    }

    this.figures.set(combatant.id, figure)
    this.fighters.addChild(root)
    this.drawHealth(figure)

    if (combatant.health <= 0) {
      root.alpha = 0.35
      body.rotation = combatant.side === 'hero' ? -1.2 : 1.2
    }

    return figure
  }

  private drawHealth(figure: Figure): void {
    const width = 76
    const share = Math.max(0, figure.health / figure.maxHealth)
    const g = figure.healthBar

    g.clear()
    g.roundRect(-width / 2 - 3, -3, width + 6, 14, 6).fill({ color: OUTLINE })
    g.roundRect(-width / 2, 0, width * share, 8, 4).fill({
      color: figure.side === 'hero' ? 0x84f06b : share < 0.3 ? 0xff4d8d : 0xd7263d
    })

    if (figure.barsText) {
      figure.barsText.text = figure.bars > 1 ? `×${figure.bars}` : ''
    }
  }

  /** Brings the drawing in line with the state (statuses, health, who is on the field, the marked fighter). */
  sync(battle: BattleState, markedId: string | null): void {
    this.markedId = markedId

    for (const combatant of battle.combatants) {
      const figure = this.ensureFigure(combatant, battle)

      figure.health = combatant.health
      figure.maxHealth = combatant.stats.maxHealth
      figure.bars = combatant.bars
      figure.statusText.text = combatant.statuses.map((status) => this.labels.status(status.type)).join(' · ')
      this.drawHealth(figure)
      figure.healthBar.visible = combatant.health > 0
    }

    this.placeAll(battle)
  }

  /** Animates the events of a step of the battle, in order. */
  async play(events: BattleEvent[], after: BattleState): Promise<void> {
    for (const event of events) {
      await this.playEvent(event, after)
    }
  }

  private async playEvent(event: BattleEvent, after: BattleState): Promise<void> {
    const ms = (value: number) => value / this.speed

    switch (event.type) {
      case 'turn': {
        const figure = this.figures.get(event.actorId)

        if (figure) {
          await this.tween(ms(160), (t) => figure.body.position.set(0, -Math.sin(t * Math.PI) * 10))
        }

        break
      }

      case 'action': {
        const actor = this.figures.get(event.actorId)
        const target = this.figures.get(event.targetIds[0])

        if (!actor) {
          break
        }

        this.float(actor, this.labels.skill(event.skillId), 0xffffff, 15, -40)

        if (target && target.side !== actor.side) {
          const dx = (target.home.x - actor.home.x) * 0.55
          const dy = (target.home.y - actor.home.y) * 0.55

          await this.tween(ms(170), (t) =>
            actor.root.position.set(actor.home.x + dx * ease(t), actor.home.y + dy * ease(t))
          )
          void this.tween(ms(220), (t) =>
            actor.root.position.set(actor.home.x + dx * (1 - ease(t)), actor.home.y + dy * (1 - ease(t)))
          )
        } else {
          await this.tween(ms(260), (t) => actor.body.scale.set(actor.size * (1 + Math.sin(t * Math.PI) * 0.12)))
        }

        break
      }

      case 'damage':

      case 'statusTick': {
        const figure = this.figures.get(event.targetId)

        if (!figure) {
          break
        }

        figure.health = Math.max(0, figure.health - event.amount)
        this.drawHealth(figure)

        const critical = event.type === 'damage' && event.critical
        const color =
          event.type === 'statusTick'
            ? event.status === StatusType.POISON
              ? 0xa3e635
              : 0xff8a00
            : critical
              ? 0xffc233
              : (DAMAGE_COLORS[event.damageType] ?? 0xffffff)

        this.float(figure, critical ? `${event.amount}!` : String(event.amount), color, critical ? 30 : 22)

        if (event.type === 'damage' && event.weak) {
          this.float(figure, this.labels.weak, 0xffc233, 14, -26)
        }

        if (event.type === 'damage' && event.resisted) {
          this.float(figure, this.labels.resist, 0x9ca3af, 14, -26)
        }

        if (critical) {
          void this.shake(ms(240), 7)
        }

        await this.hit(figure, ms(220))
        break
      }

      case 'item': {
        const actor = this.figures.get(event.actorId)

        if (actor) {
          this.float(actor, this.labels.item(event.itemId), 0xffc233, 15, -40)
          await this.tween(ms(260), (t) => actor.body.scale.set(actor.size * (1 + Math.sin(t * Math.PI) * 0.12)))
        }

        break
      }

      case 'revive': {
        const figure = this.figures.get(event.targetId)

        if (!figure) {
          break
        }

        const rotation = figure.body.rotation

        figure.health = event.amount
        figure.healthBar.visible = true
        this.drawHealth(figure)
        await this.tween(ms(380), (t) => {
          figure.body.rotation = rotation * (1 - t)
          figure.root.alpha = 0.35 + 0.65 * t
        })
        this.float(figure, `+${event.amount}`, 0x84f06b, 22)
        break
      }

      case 'focus': {
        const figure = this.figures.get(event.targetId)

        if (figure) {
          this.float(figure, `+${event.amount}`, 0x22d3ee, 18)
        }

        await wait(ms(220))
        break
      }

      case 'heal': {
        const figure = this.figures.get(event.targetId)

        if (!figure) {
          break
        }

        figure.health = Math.min(figure.maxHealth, figure.health + event.amount)
        this.drawHealth(figure)
        this.float(figure, `+${event.amount}`, 0x84f06b, 22)
        await wait(ms(260))
        break
      }

      case 'miss':

      case 'immune': {
        const figure = this.figures.get(event.targetId)

        if (figure) {
          this.float(figure, event.type === 'miss' ? this.labels.miss : this.labels.immune, 0xd1d5db, 16)
        }

        await wait(ms(260))
        break
      }

      case 'status':

      case 'skip': {
        const id = event.type === 'status' ? event.targetId : event.actorId
        const figure = this.figures.get(id)

        if (figure) {
          this.float(figure, this.labels.status(event.status), 0xc084fc, 14, -28)
        }

        await wait(ms(event.type === 'skip' ? 420 : 200))
        break
      }

      case 'fall': {
        const figure = this.figures.get(event.targetId)

        if (!figure) {
          break
        }

        const direction = figure.side === 'hero' ? -1 : 1

        await this.tween(ms(380), (t) => {
          figure.body.rotation = direction * 1.2 * t
          figure.root.alpha = 1 - 0.65 * t
        })
        break
      }

      case 'nextBar': {
        const figure = this.figures.get(event.targetId)

        if (!figure) {
          break
        }

        figure.bars = event.bars
        figure.health = figure.maxHealth
        this.float(figure, this.labels.transform, 0xff4d8d, 18, -30)
        void this.shake(ms(500), 10)
        await this.tween(ms(500), (t) => {
          figure.body.scale.set(figure.size * (1 + Math.sin(t * Math.PI) * 0.25))
          figure.body.tint = t < 0.5 ? 0xff7777 : 0xffffff
        })
        figure.size *= 1.08
        figure.body.scale.set(figure.size)
        this.drawHealth(figure)
        break
      }

      case 'phase': {
        if (event.phase === 0) {
          break
        }

        this.sync(after, null)

        const entering = event.enemyIds.map((id) => this.figures.get(id)!).filter(Boolean)

        for (const figure of entering) {
          figure.root.visible = true
        }

        await this.tween(ms(500), (t) => {
          for (const figure of entering) {
            figure.root.position.x = figure.home.x + (1 - ease(t)) * this.width * 0.4
          }
        })
        break
      }

      case 'reserves': {
        this.sync(after, null)

        const entering = event.heroIds.map((id) => this.figures.get(id)!).filter(Boolean)

        await this.tween(ms(500), (t) => {
          for (const figure of entering) {
            figure.root.position.x = figure.home.x - (1 - ease(t)) * this.width * 0.4
          }
        })
        break
      }

      default:
        break
    }
  }

  private hit(figure: Figure, duration: number): Promise<void> {
    const direction = figure.side === 'hero' ? -1 : 1

    return this.tween(duration, (t) => {
      figure.body.alpha = t < 0.35 ? 0.55 : 1
      figure.body.position.x = Math.sin(t * Math.PI * 4) * 6 * direction * (1 - t)
    })
  }

  /** A text that rises and fades over a fighter. */
  private float(figure: Figure, text: string, color: number, size: number, offset = 0): void {
    const label = new Text({
      text,
      style: { fontFamily: FONT, fontSize: size, fill: color, stroke: { color: OUTLINE, width: 5 } }
    })
    const start = {
      x: figure.root.position.x + (Math.random() - 0.5) * 20,
      y: figure.root.position.y - FIGURE_HEIGHT * figure.size * this.scale * 0.7 + offset
    }

    label.anchor.set(0.5)
    label.position.set(start.x, start.y)
    label.scale.set(Math.max(0.8, this.scale))
    this.effects.addChild(label)
    void this.tween(900 / this.speed, (t) => {
      label.position.y = start.y - 46 * t
      label.alpha = t < 0.7 ? 1 : 1 - (t - 0.7) / 0.3
    }).then(() => label.destroy())
  }

  private shake(duration: number, strength: number): Promise<void> {
    return this.tween(duration, (t) => {
      const amount = strength * (1 - t)

      this.stage.position.set((Math.random() - 0.5) * amount, (Math.random() - 0.5) * amount)
    }).then(() => {
      this.stage.position.set(0, 0)
    })
  }

  private tween(duration: number, update: (t: number) => void): Promise<void> {
    return new Promise((resolve) => {
      let time = 0

      const step = (ticker: { deltaMS: number }) => {
        time += ticker.deltaMS
        const t = Math.min(1, time / Math.max(1, duration))

        update(t)

        if (t >= 1) {
          this.app.ticker.remove(step)
          resolve()
        }
      }

      this.app.ticker.add(step)
    })
  }

  /** The marked fighter (whose turn it is, or the chosen target) gets a ring at its feet; everybody breathes. */
  private animate(deltaMS: number): void {
    this.elapsed += deltaMS / 1000
    this.marker.clear()

    const marked = this.markedId ? this.figures.get(this.markedId) : null

    if (marked && marked.root.visible) {
      const pulse = 1 + Math.sin(this.elapsed * 5) * 0.08
      const width = 46 * marked.size * this.scale * pulse

      this.marker
        .ellipse(marked.root.position.x, marked.root.position.y + 4, width, width * 0.3)
        .stroke({ width: 4, color: marked.side === 'hero' ? 0xffc233 : 0xff4d8d })
    }

    for (const [, figure] of this.figures) {
      if (figure.root.alpha === 1) {
        figure.body.scale.y = figure.size * (1 + Math.sin(this.elapsed * 2.4 + figure.home.x) * 0.015)
      }
    }
  }
}

function ease(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
}

function mix(a: number, b: number, share: number): number {
  const channel = (shift: number) => Math.round(((a >> shift) & 0xff) * (1 - share) + ((b >> shift) & 0xff) * share)

  return (channel(16) << 16) | (channel(8) << 8) | channel(0)
}

/** Provisional hero: a figure facing right with its weapon. */
function drawHero(characterId: CharacterId): Container {
  const color = getCharacterDefinition(characterId).color
  const container = new Container()
  const g = new Graphics()
  const stroke = { width: 4, color: OUTLINE }

  // Shadow, legs, body, head.
  g.ellipse(0, 0, 30, 8).fill({ color: 0x000000, alpha: 0.35 })
  g.roundRect(-14, -40, 11, 40, 4)
    .fill({ color: mix(color, 0x000000, 0.5) })
    .stroke(stroke)
  g.roundRect(3, -40, 11, 40, 4)
    .fill({ color: mix(color, 0x000000, 0.5) })
    .stroke(stroke)
  g.roundRect(-20, -88, 40, 52, 10).fill({ color }).stroke(stroke)
  g.circle(0, -102, 15).fill({ color: 0xf2c9a0 }).stroke(stroke)
  g.rect(4, -106, 5, 5).fill({ color: OUTLINE })

  switch (characterId) {
    case CharacterId.KAEL:
      g.roundRect(18, -110, 7, 62, 2).fill({ color: 0xe5e7eb }).stroke(stroke)
      g.rect(12, -52, 19, 6).fill({ color: 0xffc233 }).stroke(stroke)
      break
    case CharacterId.SERA:
      g.arc(26, -70, 34, -1.2, 1.2).stroke({ width: 6, color: 0x8b5a2b })
      g.moveTo(38, -101).lineTo(38, -39).stroke({ width: 2, color: 0xe5e7eb })
      break
    case CharacterId.BRANN:
      g.roundRect(18, -112, 6, 72, 2).fill({ color: 0x8b5a2b }).stroke(stroke)
      g.poly([24, -112, 50, -104, 50, -84, 24, -92]).fill({ color: 0xd1d5db }).stroke(stroke)
      break
    case CharacterId.OREN:
      g.roundRect(20, -120, 6, 120, 2).fill({ color: 0x6b4423 }).stroke(stroke)
      g.circle(23, -124, 9).fill({ color: 0x84cc16 }).stroke(stroke)
      break
    case CharacterId.YSOLDE:
      g.roundRect(20, -118, 6, 118, 2).fill({ color: 0x3b2f5c }).stroke(stroke)
      g.circle(23, -124, 11).fill({ color: 0xc084fc }).stroke(stroke)
      break
  }

  container.addChild(g)

  return container
}

/** Provisional enemy: a shape by archetype, in the color of its species, facing left. */
function drawEnemy(combatant: Combatant): Container {
  const species = getSpecies(combatant.speciesId!)
  const color = species.color
  const container = new Container()
  const g = new Graphics()
  const stroke = { width: 4, color: OUTLINE }

  const eye = (x: number, y: number) => {
    g.circle(x, y, 6).fill({ color: 0xffffff }).stroke({ width: 2, color: OUTLINE })
    g.circle(x - 2, y, 3).fill({ color: combatant.elite || species.strength > 1 ? 0xff2a2a : OUTLINE })
  }

  g.ellipse(0, 0, 38, 10).fill({ color: 0x000000, alpha: 0.35 })

  switch (species.archetype) {
    case Archetype.BRUTE:
      g.ellipse(0, -46, 44, 40).fill({ color }).stroke(stroke)
      g.poly([-30, -78, -42, -104, -18, -84]).fill({ color: 0xf3e2b3 }).stroke(stroke)
      g.poly([22, -82, 30, -108, 40, -78]).fill({ color: 0xf3e2b3 }).stroke(stroke)
      eye(-20, -56)
      eye(2, -58)
      g.roundRect(-34, -12, 16, 14, 4)
        .fill({ color: mix(color, 0x000000, 0.4) })
        .stroke(stroke)
      g.roundRect(18, -12, 16, 14, 4)
        .fill({ color: mix(color, 0x000000, 0.4) })
        .stroke(stroke)
      break
    case Archetype.AGILE:
      g.poly([-40, -40, 0, -96, 36, -30, 10, 0, -24, 0]).fill({ color }).stroke(stroke)
      eye(-14, -58)
      g.poly([-40, -40, -58, -36, -40, -30]).fill({ color: 0xf3e2b3 }).stroke(stroke)
      break
    case Archetype.TANK:
      g.roundRect(-42, -96, 84, 96, 12).fill({ color }).stroke(stroke)
      g.rect(-42, -60, 84, 10).fill({ color: mix(color, 0x000000, 0.35) })
      eye(-18, -74)
      eye(6, -74)
      break
    case Archetype.CASTER:
      g.circle(0, -70, 34).fill({ color, alpha: 0.25 })
      g.poly([0, -120, 30, -70, 0, -22, -30, -70]).fill({ color }).stroke(stroke)
      eye(-8, -74)
      break
    case Archetype.HEALER:
      g.ellipse(-30, -66, 22, 12).fill({ color: 0xfff7c2, alpha: 0.8 }).stroke(stroke)
      g.ellipse(30, -66, 22, 12).fill({ color: 0xfff7c2, alpha: 0.8 }).stroke(stroke)
      g.circle(0, -58, 26).fill({ color }).stroke(stroke)
      eye(-10, -62)
      break
  }

  if (species.strength > 1) {
    const top = species.archetype === Archetype.CASTER ? -126 : -104

    g.poly([-20, top, -12, top - 18, 0, top - 6, 12, top - 18, 20, top])
      .fill({ color: 0xffc233 })
      .stroke(stroke)
  }

  container.addChild(g)

  return container
}
