'use client'

import './index.scss'
import { Application, Container, Graphics } from 'pixi.js'
import { MutableRefObject, useEffect, useMemo, useRef, useState } from 'react'
import { Rig, RIGS } from '@/app/(protected)/(art)/data/rigs'
import { SHADOWS } from '@/app/(protected)/(art)/data/shadows'
import { ArtManifest } from '@/app/(protected)/(art)/models/ArtManifest'
import { artUrl, figureArtId, loadArtManifest, loadTextures } from '@/app/(protected)/(art)/utils/art'
import { RigFigure, rigPartIds } from '@/app/(protected)/(art)/utils/rig'
import {
  artHeight,
  drawArt,
  drawEnemy,
  drawHero,
  drawRig,
  FIGURE_HEIGHT
} from '@/app/(protected)/(battle)/utils/battleRenderer'
import { BIOMES, getBiomeDefinition } from '@/app/(protected)/(engine)/data/biomes'
import {
  BOSS_SPECIES,
  ENEMIES,
  FINAL_BOSS_SPECIES,
  getEnemyRewards,
  getEnemyStats,
  GUARDIAN_SPECIES
} from '@/app/(protected)/(engine)/data/enemies'
import { WEAPONS } from '@/app/(protected)/(engine)/data/weapons'
import { ABYSS_GATE_GUARDIAN } from '@/app/(protected)/(engine)/data/world'
import { Affinity } from '@/app/(protected)/(engine)/models/Affinity'
import { CharacterId } from '@/app/(protected)/(engine)/models/CharacterId'
import { Combatant } from '@/app/(protected)/(engine)/models/Combatant'
import { EnemySpecies } from '@/app/(protected)/(engine)/models/EnemySpecies'
import { useT } from '@/app/i18n/I18nProvider'
import { MessageKey } from '@/app/i18n/messages'

const SPEEDS = [1, 0.5, 0.25]
/** As in battle (battleRenderer): how long each move takes. */
const ATTACK = { rig: 560, approach: { rig: 250, art: 170 }, strike: 110, back: 220 }
const CAST = { rig: 420, art: 260 }
const HIT = 220
/** Pause between moves while they repeat. */
const LOOP_PAUSE = 700
/** The hero the bosses are measured against: the one who is always in the party. */
const HERO = CharacterId.KAEL

/** What a boss is in the game. */
type BossRole = 'final' | 'gate' | 'seal' | 'captor' | 'miniboss' | 'guardian' | 'warden'

const ROLE_LABELS: Record<BossRole, string> = {
  final: 'Jefe final',
  gate: 'Puerta del Abismo',
  seal: 'Sello',
  captor: 'Captor',
  miniboss: 'Mini jefe',
  guardian: 'Guardián de santuario',
  warden: 'Guardián de relicario'
}
const ROLE_ORDER: BossRole[] = ['captor', 'seal', 'gate', 'final', 'miniboss', 'guardian', 'warden']
const AFFINITY_LABELS: Partial<Record<Affinity, string>> = {
  [Affinity.WEAK]: 'Débil',
  [Affinity.RESIST]: 'Resiste',
  [Affinity.IMMUNE]: 'Inmune',
  [Affinity.ABSORB]: 'Absorbe'
}

type Move = 'attack' | 'cast' | 'hit'

interface Boss {
  species: EnemySpecies
  role: BossRole
  /** What else it is: the hero it holds, the camp it opens, the weapon it guards. */
  detail: { captive?: CharacterId; camp?: string; weapon?: string }
  /** Its level in the first cycle: the deepest of its biome. */
  level: number
  artId: string
}

/** How far a boss's art has come. */
interface ArtStatus {
  image: { width: number; height: number } | null
  rig: Rig | null
  /** Images its rig needs that are not cut yet. */
  rigMissing: string[]
  /** Parts already cut from its parts sheet (bosses/<id>-parts). */
  sheetParts: number
  shadow: boolean
  /** What battle draws today. */
  drawn: 'rig' | 'image' | 'provisional'
}

