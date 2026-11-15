import './index.scss'
import classNames from 'classnames'
import { CSSProperties } from 'react'

/** Embers rising over the art: fixed values (not random) so the server and client HTML match. */
const EMBERS = Array.from({ length: 22 }, (_, index) => ({
  left: (index * 37 + 11) % 100,
  size: 3 + ((index * 7) % 5),
  duration: 7 + ((index * 5) % 9),
  delay: -((index * 13) % 16),
  drift: ((index * 29) % 60) - 30
}))

/**
 * Key art of the title screens (login and main menu): the five heroes facing
 * the bosses of the Abyss, slowly zooming, with embers rising and a dark veil
 * where the window goes (a side, or the middle). Upright phones get the vertical art (only
 * the auth pages can be seen upright: the game itself asks to rotate).
 */
export default function TitleArt({
  side = 'right',
  className
}: {
  side?: 'left' | 'right' | 'center'
  className?: string
}) {
  return (
    <div className={classNames('title-art', `side-${side}`, className)} aria-hidden="true">
      <picture>
        <source media="(orientation: portrait)" srcSet="/art/backgrounds/title-portrait.webp" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/art/backgrounds/title.webp" alt="" fetchPriority="high" draggable={false} />
      </picture>
      <div className="veil" />
      <div className="embers">
        {EMBERS.map((ember, index) => (
          <span
            key={index}
            style={
              {
                left: `${ember.left}%`,
                width: ember.size,
                height: ember.size,
                animationDuration: `${ember.duration}s`,
                animationDelay: `${ember.delay}s`,
                '--drift': `${ember.drift}px`
              } as CSSProperties
            }
          />
        ))}
      </div>
    </div>
  )
}
