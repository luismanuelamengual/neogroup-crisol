'use client'

import './index.scss'
import { useEffect, useRef, useState } from 'react'
import type { BattleRenderer } from '@/app/(protected)/(battle)/utils/battleRenderer'
import {
  createPreviewBattle,
  enemySkillIds,
  heroSkillIds,
  PREVIEW_LINEUPS,
  previewEvents
} from '@/app/(protected)/(battle)/utils/effectsPreview'
import { STATUS_COLORS } from '@/app/(protected)/(battle)/utils/statusVisuals'
import { getSkill } from '@/app/(protected)/(engine)/data/skills'
import { BattleState } from '@/app/(protected)/(engine)/models/BattleState'
import { DamageType } from '@/app/(protected)/(engine)/models/DamageType'
import { StatusType } from '@/app/(protected)/(engine)/models/StatusType'
import { useT } from '@/app/i18n/I18nProvider'
import { MessageKey } from '@/app/i18n/messages'

const SPEEDS = [1, 0.5, 0.25]
const STATUSES = Object.keys(STATUS_COLORS) as StatusType[]

/**
 * The attack effects one by one, on a real battle stage: pick who acts and
 * press a skill to see it (its look comes from attackEffects.ts). It also
 * shows Ysolde's charges going round her, the critical version of a blow and
 * every status on the fighter picked (see statusVisuals.ts).
 */

