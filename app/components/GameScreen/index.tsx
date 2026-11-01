'use client'

import './index.scss'
import CloseIcon from '@mui/icons-material/Close'
import Dialog from '@mui/material/Dialog'
import IconButton from '@mui/material/IconButton'
import classNames from 'classnames'
import { ReactNode } from 'react'
import { useT } from '@/app/i18n/I18nProvider'

interface GameScreenTab<T extends string> {
  id: T
  label: string
  /** A small count next to the label (e.g. points to spend). */
  badge?: number
  disabled?: boolean
}

interface GameScreenProps<T extends string> {
  open: boolean
  title: ReactNode
  onClose: () => void
  /** Tabs under the title (console style plaques); none when left out. */
  tabs?: GameScreenTab<T>[]
  tab?: T
  onTab?: (tab: T) => void
  /** Something between the title and the tabs (e.g. the summary of a hero). */
  header?: ReactNode
  className?: string
  children: ReactNode
}

/** A full screen page over the map: a title, optional tabs and ornate sections below. */
export default function GameScreen<T extends string>({
  open,
  title,
  onClose,
  tabs,
  tab,
  onTab,
  header,
  className,
  children
}: GameScreenProps<T>) {
  const t = useT()

  return (
    <Dialog open={open} onClose={onClose} fullScreen className={classNames('game-screen', className)}>
      <header>
        <h2 className="frame-title">{title}</h2>
        <IconButton className="close" onClick={onClose} aria-label={t('common.close')}>
          <CloseIcon />
        </IconButton>
      </header>
      {header}
      {tabs && (
        <nav className="views" role="tablist">
          {tabs.map((option) => (
            <button
              key={option.id}
              type="button"
              role="tab"
              aria-selected={tab === option.id}
              disabled={option.disabled}
              className={classNames({ selected: tab === option.id })}
              onClick={(event) => {
                event.currentTarget.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' })
                onTab?.(option.id)
              }}
            >
              {option.label}
              {!!option.badge && <span className="tab-badge">{option.badge}</span>}
            </button>
          ))}
        </nav>
      )}
      <div className="content">{children}</div>
    </Dialog>
  )
}
