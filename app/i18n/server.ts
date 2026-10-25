import { cache } from 'react'
import { auth } from '@/app/(auth)/services/auth'
import { isLocale, Locale } from '@/app/i18n/config'
import { detectLocale } from '@/app/i18n/detect'
import { createTranslator, Translator } from '@/app/i18n/translate'

/**
 * Language of the current request: the one saved in the signed-in user (kept
 * in its session), otherwise the detected one (see detectLocale).
 */
export const getLocale = cache(async (): Promise<Locale> => {
  const session = await auth()

  if (isLocale(session?.user?.locale)) {
    return session.user.locale
  }

  return detectLocale()
})

/** Translator of the current request, for server components and route handlers. */
export async function getT(): Promise<Translator> {
  return createTranslator(await getLocale())
}