/** Every boss with what it is in the world, from the first biome to the last. */
function bossCatalog(): Boss[] {
  const roles = new Map<string, { role: BossRole; detail: Boss['detail'] }>()
  const set = (id: string, role: BossRole, detail: Boss['detail'] = {}) =>
    !roles.has(id) && roles.set(id, { role, detail })

  set(FINAL_BOSS_SPECIES, 'final')
  set(ABYSS_GATE_GUARDIAN, 'gate')
  BIOMES.forEach((biome) => {
    if (biome.captor) {
      set(biome.captor.bossId, 'captor', { captive: biome.captor.captive })
    }

    if (biome.sealId) {
      set(biome.sealId, 'seal')
    }
  })
  Object.entries(BOSS_SPECIES).forEach(([camp, id]) => camp.includes('-miniboss-') && set(id, 'miniboss', { camp }))
  Object.values(GUARDIAN_SPECIES).forEach((ids) => ids.forEach((id) => set(id, 'guardian')))
  WEAPONS.forEach((weapon) => weapon.warden && set(weapon.warden, 'warden', { weapon: weapon.id }))

  const biomeOrder = BIOMES.map((biome) => biome.biome)

  return ENEMIES.filter((species) => species.rarity === 'boss')
    .map((species) => {
      const { role, detail } = roles.get(species.id) ?? { role: 'miniboss' as const, detail: {} }

      return {
        species,
        role,
        detail,
        level: getBiomeDefinition(species.biome).levelMax,
        artId: figureArtId('enemy', species.id, true)
      }
    })
    .sort(
      (a, b) =>
        biomeOrder.indexOf(a.species.biome) - biomeOrder.indexOf(b.species.biome) ||
        ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role)
    )
}

function artStatus(boss: Boss, manifest: ArtManifest): ArtStatus {
  const image = manifest.images[boss.artId] ?? null
  const rig = RIGS[boss.artId] ?? null
  const rigMissing = rig ? Object.values(rig.images).filter((id): id is string => !!id && !manifest.parts[id]) : []

  return {
    image,
    rig,
    rigMissing,
    sheetParts: manifest.parts[`${boss.artId}-parts`]?.length ?? 0,
    shadow: !!SHADOWS[boss.artId],
    drawn: rig && rigMissing.length === 0 ? 'rig' : image ? 'image' : 'provisional'
  }
}

const DRAWN_LABELS: Record<ArtStatus['drawn'], string> = {
  rig: 'Títere animado',
  image: 'Imagen fija',
  provisional: 'Provisorio (formas)'
}

type Filter = 'all' | 'missing' | BossRole

/**
 * Development page: every boss as battle draws it (its puppet, its image or
 * the provisional shapes) next to Kael for scale, moving on demand, with its
 * data and what art it still lacks.
 */
