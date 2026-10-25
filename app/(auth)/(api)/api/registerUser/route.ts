import bcrypt from 'bcryptjs'
import { RegisterInput } from '@/app/(auth)/models/RegisterInput'
import { sendVerificationEmail } from '@/app/(auth)/services/tokens'
import { getLocale } from '@/app/i18n/server'
import { ApiException } from '@/app/models/ApiException'
import { User } from '@/app/models/User'
import { withApi } from '@/app/utils/api-server'
import { isValidEmail, normalizeName } from '@/app/utils/users'

const MIN_PASSWORD_LENGTH = 6

/** POST /api/registerUser — creates a player with email/password and emails the verification link (public). */
export const POST = withApi(async (request) => {
  const input = (await request.json()) as RegisterInput
  const email = String(input.email ?? '')
    .trim()
    .toLowerCase()
  const password = String(input.password ?? '')
  const name = normalizeName(String(input.name ?? ''))
  const lastName = normalizeName(String(input.lastName ?? ''))

  if (!isValidEmail(email)) {
    throw new ApiException('errors.invalidEmail')
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new ApiException('errors.passwordTooShort', 400, { min: MIN_PASSWORD_LENGTH })
  }

  if (!name) {
    throw new ApiException('errors.playerNameRequired')
  }

  if (name.length > 40) {
    throw new ApiException('errors.playerNameTooLong')
  }

  if (lastName.length > 40) {
    throw new ApiException('errors.lastNameTooLong')
  }

  const existing = await User.where('email', email).first()

  if (existing?.emailVerified) {
    throw new ApiException('errors.emailAlreadyRegistered')
  }

  // An unverified account can be registered again (e.g. the verification mail
  // expired): its data is replaced and a new link is sent.
  const user = existing ?? new User()

  user.email = email
  user.passwordHash = await bcrypt.hash(password, 10)
  user.name = name
  user.lastName = lastName
  user.emailVerified = false
  user.active = true
  user.locale = await getLocale()
  await user.save()

  await sendVerificationEmail(user, request.headers.get('host') ?? '')

  return { id: user.id }
})
