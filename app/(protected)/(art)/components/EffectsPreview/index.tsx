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
import { getSkill } from '@/app/(protected)/(engine)/data/skills'
import { BattleState } from '@/app/(protected)/(engine)/models/BattleState'
import { DamageType } from '@/app/(protected)/(engine)/models/DamageType'
import { useT } from '@/app/i18n/I18nProvider'
import { MessageKey } from '@/app/i18n/messages'

const SPEEDS = [1, 0.5, 0.25]

/**
 * The attack effects one by one, on a real battle stage: pick who acts and
 * press a skill to see it (its look comes from attackEffects.ts). It also
 * shows Ysolde's charges going round her and the critical version of a blow.
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
