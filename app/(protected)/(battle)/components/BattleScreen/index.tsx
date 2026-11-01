'use client'

import './index.scss'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import BackpackIcon from '@mui/icons-material/Backpack'
import CloseIcon from '@mui/icons-material/Close'
import DirectionsRunIcon from '@mui/icons-material/DirectionsRun'
import FastForwardIcon from '@mui/icons-material/FastForward'
import SwapHorizIcon from '@mui/icons-material/SwapHoriz'
import ButtonBase from '@mui/material/ButtonBase'
import classNames from 'classnames'
import { useCallback, useEffect, useRef, useState } from 'react'
import { MusicId } from '@/app/(protected)/(art)/data/audio'
import { playMusic } from '@/app/(protected)/(art)/utils/sound'
import XpChange from '@/app/(protected)/(battle)/components/XpChange'
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
  canRetreat,
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
import {
  experienceAfterBattle,
  getLostXpAt,
  totalLostXp,
  xpLostInDefeat
} from '@/app/(protected)/(engine)/utils/battleResult'
import { getEncounterPhases, hashText } from '@/app/(protected)/(engine)/utils/encounters'
import { SKILL_SLOTS } from '@/app/(protected)/(engine)/utils/heroes'
import XpBar from '@/app/(protected)/(party)/components/XpBar'
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

type Mode = 'playing' | 'choosing' | 'skills' | 'items' | 'targeting' | 'ended'

const SPEED_KEY = 'crisol.battleSpeed'

/**
 * The painted background of the battles in special places (the castle, the
 * forge of Crisol); everywhere else the scenery builds the landscape of the
 * biome in layers (see BattleScenery).
 */
