import { cookies, headers } from 'next/headers'
import { DEFAULT_LOCALE, isLocale, Locale, LOCALE_COOKIE, matchLocale } from '@/app/i18n/config'

/**
 * Language of the visitor when it has not chosen one in its profile: the
 * cookie, otherwise the browser language, otherwise the default one. Falls back
 * to the default language outside of a request.
 */
export async function detectLocale(): Promise<Locale> {
  try {
    const cookieLocale = (await cookies()).get(LOCALE_COOKIE)?.value

    if (isLocale(cookieLocale)) {
      return cookieLocale
    }

    return matchLocale((await headers()).get('accept-language')) ?? DEFAULT_LOCALE
  } catch {
    return DEFAULT_LOCALE
  }
}