export default function BossesPreview() {
  const t = useT()
  const bosses = useMemo(bossCatalog, [])
  const [manifest, setManifest] = useState<ArtManifest | null>(null)
  const [selectedId, setSelectedId] = useState(bosses[0].species.id)
  const [filter, setFilter] = useState<Filter>('all')
  const [speedIndex, setSpeedIndex] = useState(0)
  const [looping, setLooping] = useState(false)
  const [withHero, setWithHero] = useState(true)
  const [command, setCommand] = useState<{ move: Move; count: number }>({ move: 'attack', count: 0 })
  const speed = useRef(1)
  const loop = useRef(false)

  useEffect(() => {
    let cancelled = false

    void loadArtManifest().then((loaded) => !cancelled && setManifest(loaded))

    // The boss in the address (#morgrath) stays selected across reloads.
    const fromHash = decodeURIComponent(window.location.hash.slice(1))

    if (bosses.some((boss) => boss.species.id === fromHash)) {
      setSelectedId(fromHash)
    }

    return () => {
      cancelled = true
    }
  }, [bosses])

  const statuses = useMemo(
    () => (manifest ? new Map(bosses.map((boss) => [boss.species.id, artStatus(boss, manifest)])) : null),
    [bosses, manifest]
  )
  const selected = bosses.find((boss) => boss.species.id === selectedId) ?? bosses[0]
  const visible = bosses.filter((boss) =>
    filter === 'all' ? true : filter === 'missing' ? !statuses?.get(boss.species.id)?.image : boss.role === filter
  )
  const withImage = statuses ? [...statuses.values()].filter((status) => status.image).length : 0
  const withRig = statuses ? [...statuses.values()].filter((status) => status.drawn === 'rig').length : 0

  const select = (id: string) => {
    setSelectedId(id)
    window.history.replaceState(null, '', `#${id}`)
  }

  const changeSpeed = () => {
    const next = (speedIndex + 1) % SPEEDS.length

    speed.current = SPEEDS[next]
    setSpeedIndex(next)
  }

  const toggleLoop = () => {
    loop.current = !loop.current
    setLooping(loop.current)
  }

  const play = (move: Move) => setCommand((current) => ({ move, count: current.count + 1 }))
  const filters: { id: Filter; label: string; count: number }[] = [
    { id: 'all', label: 'Todos', count: bosses.length },
    { id: 'missing', label: 'Sin imagen', count: bosses.length - withImage },
    ...ROLE_ORDER.map((role) => ({
      id: role,
      label: ROLE_LABELS[role],
      count: bosses.filter((boss) => boss.role === role).length
    })).filter((option) => option.count > 0)
  ]

  return (
    <div className="bosses-preview">
      <header className="toolbar">
        <h1>Jefes</h1>
        <p className="summary">
          {bosses.length} jefes · {statuses ? `${withImage} con imagen · ${withRig} con títere` : 'cargando arte…'}
        </p>
        <p className="hint">
          Se dibujan como en batalla (battleRenderer): títere si hay rig, si no la imagen bosses/&lt;id&gt;.webp, si no
          las formas provisorias. Tocá la figura para que ataque.
        </p>
      </header>
      <aside className="viewer">
        <div className="viewer-title">
          <strong>{t(`enemies.${selected.species.id}` as MessageKey)}</strong>
          {statuses && (
            <span className={`drawn drawn-${statuses.get(selected.species.id)!.drawn}`}>
              {DRAWN_LABELS[statuses.get(selected.species.id)!.drawn]}
            </span>
          )}
        </div>
        {manifest && (
          <BossStage
            boss={selected}
            manifest={manifest}
            withHero={withHero}
            command={command}
            controls={{ speed, loop }}
            onTap={() => play('attack')}
          />
        )}
        <div className="actions">
          <button onClick={() => play('attack')}>Atacar</button>
          <button onClick={() => play('cast')}>Lanzar</button>
          <button onClick={() => play('hit')}>Recibir golpe</button>
          <button className={looping ? 'active' : undefined} onClick={toggleLoop}>
            Repetir {looping ? 'sí' : 'no'}
          </button>
          <button onClick={changeSpeed}>×{SPEEDS[speedIndex]}</button>
          <button className={withHero ? 'active' : undefined} onClick={() => setWithHero((value) => !value)}>
            Kael {withHero ? 'sí' : 'no'}
          </button>
        </div>
      </aside>
      <section className="list">
        <div className="filters">
          {filters.map((option) => (
            <button
              key={option.id}
              className={filter === option.id ? 'active' : undefined}
              onClick={() => setFilter(option.id)}
            >
              {option.label} <span className="count">{option.count}</span>
            </button>
          ))}
        </div>
        {visible.map((boss) => (
          <BossCard
            key={boss.species.id}
            boss={boss}
            status={statuses?.get(boss.species.id) ?? null}
            selected={boss.species.id === selected.species.id}
            onSelect={() => select(boss.species.id)}
          />
        ))}
        {visible.length === 0 && <p className="empty">Ningún jefe con este filtro.</p>}
      </section>
    </div>
  )
}

interface BossCardProps {
  boss: Boss
  status: ArtStatus | null
  selected: boolean
  onSelect: () => void
}

