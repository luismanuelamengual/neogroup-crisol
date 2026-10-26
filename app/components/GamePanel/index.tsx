import './index.scss'
import classNames from 'classnames'
import { HTMLAttributes, ReactNode, Ref } from 'react'

interface GamePanelProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  /** Optional title, between two gold rules at the top of the panel. */
  title?: ReactNode
  accent?: 'gold' | 'cyan' | 'magenta' | 'lime'
  children: ReactNode
  ref?: Ref<HTMLDivElement>
}

/** Ornate window: dark leather framed in bronze, gold diamonds on its top corners and an optional title. */
export default function GamePanel({ title, accent = 'gold', className, children, ref, ...props }: GamePanelProps) {
  return (
    <div
      ref={ref}
      className={classNames('game-panel', 'frame-corners', `accent-${accent}`, className, { 'with-title': !!title })}
      {...props}
    >
      {title && <h2 className="frame-title">{title}</h2>}
      {children}
    </div>
  )
}
