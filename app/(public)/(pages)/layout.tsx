import './layout.scss'
import Link from 'next/link'
import { ReactNode } from 'react'
import GamePanel from '@/app/components/GamePanel'
import Logo from '@/app/components/Logo'

/** Layout of the public pages that are read rather than played (privacy policy, account deletion). */
export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="legal-layout">
      <Link href="/" className="brand">
        <Logo size="medium" />
      </Link>
      <GamePanel className="card">{children}</GamePanel>
    </div>
  )
}