function backgroundOf(node: WorldNode, encounter: Encounter): string | null {
  if (encounter.kind === EncounterKind.CRISOL) {
    return 'backgrounds/crisol'
  }

  if (node.biome === Biome.ABYSS && encounter.kind !== EncounterKind.COMBAT) {
    return 'backgrounds/castle'
  }

  return null
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

/** The color of a skill: heals, help for the party or the hero, and attacks. */
function skillTone(skill: Skill): 'heal' | 'support' | 'damage' {
  if (skill.heal) {
    return 'heal'
  }

  return skill.target === TargetType.SELF || skill.target === TargetType.ALLY || skill.target === TargetType.ALL_ALLIES
    ? 'support'
    : 'damage'
}

function readSpeed(): number {
  try {
    return window.localStorage.getItem(SPEED_KEY) === '2' ? 2 : 1
  } catch {
    return 1
  }
}

/**
 * The battle (full screen over the map): the PixiJS scene fills it, and the
 * HUD floats over it: the turn queue on top, and below the commands of the
 * hero whose turn it is over the party: its weapon attack, Special (which
 * opens its six skills), items and retreat. The targets are picked by tapping them. The engine
 * (utils/battle.ts) decides everything; this screen shows it and asks the
 * player for the heroes' actions.
 */
export default function BattleScreen({ game, node, encounter, onFinish }: BattleScreenProps) {
  const t = useT()
  const stage = useRef<HTMLDivElement>(null)
  const top = useRef<HTMLElement>(null)
  const hud = useRef<HTMLDivElement>(null)
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
      instance.setInsets(top.current?.offsetHeight ?? 0, hud.current?.offsetHeight ?? 0)
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

  // The fighters stand in the room the HUD leaves free.
  useEffect(() => {
    const fit = () => {
      renderer.current?.setInsets(top.current?.offsetHeight ?? 0, hud.current?.offsetHeight ?? 0)
    }

    const observer = new ResizeObserver(fit)

    for (const element of [top.current, hud.current, stage.current]) {
      if (element) {
        observer.observe(element)
      }
    }

    return () => observer.disconnect()
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
  /** The hero's progression outside the battle (its experience doesn't change while fighting). */
  const characterOf = (hero: Combatant) => game.characters.find((character) => character.id === hero.characterId)
  /** How the experience of a hero ends up after the battle, as the result will apply it. */
  const experienceAfter = (character: GameState['characters'][number], hero: Combatant) =>
    experienceAfterBattle(game, battle, character, !!hero.fought)
  /** Experience lost in the last defeat that waits here: won back with a victory. */
  const lostHere = totalLostXp(getLostXpAt(game, node.id))
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
  const pickable = mode === 'targeting' ? targetIds.join(',') : ''

  useEffect(() => {
    renderer.current?.setTargets(pickable ? pickable.split(',') : [])
  }, [pickable])

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
  const itemCount = Object.values(battle.items).reduce((sum, count) => sum + count, 0)
  const actorSkills = actor?.side === 'hero' ? getCombatantSkills(battle, actor.id) : []
  const [attack, ...others] = actorSkills
  // The six equipped skills go behind Special; the secondary actions (Kael's stance) get a button of their own.
  const specials = others.filter((option) => !option.stance)
  const secondary = others.filter((option) => option.stance)
  const canUse = (option: Skill) =>
    !!actor && option.cost <= actor.focus && getTargets(battle, actor.id, option).length > 0
  const choosing = mode === 'choosing' && actor?.side === 'hero'

  return (
    <div className="battle-screen">
      <div ref={stage} className="stage" />
      <header ref={top} className="hud-top">
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
      </header>
      <div ref={hud} className="hud-bottom">
        <div className="command">
          {actor?.side === 'hero' && mode !== 'ended' && (
            <span className="turn-of">{t('battle.turnOf', { name: combatantName(t, actor) })}</span>
          )}
          {choosing && (
            <div className="command-row menu">
              <div className="options">
                <ButtonBase className="option special" onClick={() => setMode('skills')}>
                  <AutoAwesomeIcon fontSize="small" />
                  {t('battle.special')}
                  <span className="count">{specials.filter(canUse).length}</span>
                </ButtonBase>
                {secondary.map((option) => (
                  <ButtonBase
                    key={option.id}
                    className="option secondary"
                    disabled={!canUse(option)}
                    onClick={() => pickSkill(option)}
                  >
                    <SwapHorizIcon fontSize="small" />
                    {t('battle.stance')}
                    {actor?.stance && (
                      <span className="count">
                        → {t(`battle.stances.${actor.stance === 'offense' ? 'defense' : 'offense'}`)}
                      </span>
                    )}
                  </ButtonBase>
                ))}
                <ButtonBase className="option" disabled={usableItems.length === 0} onClick={() => setMode('items')}>
                  <BackpackIcon fontSize="small" />
                  {t('battle.items')}
                  {itemCount > 0 && <span className="count">{itemCount}</span>}
                </ButtonBase>
                {battle.canRetreat && (
                  <ButtonBase
                    className="option ghost"
                    disabled={!canRetreat(battle)}
                    title={canRetreat(battle) ? undefined : t('battle.retreatBlocked')}
                    onClick={() => choose({ type: 'retreat' })}
                  >
                    <DirectionsRunIcon fontSize="small" />
                    {t('battle.retreat')}
                  </ButtonBase>
                )}
              </div>
              {attack && (
                <ButtonBase
                  className="attack"
                  disabled={!canUse(attack)}
                  onClick={() => pickSkill(attack)}
                  aria-label={t(`skills.${attack.id}` as MessageKey)}
                >
                  <span className="attack-label">{t('battle.attack')}</span>
                  <span className="attack-skill">{t(`skills.${attack.id}` as MessageKey)}</span>
                </ButtonBase>
              )}
            </div>
          )}
          {mode === 'skills' && actor?.side === 'hero' && (
            <div className="command-row">
              <div className="skills">
                {Array.from({ length: SKILL_SLOTS }, (_, index) => specials[index]).map((option, index) =>
                  option ? (
                    <ButtonBase
                      key={option.id}
                      className={classNames('skill', skillTone(option))}
                      disabled={!canUse(option)}
                      onClick={() => pickSkill(option)}
                    >
                      <span className="skill-name">{t(`skills.${option.id}` as MessageKey)}</span>
                      <span className="skill-meta">
                        <i className={classNames('element', option.damageType)} />
                        {t(`battle.reach.${option.target}`)}
                        <span className={classNames('cost', { short: option.cost > actor.focus })}>{option.cost}</span>
                      </span>
                    </ButtonBase>
                  ) : (
                    <span key={`empty-${index}`} className="skill empty">
                      {t('battle.emptySlot')}
                    </span>
                  )
                )}
              </div>
              <div className="core">
                <ButtonBase className="round back" onClick={() => setMode('choosing')} aria-label={t('battle.back')}>
                  <ArrowBackIcon fontSize="small" />
                </ButtonBase>
              </div>
            </div>
          )}
          {mode === 'items' && actor?.side === 'hero' && (
            <div className="command-row">
              <div className="skills items">
                {usableItems.map((option) => (
                  <ButtonBase
                    key={option.id}
                    className={classNames('skill', option.power ? 'damage' : 'heal')}
                    onClick={() => pickItem(option)}
                  >
                    <span className="skill-name">{itemName(t, option.id)}</span>
                    <span className="skill-meta">
                      <span className="cost">× {battle.items[option.id]}</span>
                    </span>
                  </ButtonBase>
                ))}
              </div>
              <div className="core">
                <ButtonBase className="round back" onClick={() => setMode('choosing')} aria-label={t('battle.back')}>
                  <ArrowBackIcon fontSize="small" />
                </ButtonBase>
              </div>
            </div>
          )}
          {mode === 'targeting' && (skill || item) && (
            <div className="targeting">
              <div className="prompt">
                <span>
                  {skill && !item
                    ? `${t(`skills.${skill.id}` as MessageKey)} · `
                    : item
                      ? `${itemName(t, item.id)} · `
                      : ''}
                  {t(targets[0]?.side === 'enemy' ? 'battle.tapEnemy' : 'battle.tapAlly')}
                </span>
                <ButtonBase
                  className="round back"
                  aria-label={t('battle.back')}
                  onClick={() => {
                    setSkill(null)
                    setItem(null)
                    setMode(item ? 'items' : skill && skill.id !== attack?.id ? 'skills' : 'choosing')
                  }}
                >
                  <CloseIcon fontSize="small" />
                </ButtonBase>
              </div>
              <div className="target-chips">
                {targets.map((target) => (
                  <ButtonBase
                    key={target.id}
                    className={classNames('chip', target.side)}
                    onClick={() =>
                      choose(
                        item
                          ? { type: 'item', itemId: item.id, targetIds: [target.id] }
                          : { type: 'skill', skillId: skill!.id, targetIds: [target.id] }
                      )
                    }
                  >
                    <span className="chip-name">{combatantName(t, target)}</span>
                    <span className="chip-bar">
                      <span style={{ width: `${(target.health / target.stats.maxHealth) * 100}%` }} />
                    </span>
                  </ButtonBase>
                ))}
              </div>
            </div>
          )}
          {mode === 'playing' && actor?.side === 'enemy' && (
            <span className="banner enemy">{t('battle.enemyTurn')}</span>
          )}
        </div>
        <ul className="party">
          {heroes.map((hero) => (
            <li key={hero.id} className={classNames({ active: hero.id === battle.actorId, fallen: !isAlive(hero) })}>
              <span className="medallion">{combatantName(t, hero).charAt(0)}</span>
              <div className="vitals">
                <div className="line">
                  <span className="name">{combatantName(t, hero)}</span>
                  <span className="numbers">{hero.health}</span>
                </div>
                <div className="bar health">
                  <div style={{ width: `${(hero.health / hero.stats.maxHealth) * 100}%` }} />
                </div>
                <div className="bar focus">
                  <div style={{ width: `${(hero.focus / hero.stats.maxFocus) * 100}%` }} />
                </div>
                {characterOf(hero) && <XpBar character={characterOf(hero)!} compact />}
                {traitLabel(hero) && <span className="trait">{traitLabel(hero)}</span>}
              </div>
            </li>
          ))}
        </ul>
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
                {lostHere > 0 && <p className="recovered">{t('battle.xpRecovered', { xp: lostHere })}</p>}
                <p>{t('battle.goldGained', { gold: battle.gold })}</p>
                {battle.echoes > 0 && <p>{t('world.rewards.echoes', { count: battle.echoes })}</p>}
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
              <>
                <p>{t(battle.outcome === 'defeat' ? 'battle.defeatText' : 'battle.retreatText')}</p>
                {battle.outcome === 'defeat' && xpLostInDefeat(game) && (
                  <p className="recovered">{t('battle.xpLeftBehind')}</p>
                )}
                {battle.outcome === 'defeat' && game.lostXp && (
                  <p className="forfeited">{t('battle.xpForfeited', { xp: totalLostXp(game.lostXp.xp) })}</p>
                )}
              </>
            )}
            <ul className="experience">
              {heroes.map((hero, position) => {
                const before = characterOf(hero)

                return (
                  before && (
                    <XpChange
                      key={hero.id}
                      name={combatantName(t, hero)}
                      before={before}
                      after={experienceAfter(before, hero)}
                      delay={400 + position * 150}
                    />
                  )
                )
              })}
            </ul>
            <GameButton fullWidth onClick={() => onFinish(battle)}>
              {t('battle.continue')}
            </GameButton>
          </div>
        </div>
      )}
    </div>
  )
}
