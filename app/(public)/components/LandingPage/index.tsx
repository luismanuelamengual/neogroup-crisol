import './index.scss'
import Link from 'next/link'
import GameButton from '@/app/components/GameButton'
import GamePanel from '@/app/components/GamePanel'
import Logo from '@/app/components/Logo'
import TitleArt from '@/app/components/TitleArt'
import { getT } from '@/app/i18n/server'

const STEPS = [
  { icon: '🗺️', titleKey: 'landing.steps.explore.title', textKey: 'landing.steps.explore.text' },
  { icon: '⚔️', titleKey: 'landing.steps.fight.title', textKey: 'landing.steps.fight.text' },
  { icon: '🔥', titleKey: 'landing.steps.rise.title', textKey: 'landing.steps.rise.text' }
] as const

/**
 * Public landing page (signed-out visitors): the key art of the game behind
 * (fixed, the page scrolls over it), the logo and the call to play filling the
 * first screen, and the three steps below, over a veil that darkens the art.
 */
export default async function LandingPage() {
  const t = await getT()

  return (
    <main className="landing-page">
      <TitleArt side="center" />
      <section className="hero">
        <Logo size="large" className="logo" />
        <p className="tagline">{t('landing.tagline')}</p>
        <div className="actions">
          <GameButton size="large" href="/login">
            {t('landing.playFree')}
          </GameButton>
        </div>
        <span className="scroll-hint" aria-hidden="true" />
      </section>
      <section className="steps">
        {STEPS.map((step, index) => (
          <GamePanel key={step.titleKey} className="step" title={`${index + 1}. ${t(step.titleKey)}`}>
            <div className="icon">{step.icon}</div>
            <p>{t(step.textKey)}</p>
          </GamePanel>
        ))}
      </section>
      <footer className="footer">
        <Link href="/privacy" className="privacy-link">
          {t('legal.privacyLink')}
        </Link>
      </footer>
    </main>
  )
}