/** A boss in the list: its picture, what it is and its art; opened, all its battle data. */
function BossCard({ boss, status, selected, onSelect }: BossCardProps) {
  const t = useT()
  const { species, role, detail, level, artId } = boss
  const stats = getEnemyStats(species.id, level)
  const rewards = getEnemyRewards(species.id, level)
  const affinities = Object.entries(species.affinities) as [string, Affinity][]
  const skill = (id: string) => t(`skills.${id}` as MessageKey)
  const context = [
    t(`world.biomes.${species.biome}` as MessageKey),
    detail.captive && `retiene a ${t(`characters.${detail.captive}.name` as MessageKey)}`,
    detail.camp,
    detail.weapon && `relicario de ${t(`weapons.${detail.weapon}.name` as MessageKey)}`
  ].filter(Boolean)

  return (
    <article className={`boss-card${selected ? ' selected' : ''}`}>
      <button className="boss-summary" onClick={onSelect} aria-expanded={selected}>
        <span className="thumb" style={{ borderColor: `#${species.color.toString(16).padStart(6, '0')}` }}>
          {status?.image ? (
            // eslint-disable-next-line @next/next/no-img-element -- the art is already a sized webp
            <img src={artUrl(artId)} alt="" loading="lazy" />
          ) : (
            <span className="swatch" style={{ background: `#${species.color.toString(16).padStart(6, '0')}` }} />
          )}
        </span>
        <span className="identity">
          <span className="name">{t(`enemies.${species.id}` as MessageKey)}</span>
          <span className="context">
            <span className={`tag role-${role}`}>{ROLE_LABELS[role]}</span> {context.join(' · ')}
          </span>
          {status && (
            <span className="badges">
              <span className={status.image ? 'ok' : 'missing'}>{status.image ? 'imagen' : 'falta imagen'}</span>
              <span className={status.drawn === 'rig' ? 'ok' : status.sheetParts > 0 ? 'partial' : 'none'}>
                {status.drawn === 'rig'
                  ? 'títere'
                  : status.sheetParts > 0
                    ? `${status.sheetParts} partes, sin rig`
                    : 'sin títere'}
              </span>
              {status.image && !status.shadow && <span className="partial">sombra sin ajustar</span>}
            </span>
          )}
        </span>
      </button>
      {selected && (
        <div className="boss-details">
          <dl className="stats">
            <div>
              <dt>Nivel</dt>
              <dd>{level}</dd>
            </div>
            <div>
              <dt>Vida</dt>
              <dd>
                {stats.maxHealth.toLocaleString('es')}
                {species.bars > 1 && ` × ${species.bars}`}
              </dd>
            </div>
            <div>
              <dt>Ataque</dt>
              <dd>{stats.attack}</dd>
            </div>
            <div>
              <dt>Especial</dt>
              <dd>{stats.special}</dd>
            </div>
            <div>
              <dt>Defensa</dt>
              <dd>{stats.defense}</dd>
            </div>
            <div>
              <dt>Velocidad</dt>
              <dd>{stats.speed}</dd>
            </div>
            <div>
              <dt>Tipo</dt>
              <dd>{t(`archetypes.${species.archetype}` as MessageKey)}</dd>
            </div>
            <div>
              <dt>Fuerza · tamaño</dt>
              <dd>
                ×{species.strength} · {species.size}
              </dd>
            </div>
            <div>
              <dt>Premio</dt>
              <dd>
                {rewards.xp} xp · {rewards.gold} oro
              </dd>
            </div>
          </dl>
          <div className="row">
            <span className="label">Habilidades</span>
            <span className="chips">
              {species.skills.map((id, index) => (
                <span key={id} className="chip" title={id}>
                  {skill(id)}
                  {index === 0 && <small> (básico)</small>}
                </span>
              ))}
            </span>
          </div>
          {species.phaseSkills?.map((phase, index) => (
            <div key={index} className="row">
              <span className="label">Barra {index + 2}</span>
              <span className="chips">
                {phase.map((id) => (
                  <span key={id} className="chip phase" title={id}>
                    + {skill(id)}
                  </span>
                ))}
              </span>
            </div>
          ))}
          <div className="row">
            <span className="label">Afinidades</span>
            <span className="chips">
              {affinities.length === 0 && <span className="chip">ninguna</span>}
              {affinities.map(([type, affinity]) => (
                <span key={type} className={`chip affinity-${affinity}`}>
                  {AFFINITY_LABELS[affinity] ?? affinity} {t(`damageTypes.${type}` as MessageKey)}
                </span>
              ))}
            </span>
          </div>
          {status && (
            <div className="art">
              <code>
                {artId}.webp {status.image ? `${status.image.width}×${status.image.height}` : '— falta'}
              </code>
              <code>
                rig:{' '}
                {status.rig
                  ? status.rigMissing.length
                    ? `faltan ${status.rigMissing.join(', ')}`
                    : 'listo'
                  : 'no hay (data/rigs.ts)'}
              </code>
              {status.sheetParts > 0 && (
                <code>
                  {artId}-parts: {status.sheetParts} partes cortadas
                </code>
              )}
              <code>sombra: {status.shadow ? 'ajustada (data/shadows.ts)' : 'la de por defecto'}</code>
              <code>id: {species.id}</code>
            </div>
          )}
        </div>
      )}
    </article>
  )
}

