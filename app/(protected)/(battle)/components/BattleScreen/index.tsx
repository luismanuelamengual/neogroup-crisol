'use client'

import './index.scss'
import FastForwardIcon from '@mui/icons-material/FastForward'
import ButtonBase from '@mui/material/ButtonBase'
import classNames from 'classnames'
import { useCallback, useEffect, useRef, useState } from 'react'
import { MusicId } from '@/app/(protected)/(art)/data/audio'
import { playMusic } from '@/app/(protected)/(art)/utils/sound'
import type { BattleRenderer } from '@/app/(protected)/(battle)/utils/battleRenderer'
import { combatantName } from '@/app/(protected)/(battle)/utils/names'
import { BattleAction } from '@/app/(protected)/(engine)/models/BattleAction'
import { BattleState } from '@/app/(protected)/(engine)/models/BattleState'
import { Biome } from '@/app/(protected)/(engine)/models/Biome'
import { Combatant } from '@/app/(protected)/(engine)/models/Combatant'
import { Encounter } from '@/app/(protected)/(engine)/models/Encounter'
import { EncounterKind } from '@/app/(protected)/(engine)/models/EncounterKind'
import { GameState } from '@/app/(protected)/(engine)/models/GameState'
import { Item } from '@/app/(protected)/(engine)/models/Item'
import { Skill } from '@/app/(protected)/(engine)/models/Skill'
import { StatusType } from '@/app/(protected)/(engine)/models/StatusType'
import { TargetType } from '@/app/(protected)/(engine)/models/TargetType'
import { WorldNode } from '@/app/(protected)/(engine)/models/WorldNode'
import {
  chooseEnemyAction,
  createBattle,
  getCombatant,
  getCombatantSkills,
  getFighters,
  getItemTargets,
  getTargets,
  getTurnQueue,
  getUsableItems,
  isAlive,
  nextTurn,
  performAction
} from '@/app/(protected)/(engine)/utils/battle'
import { getEncounterPhases, hashText } from '@/app/(protected)/(engine)/utils/encounters'
import { itemName } from '@/app/(protected)/(party)/utils/describe'
import GameButton from '@/app/components/GameButton'
import { useT } from '@/app/i18n/I18nProvider'
import type { MessageKey } from '@/app/i18n/messages'

interface BattleScreenProps {
  game: GameState
  node: WorldNode
  encounter: Encounter
  /** A finished battle (its `outcome` says how), once the player closes the result. */
  onFinish: (battle: BattleState) => void
}

type Mode = 'playing' | 'choosing' | 'items' | 'targeting' | 'ended'

const SPEED_KEY = 'crisol.battleSpeed'

/** The battle background of a point: its biome's (one of two, fixed per point), the castle or the forge of Crisol. */
function backgroundOf(node: WorldNode, encounter: Encounter): string {
  if (encounter.kind === EncounterKind.CRISOL) {
    return 'backgrounds/crisol'
  }

  if (node.biome === Biome.ABYSS && encounter.kind !== EncounterKind.COMBAT) {
    return 'backgrounds/castle'
  }

  return `backgrounds/${node.biome}-${(hashText(node.id) % 2) + 1}`
}

/** The theme of a battle: the common one, the bosses', the Seals' and Crisol's. */
const BATTLE_MUSIC: Record<EncounterKind, MusicId> = {
  [EncounterKind.COMBAT]: 'battle',
  [EncounterKind.ELITE]: 'battle',
  [EncounterKind.GUARDIAN]: 'boss',
  [EncounterKind.MINIBOSS]: 'boss',
  [EncounterKind.WARDEN]: 'boss',
  [EncounterKind.CAPTOR]: 'boss',
  [EncounterKind.SEAL]: 'seal',
  [EncounterKind.CRISOL]: 'crisol'
}
/** Pause before an enemy acts, so the player can follow it. */
const ENEMY_PAUSE_MS = 350

function readSpeed(): number {
  try {
    return window.localStorage.getItem(SPEED_KEY) === '2' ? 2 : 1
  } catch {
    return 1
  }
}

/**
 * The battle (full screen over the map): the PixiJS scene in the middle, the
 * turn queue on top and the party with its actions below. The engine
 * (utils/battle.ts) decides everything; this screen shows it and asks the
 * player for the heroes' actions.
 */
