'use client'

import './index.scss'
import StayCurrentPortraitIcon from '@mui/icons-material/StayCurrentPortrait'
import { useEffect, useState } from 'react'
import GameButton from '@/app/components/GameButton'
import { useT } from '@/app/i18n/I18nProvider'

/** `lock()` is not in TypeScript's DOM types: Chrome and Firefox for Android have it. */
type LockableScreenOrientation = ScreenOrientation & { lock?: (orientation: 'landscape') => Promise<void> }

/**
 * The game is played in landscape on phones and tablets.
 *
 * - The Google Play app (TWA) and the installed PWA open in landscape by
 *   themselves: the manifest asks for `orientation: landscape`.
 * - In a mobile browser the orientation cannot be forced without the player's
 *   tap, so while the device is held upright a "rotate your phone" screen
 *   covers the game (pure CSS, see index.scss: it shows up before hydration and
 *   never on desktop). Where the browser supports it (Chrome and Firefox for
 *   Android) a button goes full screen and locks the landscape orientation;
 *   on iPhone the player just rotates the phone.
 */
export default function OrientationGuard() {
  const t = useT()
  const [canLock, setCanLock] = useState(false)

  useEffect(() => {
    const orientation = screen.orientation as LockableScreenOrientation | undefined

    setCanLock(Boolean(orientation?.lock) && typeof document.documentElement.requestFullscreen === 'function')
  }, [])

  const playInLandscape = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen({ navigationUI: 'hide' })
      }

      await (screen.orientation as LockableScreenOrientation).lock?.('landscape')
    } catch {
      // Refused by the browser: the player can still rotate the phone by hand.
    }
  }

  return (
    <div className="orientation-guard" role="dialog" aria-modal="true" aria-labelledby="orientation-guard-title">
      <StayCurrentPortraitIcon className="orientation-guard-icon" />
      <h2 id="orientation-guard-title" className="orientation-guard-title">
        {t('orientation.title')}
      </h2>
      <p className="orientation-guard-text">{t('orientation.text')}</p>
      {canLock && (
        <GameButton color="gold" size="large" onClick={playInLandscape}>
          {t('orientation.lock')}
        </GameButton>
      )}
    </div>
  )
}