interface Controls {
  speed: MutableRefObject<number>
  loop: MutableRefObject<boolean>
}

interface Fighter {
  root: Container
  body: Container
  rig: RigFigure | null
  size: number
}

interface Scene {
  boss: Fighter
  hero: Fighter | null
  root: Container
  busy: boolean
}

interface BossStageProps {
  boss: Boss
  manifest: ArtManifest
  withHero: boolean
  command: { move: Move; count: number }
  controls: Controls
  onTap: () => void
}

/** The boss drawn and moved as in battle, facing Kael. */
function BossStage({ boss, manifest, withHero, command, controls, onTap }: BossStageProps) {
  const host = useRef<HTMLDivElement>(null)
  const app = useRef<Application | null>(null)
  const scene = useRef<Scene | null>(null)
  const layout = useRef<() => void>(() => {})
  const runMove = useRef<(move: Move) => Promise<void>>(async () => {})
  const [ready, setReady] = useState(false)

  // One canvas for the page: the scene in it changes with the boss.
  useEffect(() => {
    const element = host.current!
    const created = new Application()
    let cancelled = false
    let observer: ResizeObserver | null = null
    let clock = 0

    void created
      .init({
        resizeTo: element,
        backgroundAlpha: 0,
        antialias: true,
        resolution: window.devicePixelRatio,
        autoDensity: true
      })
      .then(() => {
        if (cancelled) {
          created.destroy(true)

          return
        }

        element.appendChild(created.canvas)
        app.current = created
        observer = new ResizeObserver(() => {
          created.resize()
          layout.current()
        })
        observer.observe(element)

        let elapsed = 0

        created.ticker.add((ticker) => {
          const delta = ticker.deltaMS * controls.speed.current
          const current = scene.current

          elapsed += delta / 1000

          if (!current) {
            return
          }

          for (const fighter of [current.boss, current.hero]) {
            if (!fighter) {
              continue
            }

            if (fighter.rig) {
              fighter.rig.update(delta)
            } else if (!current.busy) {
              // Everybody breathes (as in battle).
              fighter.body.scale.y = fighter.size * (1 + Math.sin(elapsed * 2.4 + fighter.size) * 0.015)
            }
          }

          if (controls.loop.current && !current.busy) {
            clock -= delta

            if (clock <= 0) {
              clock = LOOP_PAUSE
              void runMove.current('attack')
            }
          }
        })
        setReady(true)
      })

    return () => {
      cancelled = true
      observer?.disconnect()
      scene.current = null

      if (app.current) {
        app.current.destroy(true, { children: true })
        app.current = null
      }
    }
    // The controls are refs: they are read every frame.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // The scene of the selected boss.
  useEffect(() => {
    const pixi = app.current

    if (!ready || !pixi) {
      return
    }

    let cancelled = false
    const heroArtId = figureArtId('hero', HERO, false)
    const heroRig = RIGS[heroArtId] ?? null
    const bossRig = RIGS[boss.artId] ?? null
    const tween = (duration: number, update: (t: number) => void) =>
      new Promise<void>((resolve) => {
        let time = 0

        const step = (ticker: { deltaMS: number }) => {
          time += ticker.deltaMS * controls.speed.current

          const t = Math.min(1, time / Math.max(1, duration))

          // Another boss took the stage: this one's figures are gone.
          if (!cancelled) {
            update(t)
          }

          if (t >= 1 || cancelled) {
            pixi.ticker.remove(step)
            resolve()
          }
        }

        pixi.ticker.add(step)
      })
    const wait = (ms: number) => tween(ms, () => {})
    const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2)

    const start = async () => {
      const ids = [
        boss.artId,
        heroArtId,
        ...(bossRig ? rigPartIds(bossRig, manifest.parts) : []),
        ...(heroRig ? rigPartIds(heroRig, manifest.parts) : [])
      ]
      const textures = await loadTextures(ids)

      if (cancelled) {
        return
      }

      const build = (side: Combatant['side'], artId: string, rig: Rig | null, size: number): Fighter => {
        const puppet = rig ? RigFigure.create(rig, manifest.parts, textures, artHeight(side)) : null
        const texture = textures.get(artId)
        const body = puppet
          ? drawRig(puppet, artId)
          : texture
            ? drawArt(texture, side, artId)
            : side === 'hero'
              ? drawHero(HERO)
              : drawEnemy({ speciesId: boss.species.id, elite: false } as Combatant)
        const root = new Container()

        body.scale.set(size)
        root.addChild(body)

        return { root, body, rig: puppet, size }
      }

      const root = new Container()
      const ground = new Graphics()
      const bossFighter = build('enemy', boss.artId, bossRig, boss.species.size)
      const heroFighter = withHero ? build('hero', heroArtId, heroRig, 1) : null

      root.addChild(ground)

      if (heroFighter) {
        root.addChild(heroFighter.root)
      }

      root.addChild(bossFighter.root)

      if (scene.current) {
        scene.current.root.destroy({ children: true })
      }

      pixi.stage.addChild(root)
      scene.current = { boss: bossFighter, hero: heroFighter, root, busy: false }

      layout.current = () => {
        const { width, height } = pixi.screen
        const feet = height * 0.9
        // The tallest figure fills most of the height, and the boss fits in its half of the width.
        const tallest = FIGURE_HEIGHT * Math.max(boss.species.size, heroFighter ? 1.15 : 0) + 40
        const share = heroFighter ? 0.46 : 0.8
        const scale = Math.min((height * 0.84) / tallest, (width * share) / (FIGURE_HEIGHT * boss.species.size * 1.15))

        bossFighter.root.position.set(width * (heroFighter ? 0.7 : 0.5), feet)
        bossFighter.root.scale.set(scale)

        if (heroFighter) {
          heroFighter.root.position.set(width * 0.22, feet)
          heroFighter.root.scale.set(scale)
        }

        ground.clear().moveTo(0, feet).lineTo(width, feet).stroke({ color: 0xffffff, alpha: 0.1, width: 1 })
      }

      runMove.current = async (move: Move) => {
        const current = scene.current

        if (!current || current.busy) {
          return
        }

        const { boss: actor, hero } = current
        const home = { x: actor.root.position.x, y: actor.root.position.y }

        current.busy = true
        actor.body.scale.set(actor.size)

        if (move === 'attack') {
          // Closes in on the hero (or forward when alone) and strikes on arrival.
          const dx = hero ? (hero.root.position.x - home.x) * 0.55 : -pixi.screen.width * 0.12

          actor.rig?.play('attack', ATTACK.rig)
          await tween(actor.rig ? ATTACK.approach.rig : ATTACK.approach.art, (t) => {
            actor.root.position.x = home.x + dx * ease(t)
          })

          if (actor.rig) {
            await wait(ATTACK.strike)
          }

          if (hero) {
            hero.rig?.play('hit', HIT * 2)
            void tween(HIT, (t) => {
              hero.body.alpha = t < 0.35 ? 0.55 : 1
              hero.body.position.x = -Math.sin(t * Math.PI * 4) * 6 * (1 - t)
            })
          }

          await tween(ATTACK.back, (t) => {
            actor.root.position.x = home.x + dx * (1 - ease(t))
          })
        } else if (move === 'cast') {
          if (actor.rig) {
            actor.rig.play('cast', CAST.rig)
            await wait(CAST.rig)
          } else {
            await tween(CAST.art, (t) => actor.body.scale.set(actor.size * (1 + Math.sin(t * Math.PI) * 0.12)))
          }
        } else {
          actor.rig?.play('hit', HIT * 2)
          await tween(HIT, (t) => {
            actor.body.alpha = t < 0.35 ? 0.55 : 1
            actor.body.position.x = Math.sin(t * Math.PI * 4) * 6 * (1 - t)
          })
        }

        if (!cancelled) {
          actor.root.position.set(home.x, home.y)
          current.busy = false
        }
      }

      layout.current()
    }

    void start()

    return () => {
      cancelled = true
    }
    // The controls are refs: they are read every frame.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, boss, manifest, withHero])

  useEffect(() => {
    if (command.count > 0) {
      void runMove.current(command.move)
    }
  }, [command])

  return <div className="stage" ref={host} onPointerDown={onTap} />
}
