import { create } from 'zustand'
import { SessionUser } from '@/app/(protected)/models/SessionUser'

/**
 * Store with the signed-in user, hydrated from the session by
 * UserStoreHydrator (rendered by the protected layout), so any client
 * component can read it without prop drilling.
 */
interface UserState {
  user: SessionUser | null
  setUser: (user: SessionUser | null) => void
}

export const useUserStore = create<UserState>()((set) => ({
  user: null,
  setUser: (user) => set({ user })
}))