export default function BattleScreen({ game, node, encounter, onFinish }: BattleScreenProps) {
  const t = useT()
  const stage = useRef<HTMLDivElement>(null)
  const renderer = useRef<BattleRenderer | null>(null)
  const pendingChoice = useRef<((action: BattleAction) => void) | null>(null)
  const [battle, setBattle] = useState<BattleState>(
    () =>
      createBattle({
        heroes: game.characters,
        phases: getEncounterPhases(node, encounter),
        // A new seed for each attempt; the enemies are the same.
        seed: hashText(`${node.id}:${Date.now()}`),
        biome: node.biome as Biome,
        cycle: game.cycle,
        canRetreat: encounter.canRetreat,
        items: game.inventory
      }).state
  )
  const [mode, setMode] = useState<Mode>('playing')
  const [skill, setSkill] = useState<Skill | null>(null)
  const [item, setItem] = useState<Item | null>(null)
  const [speed, setSpeed] = useState(1)
  const battleRef = useRef(battle)

  useEffect(() => setSpeed(readSpeed()), [])

  useEffect(() => {
    void playMusic(
      battle.outcome === 'victory' ? 'victory' : battle.outcome === 'defeat' ? 'defeat' : BATTLE_MUSIC[encounter.kind]
    )
  }, [battle.outcome, encounter.kind])

  useEffect(() => {
    if (renderer.current) {
      renderer.current.speed = speed
    }
  }, [speed])

  const choose = useCallback((action: BattleAction) => {
    const resolve = pendingChoice.current

    pendingChoice.current = null
    setSkill(null)
    setItem(null)
    resolve?.(action)
  }, [])
  const handleTap = useCallback(
    (combatantId: string) => {
      const current = battleRef.current

      if (!pendingChoice.current || !current.actorId) {
        return
      }

      if (itemRef.current && getItemTargets(current, itemRef.current).includes(combatantId)) {
        choose({ type: 'item', itemId: itemRef.current.id, targetIds: [combatantId] })
      } else if (skillRef.current && getTargets(current, current.actorId, skillRef.current).includes(combatantId)) {
        choose({ type: 'skill', skillId: skillRef.current.id, targetIds: [combatantId] })
      }
    },
    [choose]
  )
  const skillRef = useRef<Skill | null>(null)
  const itemRef = useRef<Item | null>(null)

  useEffect(() => {
    skillRef.current = skill
    itemRef.current = item
  }, [skill, item])

  // The battle loop: the timeline gives the turns, the enemies act on their own and the heroes wait for the player.
  useEffect(() => {
    let cancelled = false

    const show = (state: BattleState, markedId: string | null) => {
      battleRef.current = state
      setBattle(state)
      renderer.current?.sync(state, markedId)
    }

    ;(async () => {
      const { BattleRenderer } = await import('@/app/(protected)/(battle)/utils/battleRenderer')
      const labels = {
        skill: (id: string) => t(`skills.${id}` as MessageKey),
        item: (id: string) => itemName(t, id),
        status: (status: StatusType) => t(`statuses.${status}`),
        stance: (stance: 'offense' | 'defense') => t(`battle.traits.${stance}`),
        weak: t('battle.weak'),
        resist: t('battle.resist'),
        immune: t('battle.immune'),
        miss: t('battle.miss'),
        transform: t('battle.transform')
      }
      const instance = await BattleRenderer.create(
        stage.current!,
        battleRef.current,
        labels,
        (id) => handleTapRef.current(id),
        backgroundOf(node, encounter),
        node.id
      )

      if (cancelled) {
        instance.destroy()

        return
      }

      renderer.current = instance
      instance.speed = readSpeed()

      let state = battleRef.current

      show(state, null)

      while (!state.outcome && !cancelled) {
        const turn = nextTurn(state)

        await instance.play(turn.events, turn.state)
        state = turn.state
        show(state, state.actorId)

        if (state.outcome || cancelled) {
          break
        }

        const actor = getCombatant(state, state.actorId!)
        let action: BattleAction

        if (actor.side === 'hero') {
          setMode('choosing')
          action = await new Promise<BattleAction>((resolve) => {
            pendingChoice.current = resolve
          })
          setMode('playing')
        } else {
          await new Promise((resolve) => setTimeout(resolve, ENEMY_PAUSE_MS / instance.speed))
          action = chooseEnemyAction(state)
        }

        if (cancelled) {
          break
        }

        const step = performAction(state, action)

        await instance.play(step.events, step.state)
        state = step.state
        show(state, null)
      }

      if (!cancelled) {
        setMode('ended')
      }
    })()

    return () => {
      cancelled = true
      renderer.current?.destroy()
      renderer.current = null
    }
    // The battle runs once per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleTapRef = useRef(handleTap)

  useEffect(() => {
    handleTapRef.current = handleTap
  }, [handleTap])

  const toggleSpeed = () => {
    const next = speed === 1 ? 2 : 1

    setSpeed(next)

    try {
      window.localStorage.setItem(SPEED_KEY, String(next))
    } catch {
      // Only a preference.
    }
  }

  const actor = battle.actorId ? getCombatant(battle, battle.actorId) : null
  const heroes = battle.combatants.filter(
    (combatant) => combatant.side === 'hero' && (!combatant.reserve || combatant.fought)
  )
  const queue = getTurnQueue(battle, 8).map((id) => getCombatant(battle, id))

  const pickSkill = (picked: Skill) => {
    if (!actor) {
      return
    }

    if (picked.target === TargetType.ENEMY || picked.target === TargetType.ALLY) {
      setSkill(picked)
      setMode('targeting')
      renderer.current?.sync(battle, actor.id)
    } else {
      choose({ type: 'skill', skillId: picked.id, targetIds: getTargets(battle, actor.id, picked) })
    }
  }

  const pickItem = (picked: Item) => {
    if (!actor) {
      return
    }

    if (picked.target === 'ally' || picked.target === 'fallenAlly') {
      setItem(picked)
      setMode('targeting')
    } else {
      choose({ type: 'item', itemId: picked.id, targetIds: getItemTargets(battle, picked) })
    }
  }

  const targetIds = actor
    ? item
      ? getItemTargets(battle, item)
      : skill
        ? getTargets(battle, actor.id, skill)
        : []
    : []
  const targets = targetIds.map((id) => getCombatant(battle, id))

  const traitLabel = (hero: Combatant): string | null => {
    if (hero.stance) {
      return t(`battle.traits.${hero.stance}`)
    }

    if (hero.fury !== undefined) {
      return t('battle.traits.fury', { value: hero.fury })
    }

    if (hero.charges) {
      return hero.charges.length > 0
        ? t('battle.traits.charges', { types: hero.charges.map((type) => t(`damageTypes.${type}`)).join(' · ') })
        : null
    }

    if (hero.marks) {
      const marks = getFighters(battle, 'enemy').reduce((sum, enemy) => sum + (hero.marks?.[enemy.id] ?? 0), 0)

      return marks > 0 ? t('battle.traits.marks', { count: marks }) : null
    }

    return null
  }

  const usableItems = mode === 'choosing' || mode === 'items' ? getUsableItems(battle) : []

  return (
    <div className="battle-screen">
      <div className="top">
        <ol className="queue">
          {queue.map((combatant, index) => (
            <li
              key={`${combatant.id}-${index}`}
              className={classNames(combatant.side, { current: index === 0 && !!battle.actorId })}
              title={combatantName(t, combatant)}
            >
              {combatantName(t, combatant).charAt(0)}
            </li>
          ))}
        </ol>
        {battle.phases.length > 1 && (
          <span className="phase">{t('battle.phase', { phase: battle.phase + 1, total: battle.phases.length })}</span>
        )}
        <ButtonBase className="speed" onClick={toggleSpeed} aria-label={t('battle.speed', { speed })}>
          <FastForwardIcon fontSize="small" />×{speed}
        </ButtonBase>
      </div>
      <div ref={stage} className="stage" />
      <div className="bottom">
        <ul className="heroes">
          {heroes.map((hero) => (
            <li key={hero.id} className={classNames({ active: hero.id === battle.actorId, fallen: !isAlive(hero) })}>
              <span className="name">{combatantName(t, hero)}</span>
              <div className="bar health">
                <div style={{ width: `${(hero.health / hero.stats.maxHealth) * 100}%` }} />
              </div>
              <div className="bar focus">
                <div style={{ width: `${(hero.focus / hero.stats.maxFocus) * 100}%` }} />
              </div>
              <span className="numbers">
                {hero.health}/{hero.stats.maxHealth} · {t('battle.focus')} {hero.focus}
              </span>
              {traitLabel(hero) && <span className="trait">{traitLabel(hero)}</span>}
            </li>
          ))}
        </ul>
        {mode === 'choosing' && actor?.side === 'hero' && (
          <div className="actions frame-corners">
            {getCombatantSkills(battle, actor.id).map((option) => {
              const id = option.id

              return (
                <GameButton
                  key={id}
                  size="small"
                  color={option.cost === 0 ? 'gold' : option.heal ? 'lime' : 'cyan'}
                  disabled={option.cost > actor.focus || getTargets(battle, actor.id, option).length === 0}
                  onClick={() => pickSkill(option)}
                >
                  {t(`skills.${id}` as MessageKey)}
                  {option.cost > 0 && <span className="cost">{t('battle.focusCost', { cost: option.cost })}</span>}
                </GameButton>
              )
            })}
            <GameButton size="small" color="gold" disabled={usableItems.length === 0} onClick={() => setMode('items')}>
              {t('battle.items')}
            </GameButton>
            {battle.canRetreat && (
              <GameButton size="small" color="ghost" onClick={() => choose({ type: 'retreat' })}>
                {t('battle.retreat')}
              </GameButton>
            )}
          </div>
        )}
        {mode === 'items' && actor?.side === 'hero' && (
          <div className="actions frame-corners">
            {usableItems.map((option) => (
              <GameButton key={option.id} size="small" color="lime" onClick={() => pickItem(option)}>
                {itemName(t, option.id)}
                <span className="cost">× {battle.items[option.id]}</span>
              </GameButton>
            ))}
            <GameButton size="small" color="ghost" onClick={() => setMode('choosing')}>
              {t('battle.back')}
            </GameButton>
          </div>
        )}
        {mode === 'targeting' && (skill || item) && (
          <div className="actions frame-corners">
            <span className="prompt">{t(item ? 'battle.chooseAlly' : 'battle.chooseTarget')}</span>
            {targets.map((target) => (
              <GameButton
                key={target.id}
                size="small"
                color={target.side === 'enemy' ? 'magenta' : 'lime'}
                onClick={() =>
                  choose(
                    item
                      ? { type: 'item', itemId: item.id, targetIds: [target.id] }
                      : { type: 'skill', skillId: skill!.id, targetIds: [target.id] }
                  )
                }
              >
                {combatantName(t, target)} · {target.health}
              </GameButton>
            ))}
            <GameButton
              size="small"
              color="ghost"
              onClick={() => {
                setSkill(null)
                setItem(null)
                setMode('choosing')
              }}
            >
              {t('battle.back')}
            </GameButton>
          </div>
        )}
        {mode === 'playing' && actor?.side === 'enemy' && <p className="waiting">{t('battle.enemyTurn')}</p>}
      </div>
      {mode === 'ended' && battle.outcome && (
        <div className="result">
          <div className={classNames('panel', 'frame-corners', battle.outcome)}>
            <h2 className="frame-title">
              {t(
                battle.outcome === 'victory'
                  ? 'battle.victory'
                  : battle.outcome === 'defeat'
                    ? 'battle.defeat'
                    : 'battle.retreated'
              )}
            </h2>
            {battle.outcome === 'victory' ? (
              <>
                <p>{t('battle.xpGained', { xp: battle.xp })}</p>
                <p>{t('battle.goldGained', { gold: battle.gold })}</p>
                {Object.keys(battle.loot).length > 0 && (
                  <p>
                    {t('battle.lootTitle')}:{' '}
                    {Object.entries(battle.loot)
                      .map(([id, count]) => `${itemName(t, id)} × ${count}`)
                      .join(', ')}
                  </p>
                )}
              </>
            ) : (
              <p>{t(battle.outcome === 'defeat' ? 'battle.defeatText' : 'battle.retreatText')}</p>
            )}
            <GameButton fullWidth onClick={() => onFinish(battle)}>
              {t('battle.continue')}
            </GameButton>
          </div>
        </div>
      )}
    </div>
  )
}
