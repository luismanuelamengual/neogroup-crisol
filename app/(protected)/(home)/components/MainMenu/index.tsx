'use client'

import './index.scss'
import { useRouter } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { useEffect, useMemo, useState } from 'react'
import SoundButton from '@/app/(protected)/(art)/components/SoundButton'
import { playMusic } from '@/app/(protected)/(art)/utils/sound'
import NewGameDialog from '@/app/(protected)/(home)/components/NewGameDialog'
import { useSaves } from '@/app/(protected)/(saves)/hooks/useSaves'
import { LocalSave } from '@/app/(protected)/(saves)/models/LocalSave'
import { SaveSummary } from '@/app/(protected)/(saves)/models/SaveSummary'
import { fromServer, isNewer } from '@/app/(protected)/(saves)/utils/chooseSave'
import { writeLocalSave } from '@/app/(protected)/(saves)/utils/localSaves'
import { summarizeSave } from '@/app/(protected)/(saves)/utils/saveSummary'
import { syncLocalSave } from '@/app/(protected)/(saves)/utils/syncLocalSave'
import { useUserStore } from '@/app/(protected)/stores/users'
import InstallAppBanner from '@/app/(pwa)/components/InstallAppBanner'
import { clearCachedPages } from '@/app/(pwa)/utils/offlinePages'
import CommandMenu from '@/app/components/CommandMenu'
import Logo from '@/app/components/Logo'
import TitleArt from '@/app/components/TitleArt'
import { useNotifications } from '@/app/hooks/useNotifications'
import { useI18n } from '@/app/i18n/I18nProvider'
import { formatPlayTime } from '@/app/utils/time'
import { formatBuiltAt, versionLabel } from '@/app/utils/version'

/**
 * Main menu (/menu), the title screen: "Continue" the saved game (disabled when
 * there is none), start a "New game" (which asks first when it would replace a
 * saved one), the player's profile and sign out. The version of the running
 * build sits at the bottom, to tell whether a new deploy has been picked up.
 * The key art fills the screen and the menu sits on its right, sized to fit
 * the height of the display (phones in landscape included) without scrolling.
 *
 * The game played offline is kept in this browser (see syncLocalSave): the
 * menu shows that copy when it is newer than the server save (offline the page
 * itself comes from the service worker cache, with the summary it had then)
 * and uploads it as soon as there is a connection.
 */
export default function MainMenu({ save }: { save: SaveSummary | null }) {
  const { t, locale } = useI18n()
  const router = useRouter()
  const { loadGame, newGame, saveGame } = useSaves()
  const { showWarningMessage } = useNotifications()
  const user = useUserStore((state) => state.user)
  const [local, setLocal] = useState<LocalSave | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [starting, setStarting] = useState(false)
  // Formatted after mount: the build time renders in the device's time zone,
  // which the server doesn't know, so doing it on the first render would
  // mismatch the server HTML.
  const [builtAt, setBuiltAt] = useState('')

  useEffect(() => {
    void playMusic('menu')
  }, [])

  useEffect(() => {
    setBuiltAt(formatBuiltAt(locale))
  }, [locale])

  // Uploads the game played offline, now and whenever the connection comes back.
  useEffect(() => {
    if (!user) {
      return
    }

    let active = true

    const sync = async () => {
      const { save: synced, discarded } = await syncLocalSave(user.id, { loadGame, saveGame })

      if (!active) {
        return
      }

      setLocal(synced)

      if (discarded) {
        showWarningMessage(t(discarded === 'local' ? 'world.sync.localDiscarded' : 'world.sync.serverDiscarded'), 8000)
      }
    }

    void sync()
    window.addEventListener('online', sync)

    return () => {
      active = false
      window.removeEventListener('online', sync)
    }
  }, [loadGame, saveGame, showWarningMessage, t, user])

  // The copy in this browser when it has changes the server does not have (or is newer than the summary of the page).
  const localIsShown = !!local && (local.dirty || !save || isNewer(local.updatedAt, save.updatedAt))
  const shown = useMemo(
    () => (local && localIsShown ? summarizeSave(local.state, local.playTimeSeconds, local.updatedAt ?? '') : save),
    [local, localIsShown, save]
  )
  const pending = localIsShown && !!local?.dirty

  const startNewGame = async () => {
    setStarting(true)

    try {
      const fresh = await newGame()

      // The new game replaces the copy of the previous one in this browser.
      if (user) {
        await writeLocalSave(fromServer(user.id, fresh))
      }

      setLocal(null)

      router.push('/world')
    } catch {
      // The error toast is shown by useRequests.
      setStarting(false)
      setConfirming(false)
    }
  }

  const logout = async () => {
    // The pages kept for offline play show this account: forget them.
    await clearCachedPages()
    await signOut({ redirectTo: '/login' })
  }

  const handleNewGame = () => (shown ? setConfirming(true) : startNewGame())

  return (
    <div className="main-menu">
      <TitleArt />
      <div className="install">
        <InstallAppBanner />
      </div>
      <div className="column">
        <section className="hero">
          <Logo size="large" />
          <p className="tagline">{t('home.tagline')}</p>
        </section>
        <CommandMenu
          className="actions"
          aria-label={t('metadata.mainMenu')}
          items={[
            {
              key: 'continue',
              label: t('home.continue'),
              href: '/world',
              disabled: !shown || starting,
              detail: shown && (
                <>
                  {shown.cycle > 0 && <span className="cycle">{t('home.cycle', { cycle: shown.cycle })} · </span>}
                  {t('home.saveCharacters', { count: shown.characters })} ·{' '}
                  {t('home.saveLevel', { level: shown.topLevel })} · {formatPlayTime(shown.playTimeSeconds, locale)}
                  {pending && (
                    <span className="pending" title={t('home.savePending')}>
                      {' '}
                      · {t('home.savePendingShort')}
                    </span>
                  )}
                </>
              )
            },
            { key: 'new', label: t('home.newGame'), onClick: handleNewGame, loading: starting && !confirming },
            { key: 'profile', label: t('nav.myProfile'), href: '/account' },
            { key: 'logout', label: t('nav.logout'), onClick: logout }
          ]}
        />
        <footer className="footer">
          {user && <p className="player">{user.displayName}</p>}
          <SoundButton className="sound" />
        </footer>
      </div>
      <p className="version">
        {versionLabel}
        {builtAt && <span className="built-at"> · {builtAt}</span>}
      </p>
      <NewGameDialog
        open={confirming}
        starting={starting}
        onCancel={() => setConfirming(false)}
        onConfirm={startNewGame}
      />
    </div>
  )
}
