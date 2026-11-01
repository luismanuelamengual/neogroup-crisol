'use client'

import './index.scss'
import classNames from 'classnames'
import { CharacterState } from '@/app/(protected)/(engine)/models/CharacterState'
import { xpToNextLevel } from '@/app/(protected)/(engine)/utils/progression'
import { useT } from '@/app/i18n/I18nProvider'

interface XpBarProps {
  character: Pick<CharacterState, 'level' | 'xp'>
  /** Smaller text, for tight places like the battle HUD. */
  compact?: boolean
  /** The fill follows the value at once (when something else animates it). */
  instant?: boolean
  className?: string
}

/** The experience of a hero: how much it has in its level out of what the next one needs. */
export default function XpBar({ character, compact = false, instant = false, className }: XpBarProps) {
  const t = useT()
  const next = xpToNextLevel(character.level)
  const missing = Math.max(0, next - character.xp)
  const share = Math.min(1, character.xp / next)

  return (
    <div
      className={classNames('xp-bar', { compact, instant }, className)}
      role="meter"
      aria-valuemin={0}
      aria-valuemax={next}
      aria-valuenow={character.xp}
      aria-label={t('world.xpLabel', { xp: character.xp, next, count: missing, level: character.level + 1 })}
    >
      <div className="track">
        <div className="fill" style={{ width: `${share * 100}%` }} />
      </div>
      <span className="amount">{t('world.xp', { xp: character.xp, next })}</span>
    </div>
  )
}
