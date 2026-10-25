'use client'

import './index.scss'
import classNames from 'classnames'

const AVATAR_COLORS = ['#ffc233', '#22d3ee', '#ff4d8d', '#84f06b', '#a78bfa', '#fb923c']

interface PlayerAvatarProps {
  name: string
  /** Background color; by default one derived from the name. */
  color?: string
  className?: string
}

/**
 * Round "player badge" avatar: the initial of the player name over a color
 * (derived from the name by default).
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
