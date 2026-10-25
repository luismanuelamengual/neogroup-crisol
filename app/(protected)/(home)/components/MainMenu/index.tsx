'use client'

import './index.scss'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import SoundButton from '@/app/(protected)/(art)/components/SoundButton'
import { playMusic } from '@/app/(protected)/(art)/utils/sound'
import NewGameDialog from '@/app/(protected)/(home)/components/NewGameDialog'
import { useSaves } from '@/app/(protected)/(saves)/hooks/useSaves'
import { SaveSummary } from '@/app/(protected)/(saves)/models/SaveSummary'
import { fromServer } from '@/app/(protected)/(saves)/utils/chooseSave'
import { writeLocalSave } from '@/app/(protected)/(saves)/utils/localSaves'
import { useUserStore } from '@/app/(protected)/stores/users'
import InstallAppBanner from '@/app/(pwa)/components/InstallAppBanner'
import GameButton from '@/app/components/GameButton'
import Logo from '@/app/components/Logo'
import { useI18n } from '@/app/i18n/I18nProvider'
import { formatPlayTime } from '@/app/utils/time'

/**
 * Main menu (/menu): "Continue" the saved game (disabled when there is none)
 * or start a "New game", which asks first when it would replace a saved one.
 */
export default function MainMenu({ save }: { save: SaveSummary | null }) {
  const { t, locale } = useI18n()
  const router = useRouter()
  const { newGame } = useSaves()
  const user = useUserStore((state) => state.user)
  const [confirming, setConfirming] = useState(false)
  const [starting, setStarting] = useState(false)

  useEffect(() => {
    void playMusic('menu')
  }, [])

  const startNewGame = async () => {
    setStarting(true)

    try {
      const fresh = await newGame()

      // The new game replaces the copy of the previous one in this browser.
      if (user) {
        await writeLocalSave(fromServer(user.id, fresh))
      }

      router.push('/world')
    } catch {
      // The error toast is shown by useRequests.
      setStarting(false)
      setConfirming(false)
    }
  }

  const handleNewGame = () => (save ? setConfirming(true) : startNewGame())

  return (
    <div className="main-menu">
      <InstallAppBanner />
      <section className="hero">
        <Logo size="large" />
        <p className="tagline">{t('home.tagline')}</p>
      </section>
      <nav className="actions">
        <GameButton size="large" fullWidth href="/world" disabled={!save || starting}>
          {t('home.continue')}
        </GameButton>
        {save && (
          <p className="save-summary">
            {save.cycle > 0 && <span className="cycle">{t('home.cycle', { cycle: save.cycle })}</span>}
            <span>{t('home.saveCharacters', { count: save.characters })}</span>
            <span>{t('home.saveLevel', { level: save.topLevel })}</span>
            <span>{formatPlayTime(save.playTimeSeconds, locale)}</span>
          </p>
        )}
        <GameButton size="large" color="ghost" fullWidth onClick={handleNewGame} loading={starting && !confirming}>
          {t('home.newGame')}
        </GameButton>
      </nav>
      <SoundButton className="sound" />
      <NewGameDialog
        open={confirming}
        starting={starting}
        onCancel={() => setConfirming(false)}
        onConfirm={startNewGame}
      />
    </div>
  )
}
