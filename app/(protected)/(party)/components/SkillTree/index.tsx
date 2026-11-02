'use client'

import './index.scss'
import ButtonBase from '@mui/material/ButtonBase'
import classNames from 'classnames'
import { CSSProperties, useState } from 'react'
import { getSkillTree, MAX_SKILL_LEVEL } from '@/app/(protected)/(engine)/data/skillTrees'
import { CharacterState } from '@/app/(protected)/(engine)/models/CharacterState'
import { GameState } from '@/app/(protected)/(engine)/models/GameState'
import {
  equipSkill,
  getNextSkillCost,
  getSkillLearnState,
  getSkillLevel,
  getSkillPoints,
  learnSkill,
  SKILL_SLOTS,
  unequipSkill
} from '@/app/(protected)/(engine)/utils/heroes'
import SkillIcon from '@/app/(protected)/(party)/components/SkillIcon'
import { describeLevelGain, describeSkill, skillCost, skillName } from '@/app/(protected)/(party)/utils/describe'
import GameButton from '@/app/components/GameButton'
import { useT } from '@/app/i18n/I18nProvider'

interface SkillTreeProps {
  state: GameState
  character: CharacterState
  onChange: (state: GameState) => void
}

/**
 * The skill tree of a hero: a board of diamonds joined by lines, of its own
 * shape. A learned special shows its emblem and its level; the others show
 * what they cost, lit when they can be learned now (joined to a learned one
 * and paid for). Tapping one opens its card under the board, to learn it,
 * raise its level or take it into battle.
 */
export default function SkillTree({ state, character, onChange }: SkillTreeProps) {
  const t = useT()
  const id = character.id
  const tree = getSkillTree(id)
  const points = getSkillPoints(character)
  const firstReady = tree.nodes.find((node) => getSkillLearnState(character, node.skillId) === 'ready')?.skillId
  const [picked, setPicked] = useState<string | null>(null)
  const selected = picked && tree.nodes.some((node) => node.skillId === picked) ? picked : (firstReady ?? tree.root)
  const nodeOf = (skillId: string) => tree.nodes.find((node) => node.skillId === skillId)!
  const learned = (skillId: string) => getSkillLevel(character, skillId) > 0
  const boardStyle = {
    '--columns': tree.width,
    '--rows': tree.height
  } as CSSProperties

  const renderDetail = () => {
    const skillId = selected
    const level = getSkillLevel(character, skillId)
    const learnState = getSkillLearnState(character, skillId)
    const next = getNextSkillCost(character, skillId)
    const equipped = character.skills.includes(skillId)
    const nextGain = level > 0 && level < MAX_SKILL_LEVEL ? describeLevelGain(t, skillId, level + 1) : ''
    const focus = skillCost(skillId, Math.max(1, level))
    const reason =
      learnState === 'far'
        ? t('party.needsLink')
        : learnState === 'points'
          ? t('party.needsPoints', { count: next - Math.max(0, points) })
          : learnState === 'max'
            ? t('party.skillMax')
            : null

    return (
      <div className="skill-detail">
        <div className="head">
          <SkillIcon skillId={skillId} size="large" />
          <div className="titles">
            <span className="name">{skillName(t, skillId)}</span>
            <span className="meta">
              {skillId === tree.root && `${t('party.rootSkill')} · `}
              {level > 0 ? t('party.skillLevel', { level, max: MAX_SKILL_LEVEL }) : t('party.notLearned')}
            </span>
            <Pips level={level} />
          </div>
          {focus > 0 && <span className="cost">{focus}</span>}
        </div>
        <ul className="effects">
          {describeSkill(t, skillId, Math.max(1, level)).map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        {nextGain && <p className="next">{t('party.nextLevel', { level: level + 1, effects: nextGain })}</p>}
        {reason && <p className={classNames('reason', learnState)}>{reason}</p>}
        <div className="actions">
          {learnState !== 'max' && (
            <GameButton
              size="small"
              color="cyan"
              disabled={learnState !== 'ready'}
              onClick={() => onChange(learnSkill(state, id, skillId))}
            >
              {level === 0 ? t('party.learn', { cost: next }) : t('party.levelUp', { level: level + 1, cost: next })}
            </GameButton>
          )}
          {level > 0 &&
            (equipped ? (
              <GameButton size="small" color="ghost" onClick={() => onChange(unequipSkill(state, id, skillId))}>
                {t('party.unequip')}
              </GameButton>
            ) : (
              <GameButton
                size="small"
                color="gold"
                disabled={character.skills.length >= SKILL_SLOTS}
                onClick={() => onChange(equipSkill(state, id, skillId))}
              >
                {t('party.equipSkill')}
              </GameButton>
            ))}
          {level > 0 && !equipped && character.skills.length >= SKILL_SLOTS && (
            <span className="reason">{t('party.slotsFull', { count: SKILL_SLOTS })}</span>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="skill-tree">
      <p className="tree-hint">{t('party.treeHint', { max: MAX_SKILL_LEVEL })}</p>
      <div className="board" style={boardStyle}>
        <svg className="links" viewBox={`0 0 ${tree.width} ${tree.height}`} aria-hidden>
          {tree.links.map(([a, b]) => {
            const from = nodeOf(a)
            const to = nodeOf(b)

            return (
              <line
                key={`${a}-${b}`}
                x1={from.x + 0.5}
                y1={from.y + 0.5}
                x2={to.x + 0.5}
                y2={to.y + 0.5}
                className={classNames({
                  lit: learned(a) && learned(b),
                  open: learned(a) !== learned(b)
                })}
                vectorEffect="non-scaling-stroke"
              />
            )
          })}
        </svg>
        {tree.nodes.map((node) => {
          const level = getSkillLevel(character, node.skillId)
          const learnState = getSkillLearnState(character, node.skillId)

          return (
            <ButtonBase
              key={node.skillId}
              className={classNames('node', learnState, {
                learned: level > 0,
                selected: selected === node.skillId,
                equipped: character.skills.includes(node.skillId)
              })}
              style={{ '--x': node.x, '--y': node.y } as CSSProperties}
              aria-label={skillName(t, node.skillId)}
              aria-pressed={selected === node.skillId}
              onClick={() => setPicked(node.skillId)}
            >
              <span className="diamond" />
              {level > 0 ? (
                <>
                  <SkillIcon skillId={node.skillId} size="small" className="emblem" />
                  <span className="level">{level}</span>
                </>
              ) : (
                <span className="price">{node.cost}</span>
              )}
            </ButtonBase>
          )
        })}
      </div>
      {renderDetail()}
    </div>
  )
}

/** The levels of a special as five gems. */
function Pips({ level }: { level: number }) {
  return (
    <span className="pips" aria-hidden>
      {Array.from({ length: MAX_SKILL_LEVEL }, (_, index) => (
        <span key={index} className={classNames('pip', { on: index < level })} />
      ))}
    </span>
  )
}
