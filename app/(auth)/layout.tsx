import './layout.scss'
import Link from 'next/link'
import { ReactNode } from 'react'
import GamePanel from '@/app/components/GamePanel'
import Logo from '@/app/components/Logo'

/** Shared layout for every non authenticated page: the logo over a framed game panel. */
export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="auth-layout">
      <Link href="/" className="brand">
        <Logo size="medium" />
      </Link>
      <GamePanel className="card">{children}</GamePanel>
    </div>
  )
}
