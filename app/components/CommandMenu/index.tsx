'use client'

import './index.scss'
import CircularProgress from '@mui/material/CircularProgress'
import classNames from 'classnames'
import Link from 'next/link'
import { KeyboardEvent, ReactNode, useRef, useState } from 'react'

export interface CommandMenuItem {
  key: string
  label: ReactNode
  /** Small line under the label. */
  detail?: ReactNode
  href?: string
  onClick?: () => void
  disabled?: boolean
  loading?: boolean
}

interface CommandMenuProps {
  items: CommandMenuItem[]
  className?: string
  'aria-label'?: string
}

/**
 * Console style command menu: a framed window with one command per line and a
 * cursor (two glowing diamonds) on the highlighted one. The cursor follows the
 * pointer and the arrow keys; Enter or a tap runs the command.
 */
export default function CommandMenu({ items, className, 'aria-label': ariaLabel }: CommandMenuProps) {
  const enabled = items.map((item, index) => (item.disabled ? -1 : index)).filter((index) => index >= 0)
  const [cursor, setCursor] = useState(enabled[0] ?? 0)
  const refs = useRef<(HTMLElement | null)[]>([])

  const move = (step: number) => {
    const at = enabled.indexOf(cursor)
    const next = enabled[(at + step + enabled.length) % enabled.length]

    if (next !== undefined) {
      setCursor(next)
      refs.current[next]?.focus()
    }
  }

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      move(event.key === 'ArrowDown' ? 1 : -1)
    }
  }

  return (
    <nav
      className={classNames('command-menu', 'frame-corners', className)}
      aria-label={ariaLabel}
      onKeyDown={handleKeyDown}
    >
      {items.map((item, index) => {
        const classes = classNames('command', { selected: index === cursor && !item.disabled, disabled: item.disabled })
        const content = (
          <>
            <span className="label">
              {item.loading && <CircularProgress size="0.9em" color="inherit" />}
              {item.label}
            </span>
            {item.detail && <span className="detail">{item.detail}</span>}
          </>
        )
        const common = {
          ref: (element: HTMLElement | null) => {
            refs.current[index] = element
          },
          className: classes,
          onPointerEnter: () => !item.disabled && setCursor(index),
          onFocus: () => !item.disabled && setCursor(index)
        }

        return item.href && !item.disabled ? (
          <Link key={item.key} href={item.href} {...common}>
            {content}
          </Link>
        ) : (
          <button
            key={item.key}
            type="button"
            disabled={item.disabled || item.loading}
            onClick={item.onClick}
            {...common}
          >
            {content}
          </button>
        )
      })}
    </nav>
  )
}
