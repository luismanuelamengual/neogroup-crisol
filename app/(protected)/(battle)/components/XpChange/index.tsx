'use client'

import './index.scss'
import classNames from 'classnames'
import { useEffect, useState } from 'react'
import { CharacterState } from '@/app/(protected)/(engine)/models/CharacterState'
import { xpToNextLevel } from '@/app/(protected)/(engine)/utils/progression'
import XpBar from '@/app/(protected)/(party)/components/XpBar'
import { useT } from '@/app/i18n/I18nProvider'

type Progress = Pick<CharacterState, 'level' | 'xp'>

interface XpChangeProps {
  name: string
  before: Progress
  after: Progress
  /** Waits this long before starting, so the heroes fill one after the other. */
  delay?: number
}

/** A stretch of the animation, inside one level. */
interface Segment {
  level: number
  from: number
  to: number
  duration: number
}

/** Time to fill a whole level. */
const FULL_LEVEL_MS = 1100
/** Pause on a full bar before it empties into the next level. */
const LEVEL_UP_PAUSE_MS = 250

/** The stretches between two moments of a hero's progression: one per level it goes through. */
function segmentsOf(before: Progress, after: Progress): Segment[] {
  const stretch = (level: number, from: number, to: number): Segment => ({
    level,
    from,
    to,
    duration: Math.max(250, (FULL_LEVEL_MS * Math.abs(to - from)) / xpToNextLevel(level))
  })

  if (after.level <= before.level) {
    return [stretch(before.level, before.xp, after.xp)]
  }

  const segments = [stretch(before.level, before.xp, xpToNextLevel(before.level))]

  for (let level = before.level + 1; level < after.level; level++) {
    segments.push(stretch(level, 0, xpToNextLevel(level)))
  }

  return [...segments, stretch(after.level, 0, after.xp)]
}

const easeInOut = (x: number) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2)

/** The experience a hero wins or loses at the end of a battle, with the bar moving from before to after. */
export default function XpChange({ name, before, after, delay = 0 }: XpChangeProps) {
  const t = useT()
  const [shown, setShown] = useState<Progress>(before)
  // Plain numbers for the effect, so a new render with the same values doesn't restart it.
  const { level: fromLevel, xp: fromXp } = before
  const { level: toLevel, xp: toXp } = after

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setShown({ level: toLevel, xp: toXp })

      return
    }

    const segments = segmentsOf({ level: fromLevel, xp: fromXp }, { level: toLevel, xp: toXp })
    let frame = 0
    let start: number | null = null

    const tick = (now: number) => {
      start ??= now

      let elapsed = now - start - delay

      for (const [index, segment] of segments.entries()) {
        const last = index === segments.length - 1
        const span = segment.duration + (last ? 0 : LEVEL_UP_PAUSE_MS)

        if (elapsed < span || last) {
          const share = Math.min(1, Math.max(0, elapsed / segment.duration))

          setShown({
            level: segment.level,
            xp: Math.round(segment.from + (segment.to - segment.from) * easeInOut(share))
          })

          if (last && share >= 1) {
            return
          }

          break
        }

        elapsed -= span
      }

      frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)

    return () => cancelAnimationFrame(frame)
  }, [fromLevel, fromXp, toLevel, toXp, delay])

  const leveledUp = shown.level > before.level
  const lost = after.level === before.level && after.xp < before.xp

  return (
    <li className={classNames('xp-change', { lost })}>
      <div className="line">
        <span className="name">{name}</span>
        <span key={shown.level} className={classNames('level', { up: leveledUp })}>
          {leveledUp ? t('battle.levelUpShort', { level: shown.level }) : t('world.levelShort', { level: shown.level })}
        </span>
      </div>
      <XpBar character={shown} instant />
    </li>
  )
}
