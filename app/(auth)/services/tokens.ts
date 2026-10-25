import { randomBytes } from 'crypto'
import { EmailVerificationToken } from '@/app/(auth)/models/EmailVerificationToken'
import { PasswordResetToken } from '@/app/(auth)/models/PasswordResetToken'
import { DEFAULT_LOCALE, isLocale } from '@/app/i18n/config'
import { createTranslator, Translator } from '@/app/i18n/translate'
import { User } from '@/app/models/User'
import { renderActionEmail, sendEmail } from '@/app/utils/email'
import { resolveAppUrl } from '@/app/utils/urls'
import { getUserDisplayName } from '@/app/utils/users'

const VERIFICATION_TOKEN_EXPIRY_HOURS = 24
const RESET_TOKEN_EXPIRY_HOURS = 1

function createToken(): string {
  return randomBytes(32).toString('hex')
}

/** Translator of the language the user chose (emails are sent in it, not in the one of the request). */
function translatorOf(user: User): Translator {
  return createTranslator(isLocale(user.locale) ? user.locale : DEFAULT_LOCALE)
}

function hoursFromNow(hours: number): Date {
  return new Date(Date.now() + hours * 60 * 60 * 1000)
}

/**
 * Issues a fresh email verification token for `user` (invalidating any
 * previous one) and emails them the activation link.
 */
export async function sendVerificationEmail(user: User, host: string): Promise<void> {
  for (const previousToken of await EmailVerificationToken.where('userId', user.id).get()) {
    await previousToken.delete()
  }

  const token = new EmailVerificationToken()

  token.userId = user.id
  token.token = createToken()
  token.expiresAt = hoursFromNow(VERIFICATION_TOKEN_EXPIRY_HOURS)
  await token.save()

  const t = translatorOf(user)

  await sendEmail({
    to: user.email,
    subject: t('auth.emails.verifySubject'),
    html: renderActionEmail({
      title: t('auth.emails.greeting', { name: getUserDisplayName(user) }),
      intro: t('auth.emails.verifyIntro'),
      actionLabel: t('auth.emails.verifyAction'),
      actionUrl: `${resolveAppUrl(host)}/api/verifyEmail?token=${token.token}`,
      footer: t('auth.emails.verifyFooter', { hours: VERIFICATION_TOKEN_EXPIRY_HOURS })
    })
  })
}

/**
 * Issues a fresh password reset token for `user` (only one valid at a time)
 * and emails them the link to set a new password.
 */
export async function sendPasswordResetEmail(user: User, host: string): Promise<void> {
  for (const previousToken of await PasswordResetToken.where('userId', user.id).get()) {
    await previousToken.delete()
  }

  const token = new PasswordResetToken()

  token.userId = user.id
  token.token = createToken()
  token.expiresAt = hoursFromNow(RESET_TOKEN_EXPIRY_HOURS)
  await token.save()

  const t = translatorOf(user)

  await sendEmail({
    to: user.email,
    subject: t('auth.emails.resetSubject'),
    html: renderActionEmail({
      title: t('auth.emails.greeting', { name: getUserDisplayName(user) }),
      intro: t('auth.emails.resetIntro'),
      actionLabel: t('auth.emails.resetAction'),
      actionUrl: `${resolveAppUrl(host)}/reset-password?token=${token.token}`,
      footer: t('auth.emails.resetFooter', { hours: RESET_TOKEN_EXPIRY_HOURS })
    })
  })
}
