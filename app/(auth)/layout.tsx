import './layout.scss'
import Link from 'next/link'
import { ReactNode } from 'react'
import GamePanel from '@/app/components/GamePanel'
import Logo from '@/app/components/Logo'
import TitleArt from '@/app/components/TitleArt'
import { getT } from '@/app/i18n/server'

/**
 * Shared layout for every non authenticated page: the key art of the game
 * behind and, in the middle, the logo over a small framed game panel.
 */
export default async function Layout({ children }: { children: ReactNode }) {
  const t = await getT()

  return (
    <div className="auth-layout">
      <TitleArt side="center" />
      <div className="column">
        <Link href="/" className="brand">
          <Logo size="medium" />
        </Link>
        <p className="tagline">{t('home.tagline')}</p>
        <GamePanel className="card">{children}</GamePanel>
      </div>
    </div>
  )
}
