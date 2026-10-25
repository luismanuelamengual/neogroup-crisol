import { signOut } from '@/app/(auth)/services/auth'
import { deleteAccount } from '@/app/(protected)/(account)/services/accounts'
import { withAuth } from '@/app/utils/api-server'

/** POST /api/deleteAccount — deletes the signed-in user's account and all its data, and signs it out. */
export const POST = withAuth(async (_request, _context, userId) => {
  await deleteAccount(userId)
  await signOut({ redirect: false })
})
