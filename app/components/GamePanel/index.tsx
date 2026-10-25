import './index.scss'
import classNames from 'classnames'
import { HTMLAttributes, ReactNode, Ref } from 'react'

interface GamePanelProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  /** Optional ribbon title rendered on top of the panel. */
  title?: ReactNode
  accent?: 'gold' | 'cyan' | 'magenta' | 'lime'
  children: ReactNode
  ref?: Ref<HTMLDivElement>
}

/** Framed "game UI" panel: thick border, inner glow, a solid drop edge and an optional ribbon title. */
export default function GamePanel({ title, accent = 'gold', className, children, ref, ...props }: GamePanelProps) {
  return (
    <div
      ref={ref}
      className={classNames('game-panel', `accent-${accent}`, className, { 'with-title': !!title })}
      {...props}
    >
      {title && <div className="ribbon">{title}</div>}
      {children}
    </div>
  )
}
