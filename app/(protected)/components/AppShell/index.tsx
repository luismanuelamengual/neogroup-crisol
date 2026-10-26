'use client'

import './index.scss'
import { useRouter } from 'next/navigation'
import { getSession } from 'next-auth/react'
import { ReactNode, useEffect } from 'react'

/**
 * Shell of every authenticated page. There is no app bar: like a console game,
 * each screen takes the whole display and the main menu holds the profile and
 * sign out.
 */
export default function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter()

  // Coming back to an installed PWA after the session expired: go to login.
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && !(await getSession())) {
        router.push('/login')
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [router])

  return (
    <div className="app-shell">
      <main className="content">{children}</main>
    </div>
  )
}
