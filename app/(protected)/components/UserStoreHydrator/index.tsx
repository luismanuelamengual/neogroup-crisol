'use client'

import { useEffect } from 'react'
import { SessionUser } from '@/app/(protected)/models/SessionUser'
import { useUserStore } from '@/app/(protected)/stores/users'

/**
 * Hydrates the user store with the session user resolved on the server. Filled
 * synchronously on the very first render (so nothing flickers) and through an
 * effect afterwards (setState during render with subscribers mounted throws).
 */
export default function UserStoreHydrator({ user }: { user: SessionUser | null }) {
  // Only in the browser: on the server the store is a module singleton shared by
  // every request, so writing to it during SSR would leak users across requests.
  if (typeof window !== 'undefined' && user && !useUserStore.getState().user) {
    useUserStore.setState({ user })
  }

  useEffect(() => {
    useUserStore.setState({ user })
  }, [user])

  return null
}
