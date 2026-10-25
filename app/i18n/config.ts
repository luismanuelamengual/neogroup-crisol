/** Languages supported by the app. Add a new one here and create its dictionary under ./messages. */
export const LOCALES = ['es', 'en'] as const

export type Locale = (typeof LOCALES)[number]

export const DEFAULT_LOCALE: Locale = 'en'

/** Cookie that remembers the language of the visitor (and of the signed-in user, for the pages rendered before login). */
export const LOCALE_COOKIE = 'locale'

/** Name of each language, written in the language itself (shown in the language selector). */
export const LOCALE_NAMES: Record<Locale, string> = {
  es: 'Español',
  en: 'English'
}

/** Flag emoji shown next to each language in the language selector. */
export const LOCALE_FLAGS: Record<Locale, string> = {
  es: '🇪🇸',
  en: '🇬🇧'
}

/** BCP 47 tag used by Intl (dates, numbers) for each language. */
export const LOCALE_TAGS: Record<Locale, string> = {
  es: 'es-AR',
  en: 'en-US'
}

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value)
}

/** Picks the best supported language of an Accept-Language header, or null when none matches. */
export function matchLocale(acceptLanguage: string | null | undefined): Locale | null {
  if (!acceptLanguage) {
    return null
  }

  const requested = acceptLanguage
    .split(',')
    .map((part) => {
      const [tag, quality] = part.trim().split(';q=')

      return { language: (tag ?? '').toLowerCase().split('-')[0] ?? '', quality: quality ? Number(quality) : 1 }
    })
    .sort((a, b) => b.quality - a.quality)

  for (const { language } of requested) {
    if (isLocale(language)) {
      return language
    }
  }

  return null
}