export default function EffectsPreview() {
  const t = useT()
  const stage = useRef<HTMLDivElement>(null)
  const renderer = useRef<BattleRenderer | null>(null)
  const battle = useRef<BattleState | null>(null)
  const busy = useRef(false)
  const [lineup, setLineup] = useState(0)
  const [actorId, setActorId] = useState<string | null>(null)
  const [state, setState] = useState<BattleState | null>(null)
  const [critical, setCritical] = useState(false)
  const [speed, setSpeed] = useState(1)
  const speedRef = useRef(speed)

  speedRef.current = speed

  useEffect(() => {
    let cancelled = false
    const created = createPreviewBattle(PREVIEW_LINEUPS[lineup])

    battle.current = created
    setState(created)
    setActorId((current) =>
      created.combatants.some((combatant) => combatant.id === current) ? current : created.combatants[0].id
    )

    void (async () => {
      const { BattleRenderer } = await import('@/app/(protected)/(battle)/utils/battleRenderer')
      const instance = await BattleRenderer.create(
        stage.current!,
        created,
        {
          skill: (id) => t(`skills.${id}` as MessageKey),
          item: (id) => id,
          status: (status) => t(`statuses.${status}`),
          stance: (stance) => t(`battle.traits.${stance}`),
          weak: t('battle.weak'),
          resist: t('battle.resist'),
          immune: t('battle.immune'),
          miss: t('battle.miss'),
          transform: t('battle.transform'),
          perk: () => ''
        },
        (id) => setActorId(id),
        null,
        `effects-${lineup}`
      )

      if (cancelled) {
        instance.destroy()

        return
      }

      renderer.current = instance
      instance.speed = speedRef.current
      instance.sync(created, null)
    })()

    return () => {
      cancelled = true
      renderer.current?.destroy()
      renderer.current = null
    }
  }, [lineup, t])

  useEffect(() => {
    if (renderer.current) {
      renderer.current.speed = speed
    }
  }, [speed, state])

  useEffect(() => {
    if (renderer.current && battle.current) {
      renderer.current.sync(battle.current, actorId)
    }
  }, [actorId, state])

  const actor = state?.combatants.find((combatant) => combatant.id === actorId) ?? null
  const fighters = state?.combatants.filter((combatant) => !combatant.reserve) ?? []
  const skills = !actor ? [] : actor.side === 'hero' ? heroSkillIds(actor.characterId!) : enemySkillIds()

  const play = async (skillId: string) => {
    if (!renderer.current || !battle.current || !actor || busy.current) {
      return
    }

    busy.current = true
    await renderer.current.play(previewEvents(battle.current, actor.id, skillId, critical), battle.current)
    renderer.current?.sync(battle.current, actor.id)
    busy.current = false
  }

  const toggleCharges = () => {
    const ysolde = battle.current?.combatants.find((combatant) => combatant.characterId === 'ysolde')

    if (!ysolde || !renderer.current || !battle.current) {
      return
    }

    ysolde.charges = ysolde.charges?.length ? [] : [DamageType.FIRE, DamageType.ICE, DamageType.LIGHTNING]
    renderer.current.sync(battle.current, actorId)
  }

  /** Puts a status on the fighter picked (as the battle would, with its label) or takes it off. */
  const toggleStatus = async (status: StatusType) => {
    if (!renderer.current || !battle.current || !actor || busy.current) {
      return
    }

    const combatant = battle.current.combatants.find((other) => other.id === actor.id)!
    const had = combatant.statuses.some((other) => other.type === status)

    busy.current = true
    combatant.statuses = had
      ? combatant.statuses.filter((other) => other.type !== status)
      : [...combatant.statuses, { type: status, turns: 3 }]

    if (!had) {
      await renderer.current.play([{ type: 'status', targetId: actor.id, status, turns: 3 }], battle.current)
    }

    renderer.current?.sync(battle.current, actor.id)
    setState({ ...battle.current })
    busy.current = false
  }

  /** Every status on every fighter on the field, or none. */
  const setAllStatuses = (on: boolean) => {
    if (!renderer.current || !battle.current || busy.current) {
      return
    }

    battle.current.combatants
      .filter((combatant) => !combatant.reserve)
      .forEach((combatant, index) => {
        // Two or three each, so they can be told apart.
        combatant.statuses = on
          ? STATUSES.filter((_, at) => at % 6 === index % 6).map((type) => ({ type, turns: 3 }))
          : []
      })
    renderer.current.sync(battle.current, actorId)
    setState({ ...battle.current })
  }

  /** The fighter picked loses its turn (frozen or stunned, it shudders). */
  const skipTurn = async () => {
    if (!renderer.current || !battle.current || !actor || busy.current) {
      return
    }

    const status = actor.statuses.find((other) => other.type === StatusType.FREEZE)?.type ?? StatusType.STUN

    busy.current = true
    await renderer.current.play([{ type: 'skip', actorId: actor.id, status }], battle.current)
    busy.current = false
  }

  const nameOf = (id: string) => {
    const combatant = state?.combatants.find((other) => other.id === id)

    return combatant?.side === 'hero'
      ? t(`characters.${combatant.characterId}.name` as MessageKey)
      : t(`enemies.${combatant!.speciesId}` as MessageKey)
  }

  return (
    <div className="effects-preview">
      <div className="stage" ref={stage} />
      <div className="controls">
        <div className="row">
          {PREVIEW_LINEUPS.map((ids, index) => (
            <button key={index} className={index === lineup ? 'active' : undefined} onClick={() => setLineup(index)}>
              Grupo {index + 1}
            </button>
          ))}
          <button className={critical ? 'active' : undefined} onClick={() => setCritical(!critical)}>
            Crítico
          </button>
          <button onClick={toggleCharges}>Cargas de Ysolde</button>
          {SPEEDS.map((value) => (
            <button key={value} className={value === speed ? 'active' : undefined} onClick={() => setSpeed(value)}>
              ×{value}
            </button>
          ))}
        </div>
        <div className="row">
          {fighters.map((combatant) => (
            <button
              key={combatant.id}
              className={combatant.id === actorId ? 'active' : undefined}
              onClick={() => setActorId(combatant.id)}
            >
              {nameOf(combatant.id)}
            </button>
          ))}
        </div>
        <div className="row statuses">
          {STATUSES.map((status) => (
            <button
              key={status}
              className={actor?.statuses.some((other) => other.type === status) ? 'active' : undefined}
              style={{ borderLeftColor: `#${STATUS_COLORS[status].main.toString(16).padStart(6, '0')}` }}
              onClick={() => void toggleStatus(status)}
            >
              {t(`statuses.${status}`)}
            </button>
          ))}
          <button onClick={() => setAllStatuses(true)}>Estados a todos</button>
          <button onClick={() => setAllStatuses(false)}>Sin estados</button>
          <button onClick={() => void skipTurn()}>Pierde el turno</button>
        </div>
        <ul className="skills">
          {actor &&
            skills.map((id) => (
              <li key={id}>
                <button onClick={() => void play(id)}>
                  <span>{t(`skills.${id}` as MessageKey)}</span>
                  <code>
                    {id} · {getSkill(id).damageType}
                  </code>
                </button>
              </li>
            ))}
        </ul>
      </div>
    </div>
  )
}
