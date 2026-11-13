'use client'

import './index.scss'
import classNames from 'classnames'
import ItemIcon, { IconSubject } from '@/app/(protected)/(party)/components/ItemIcon'

/** One thing gained: its picture, how much of it and its name. */
export interface LootEntry {
  key: string
  subject: IconSubject
  /** What goes on the corner of the picture: "×2", "+120"... */
  amount: string
  name: string
}

interface LootGridProps {
  entries: LootEntry[]
  /** Delay of the first tile, in ms (each next one comes a bit later). */
  delay?: number
  className?: string
}

/** What a victory or a chest gave, as tiles with the picture of each thing. */
export default function LootGrid({ entries, delay = 0, className }: LootGridProps) {
  return (
    <ul className={classNames('loot-grid', className)}>
      {entries.map((entry, position) => (
        <li key={entry.key} style={{ animationDelay: `${delay + position * 120}ms` }} title={entry.name}>
          <span className="loot-picture">
            <ItemIcon subject={entry.subject} size={44} />
            <span className="loot-amount">{entry.amount}</span>
          </span>
          <span className="loot-name">{entry.name}</span>
        </li>
      ))}
    </ul>
  )
}
