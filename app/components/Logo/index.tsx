import './index.scss'
import classNames from 'classnames'

/** Crisol wordmark: a flame and the name in gold, glowing like embers. */
export default function Logo({
  size = 'medium',
  className
}: {
  size?: 'small' | 'medium' | 'large'
  className?: string
}) {
  return (
    <span className={classNames('logo', `size-${size}`, className)}>
      <svg className="flame" viewBox="0 0 24 32" aria-hidden="true">
        <path
          d="M12 0c1.5 6-6 9.5-6 18a6 6 0 0 0 12 0c0-3-1.5-5-3-6.5.5 3-1 4.5-2.5 4.5 0-6 3-9.5-.5-16z"
          fill="var(--color-ember)"
          stroke="rgba(0,0,0,0.35)"
          strokeWidth="1.5"
        />
        <path d="M12 20c-1.5 1.5-2.5 2.8-2.5 4.5a2.5 2.5 0 0 0 5 0c0-1.7-1-3-2.5-4.5z" fill="var(--color-gold)" />
      </svg>
      <span className="word">Crisol</span>
    </span>
  )
}
