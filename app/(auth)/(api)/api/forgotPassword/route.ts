import { sendPasswordResetEmail } from '@/app/(auth)/services/tokens'
import { ApiException } from '@/app/models/ApiException'
import { User } from '@/app/models/User'
import { withApi } from '@/app/utils/api-server'

/** POST /api/forgotPassword — sends a password reset email if the account exists (public). */
export const POST = withApi(async (request) => {
  const { email: rawEmail } = (await request.json()) as { email: string }
  const email = rawEmail?.trim().toLowerCase()

  if (!email) {
    throw new ApiException('errors.emailRequired')
  }

  const user = await User.where('email', email).first()

  // Always succeed, to avoid user enumeration.
  if (!user || !user.emailVerified || !user.active) {
    return null
  }

  await sendPasswordResetEmail(user, request.headers.get('host') ?? '')

  return null
})
