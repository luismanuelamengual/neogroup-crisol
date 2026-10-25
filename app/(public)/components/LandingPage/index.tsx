import './index.scss'
import Link from 'next/link'
import GameButton from '@/app/components/GameButton'
import GamePanel from '@/app/components/GamePanel'
import Logo from '@/app/components/Logo'
import { getT } from '@/app/i18n/server'

const STEPS = [
  { icon: '🗺️', titleKey: 'landing.steps.explore.title', textKey: 'landing.steps.explore.text' },
  { icon: '⚔️', titleKey: 'landing.steps.fight.title', textKey: 'landing.steps.fight.text' },
  { icon: '🔥', titleKey: 'landing.steps.rise.title', textKey: 'landing.steps.rise.text' }
] as const

/** Public landing page (signed-out visitors). */
export default async function LandingPage() {
  const t = await getT()

  return (
    <main className="landing-page">
      <section className="hero">
        <Logo size="large" className="logo" />
        <p className="tagline">{t('landing.tagline')}</p>
        <div className="actions">
          <GameButton size="large" href="/login">
            {t('landing.playFree')}
          </GameButton>
        </div>
      </section>
      <section className="steps">
        {STEPS.map((step, index) => (
          <GamePanel
            key={step.titleKey}
            className="step"
            title={`${index + 1}. ${t(step.titleKey)}`}
            accent={index === 1 ? 'magenta' : index === 2 ? 'lime' : 'cyan'}
          >
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
