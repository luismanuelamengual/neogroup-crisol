'use client'

import './index.scss'
import { Application, Container, Graphics, Text } from 'pixi.js'
import { MutableRefObject, PointerEvent, useEffect, useRef, useState } from 'react'
import { heroRig, Rig, weaponFit } from '@/app/(protected)/(art)/data/rigs'
import { SHADOW_ALPHA, shadowOf } from '@/app/(protected)/(art)/data/shadows'
import { ArtManifest } from '@/app/(protected)/(art)/models/ArtManifest'
import { artUrl, loadArtManifest, loadTextures } from '@/app/(protected)/(art)/utils/art'
import { RigFigure, RigMove, rigPartIds } from '@/app/(protected)/(art)/utils/rig'
import { getCharacterWeapons, isRangedCharacter, Weapon } from '@/app/(protected)/(engine)/data/weapons'
import { CharacterId } from '@/app/(protected)/(engine)/models/CharacterId'
import { useT } from '@/app/i18n/I18nProvider'
import { MessageKey } from '@/app/i18n/messages'

const SPEEDS = [1, 0.5, 0.25]
/** The puppets are made this tall and then scaled to fit their column. */
const BASE_HEIGHT = 200
/** Hero height in battle (see battleRenderer), to scale the battle shadow. */
const BATTLE_HEIGHT = 138
/** As in battle: melee heroes swing, heroes that shoot draw their bow. */
const MOVES: Record<'melee' | 'ranged', { move: RigMove; duration: number }> = {
  melee: { move: 'attack', duration: 560 },
  ranged: { move: 'shoot', duration: 460 }
}
/** Pause between attacks while they repeat. */
const LOOP_PAUSE = 700

interface Controls {
  speed: MutableRefObject<number>
  loop: MutableRefObject<boolean>
}

/** The images of a puppet that are not in the manifest yet. */
function missingImages(rig: Rig, parts: ArtManifest['parts']): string[] {
  return Object.values(rig.images).filter((id): id is string => Boolean(id) && !parts[id!])
}

function formatFit(art: string): string {
  const fit = weaponFit(art)

  if (!fit) {
    return 'sin ajuste propio (grip 0.2 · length 0.7)'
  }

  const values = [`grip ${fit.grip}`, `length ${fit.length}`]

  if (fit.gripY !== undefined) {
    values.push(`gripY ${fit.gripY}`)
  }

  if (fit.rest !== undefined) {
    values.push(`rest ${((fit.rest * 180) / Math.PI).toFixed(1)}°`)
  }

  if (fit.nocks) {
    values.push('cuerda por código')
  }

  return values.join(' · ')
}

/**
 * Development page: each hero holding each of their three weapons with the
 * real battle puppet (data/rigs), breathing, and attacking on demand, to see
 * whether the weapons meet the hand and are the right size.
 */
export default function HeroWeaponsPreview() {
  const [manifest, setManifest] = useState<ArtManifest | null>(null)
  const [speedIndex, setSpeedIndex] = useState(0)
  const [looping, setLooping] = useState(false)
  const [attackAll, setAttackAll] = useState(0)
  const speed = useRef(1)
  const loop = useRef(false)

  useEffect(() => {
    let cancelled = false

    void loadArtManifest().then((loaded) => !cancelled && setManifest(loaded))

    return () => {
      cancelled = true
    }
  }, [])

  const changeSpeed = () => {
    const next = (speedIndex + 1) % SPEEDS.length

    speed.current = SPEEDS[next]
    setSpeedIndex(next)
  }

  const toggleLoop = () => {
    loop.current = !loop.current
    setLooping(loop.current)
  }

  return (
    <div className="hero-weapons-preview">
      <header className="toolbar">
        <h1>Héroes y armas</h1>
        <div className="actions">
          <button onClick={() => setAttackAll((count) => count + 1)}>Atacar todos</button>
          <button className={looping ? 'active' : undefined} onClick={toggleLoop}>
            Repetir {looping ? 'sí' : 'no'}
          </button>
          <button onClick={changeSpeed}>Velocidad ×{SPEEDS[speedIndex]}</button>
        </div>
        <p className="hint">
          Tocá una figura para que ataque. Los ajustes están en data/rigs.ts (WEAPONS, ARMS, HANDS).
        </p>
      </header>
      {manifest &&
        Object.values(CharacterId).map((id) => (
          <HeroRow key={id} id={id} manifest={manifest} controls={{ speed, loop }} attackAll={attackAll} />
        ))}
    </div>
  )
}

interface HeroRowProps {
  id: CharacterId
  manifest: ArtManifest
  controls: Controls
  attackAll: number
}

