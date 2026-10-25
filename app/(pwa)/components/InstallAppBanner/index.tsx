'use client'

import './index.scss'
import CloseIcon from '@mui/icons-material/Close'
import GetAppIcon from '@mui/icons-material/GetApp'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import { useEffect, useState } from 'react'
import { useInstallPrompt } from '@/app/hooks/useInstallPrompt'
import { useT } from '@/app/i18n/I18nProvider'

const DISMISSED_UNTIL_STORAGE_KEY = 'installBanner:dismissedUntil'
const DISMISS_DURATION_MS = 24 * 60 * 60 * 1000

/**
 * Main menu banner offering to install the PWA when the browser has fired
 * `beforeinstallprompt` (see `useInstallPrompt`).
 *
 * Dismissal is remembered in localStorage as an expiry timestamp, so closing
 * it hides it for a day rather than for good — it comes back the next day
 * (or sooner, on another device/browser) as long as the app stays installable.
 */
export default function InstallAppBanner() {
  const t = useT()
  const { canInstall, promptInstall } = useInstallPrompt()
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const dismissedUntil = Number(window.localStorage.getItem(DISMISSED_UNTIL_STORAGE_KEY))

    setDismissed(Boolean(dismissedUntil) && dismissedUntil > Date.now())
  }, [])

  if (!canInstall || dismissed) {
    return null
  }

  const dismiss = () => {
    try {
      window.localStorage.setItem(DISMISSED_UNTIL_STORAGE_KEY, String(Date.now() + DISMISS_DURATION_MS))
    } catch {
      // Ignore write errors (e.g. storage disabled/full).
    }

    setDismissed(true)
  }

  return (
    <Alert
      className="install-alert-banner"
      severity="info"
      icon={<GetAppIcon fontSize="inherit" />}
      action={
        <div className="install-actions">
          <Button className="install-button" color="secondary" variant="contained" size="small" onClick={promptInstall}>
            {t('pwa.install')}
          </Button>
          <IconButton
            className="install-close"
            color="inherit"
            size="small"
            onClick={dismiss}
            aria-label={t('common.close')}
          >
            <CloseIcon fontSize="inherit" />
          </IconButton>
        </div>
      }
    >
      {t('pwa.installPrompt')}
    </Alert>
  )
}
