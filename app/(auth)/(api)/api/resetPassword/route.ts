import bcrypt from 'bcryptjs'
import { PasswordResetToken } from '@/app/(auth)/models/PasswordResetToken'
import { ApiException } from '@/app/models/ApiException'
import { User } from '@/app/models/User'
import { withApi } from '@/app/utils/api-server'

/** POST /api/resetPassword — validates a reset token and updates the user password (public). */
export const POST = withApi(async (request) => {
  const { token, password } = (await request.json()) as { token: string; password: string }

  if (!token || !password) {
    throw new ApiException('errors.fillAllFields')
  }

  if (password.length < 6) {
    throw new ApiException('errors.passwordTooShort', 400, { min: 6 })
  }

  const record = await PasswordResetToken.where('token', token).first()

  if (!record) {
    throw new ApiException('errors.linkInvalidOrUsed')
  }

  if (new Date() > record.expiresAt) {
    await record.delete()
    throw new ApiException('errors.linkExpired')
  }

  const user = await User.find(record.userId)

  if (!user) {
    throw new ApiException('errors.linkInvalidOrUsed')
  }

  user.passwordHash = await bcrypt.hash(password, 10)
  await user.save()
  await record.delete()

  return null
})