/** A hero: the three puppets side by side on one stage, with what each weapon is and how it is fitted below. */
function HeroRow({ id, manifest, controls, attackAll }: HeroRowProps) {
  const t = useT()
  const host = useRef<HTMLDivElement>(null)
  const puppets = useRef<(RigFigure | null)[]>([])
  const ranged = isRangedCharacter(id)
  const { move, duration } = MOVES[ranged ? 'ranged' : 'melee']
  const weapons = getCharacterWeapons(id)
  const rigs = weapons.map((weapon) => heroRig(id, { weapon: weapon.art }))
  const missing = rigs.map((rig) => missingImages(rig, manifest.parts))
  const drawable = missing.some((images) => images.length === 0)
  const fullId = `heroes/${id}/full`
  const missingBody = [...new Set(missing.flat().filter((image) => !image.includes('/weapons/')))]
  const play = (index: number) => puppets.current[index]?.play(move, duration)

  useEffect(() => {
    if (attackAll > 0) {
      puppets.current.forEach((puppet) => puppet?.play(move, duration))
    }
  }, [attackAll, move, duration])

  useEffect(() => {
    if (!drawable) {
      return
    }

    const element = host.current!
    const app = new Application()
    const columns = weapons.map(() => new Container())
    const ground = new Graphics()
    let cancelled = false
    let observer: ResizeObserver | null = null

    const layout = () => {
      const { width, height } = app.screen
      const column = width / columns.length
      // The body is this tall: what it holds reaches higher and further forward.
      const body = Math.min(height * 0.58, column * 0.62)
      const feet = height * 0.88

      columns.forEach((slot, index) => {
        slot.position.set(column * (index + 0.5) - body * 0.12, feet)
        slot.scale.set(body / BASE_HEIGHT)
      })
      ground.clear()

      for (let index = 1; index < columns.length; index++) {
        ground.moveTo(column * index, 12).lineTo(column * index, height - 12)
      }

      ground.stroke({ color: 0xffffff, alpha: 0.12, width: 1 })
      ground.moveTo(0, feet).lineTo(width, feet).stroke({ color: 0xffffff, alpha: 0.08, width: 1 })
    }

    const start = async () => {
      const textures = await loadTextures(rigs.flatMap((rig) => rigPartIds(rig, manifest.parts)))

      await app.init({
        resizeTo: element,
        backgroundAlpha: 0,
        antialias: true,
        resolution: window.devicePixelRatio,
        autoDensity: true
      })

      if (cancelled) {
        app.destroy(true)

        return
      }

      element.appendChild(app.canvas)
      app.stage.addChild(ground)

      const { x, y, radiusX, radiusY } = shadowOf(fullId)
      const scale = BASE_HEIGHT / BATTLE_HEIGHT

      puppets.current = rigs.map((rig, index) => {
        const slot = columns[index]
        const puppet = missing[index].length === 0 ? RigFigure.create(rig, manifest.parts, textures, BASE_HEIGHT) : null

        if (puppet) {
          slot.addChild(
            new Graphics()
              .ellipse(x * scale, y * scale, radiusX * scale, radiusY * scale)
              .fill({ color: 0x000000, alpha: SHADOW_ALPHA })
          )
          slot.addChild(puppet.view)
        } else {
          const label = new Text({ text: 'Sin imagen', style: { fill: 0xffffff, fontSize: 22, fontWeight: '700' } })

          label.alpha = 0.5
          label.anchor.set(0.5, 1)
          label.position.set(BASE_HEIGHT * 0.12, -BASE_HEIGHT * 0.45)
          slot.addChild(label)
        }

        app.stage.addChild(slot)

        return puppet
      })

      layout()
      observer = new ResizeObserver(() => {
        app.resize()
        layout()
      })
      observer.observe(element)

      // While attacks repeat, each puppet attacks again a little after it finishes, one after the other.
      const clock = puppets.current.map((_, index) => index * 250)

      app.ticker.add((ticker) => {
        const delta = ticker.deltaMS * controls.speed.current

        puppets.current.forEach((puppet, index) => {
          if (!puppet) {
            return
          }

          if (controls.loop.current) {
            clock[index] -= delta

            if (clock[index] <= 0) {
              puppet.play(move, duration)
              clock[index] = duration + LOOP_PAUSE
            }
          }

          puppet.update(delta)
        })
      })
    }

    void start()

    return () => {
      cancelled = true
      observer?.disconnect()
      puppets.current = []

      if (app.renderer) {
        app.destroy(true, { children: true })
      }
    }
    // The rigs only change with the hero and the manifest.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, manifest, drawable])

  const tap = (event: PointerEvent<HTMLDivElement>) => {
    const box = event.currentTarget.getBoundingClientRect()

    play(Math.min(weapons.length - 1, Math.floor(((event.clientX - box.left) / box.width) * weapons.length)))
  }

  return (
    <section className="hero-row">
      <header className="hero-header">
        {manifest.images[fullId] && (
          // eslint-disable-next-line @next/next/no-img-element -- the art is already a sized webp
          <img className="full" src={artUrl(fullId)} alt="" />
        )}
        <div>
          <h2>{t(`characters.${id}.name` as MessageKey)}</h2>
          <p>
            {ranged
              ? 'A distancia: cuerpo + arma (sin brazo), ataque "shoot"'
              : 'Cuerpo a cuerpo: cuerpo + brazo + arma, ataque "attack"'}
          </p>
          {missingBody.length > 0 && <p className="missing">Faltan: {missingBody.join(', ')}</p>}
        </div>
      </header>
      {drawable && <div className="stage" ref={host} onPointerDown={tap} />}
      <div className="weapons">
        {weapons.map((weapon: Weapon, index) => (
          <div key={weapon.id} className="weapon">
            <div className="weapon-title">
              <strong>{t(`weapons.${weapon.id}.name` as MessageKey)}</strong>
              <span className="tag">{index === 0 ? 'inicial' : weapon.biome}</span>
            </div>
            <code>{weapon.art}</code>
            <code>{formatFit(weapon.art)}</code>
            {missing[index].length > 0 ? (
              <p className="missing">
                Falta: {missing[index].filter((image) => image.includes('/weapons/')).join(', ') || 'el cuerpo'}
              </p>
            ) : (
              <button onClick={() => play(index)}>Atacar</button>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
