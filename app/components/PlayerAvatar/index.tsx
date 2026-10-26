'use client'

import './index.scss'
import classNames from 'classnames'

const AVATAR_COLORS = ['#7a2a0c', '#1f4f9a', '#3c6e22', '#5a2a6a', '#6b4a1c', '#7a1c10']

interface PlayerAvatarProps {
  name: string
  /** Background color; by default one derived from the name. */
  color?: string
  className?: string
}

/**
 * Round medallion: the initial of the player name in gold over a dark enamel
 * color (derived from the name by default), set in a gold rim.
 */
export default function PlayerAvatar({ name, color, className }: PlayerAvatarProps) {
  const initial = (name.trim()[0] ?? '?').toUpperCase()
  const hash = Array.from(name).reduce((sum, char) => sum + char.charCodeAt(0), 0)
  const backgroundColor = color ?? AVATAR_COLORS[hash % AVATAR_COLORS.length]

  return (
    <span className={classNames('player-avatar', className)} style={{ backgroundColor }}>
      {initial}
    </span>
  )
}
