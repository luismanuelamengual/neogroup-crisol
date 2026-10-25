import { describe, expect, it } from 'vitest'
import { DEFAULT_LOCALE, isLocale, LOCALES, matchLocale } from '@/app/i18n/config'
import { getMessages } from '@/app/i18n/messages'
import { createTranslator } from '@/app/i18n/translate'
import { formatPlayTime } from '@/app/utils/time'

/** Dotted paths of every message of a dictionary (plural messages are leaves). */
function collectKeys(node: unknown, prefix = ''): string[] {
  if (typeof node === 'string') {
    return [prefix]
  }

  const record = node as Record<string, unknown>

  if ('other' in record && typeof record.other === 'string') {
    return [prefix]
  }

  return Object.entries(record).flatMap(([key, value]) => collectKeys(value, prefix ? `${prefix}.${key}` : key))
}

describe('dictionaries', () => {
  it('have the same keys in every language', () => {
    const reference = collectKeys(getMessages(DEFAULT_LOCALE)).sort()

    for (const locale of LOCALES) {
      expect(collectKeys(getMessages(locale)).sort(), locale).toEqual(reference)
    }
  })

  it('use the same placeholders in every language', () => {
    const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort()
    const es = createTranslator('es')
    const en = createTranslator('en')

    for (const key of collectKeys(getMessages('es'))) {
      const params = { count: 2 }
      const spanish = es(key as never, params)
      const english = en(key as never, params)

      expect(placeholders(english), key).toEqual(placeholders(spanish))
    }
  })
})

describe('translator', () => {
  it('replaces placeholders', () => {
    expect(createTranslator('en')('home.saveLevel', { level: 7 })).toBe('Level 7')
    expect(createTranslator('es')('home.saveLevel', { level: 7 })).toBe('Nivel 7')
  })

  it('chooses the plural form with count', () => {
    expect(createTranslator('en')('home.saveCharacters', { count: 1 })).toBe('1 character')
    expect(createTranslator('en')('home.saveCharacters', { count: 5 })).toBe('5 characters')
    expect(createTranslator('es')('home.saveCharacters', { count: 1 })).toBe('1 personaje')
    expect(createTranslator('es')('home.saveCharacters', { count: 5 })).toBe('5 personajes')
  })

  it('returns the key of an unknown message', () => {
    expect(createTranslator('en')('nope.missing' as never)).toBe('nope.missing')
  })
})

describe('languages', () => {
  it('recognizes the supported ones', () => {
    expect(isLocale('es')).toBe(true)
    expect(isLocale('en')).toBe(true)
    expect(isLocale('fr')).toBe(false)
    expect(isLocale(null)).toBe(false)
  })

  it('matches the Accept-Language header', () => {
    expect(matchLocale('en-US,en;q=0.9,es;q=0.8')).toBe('en')
    expect(matchLocale('es-AR,es;q=0.9')).toBe('es')
    expect(matchLocale('fr-FR,fr;q=0.9,en;q=0.5')).toBe('en')
    expect(matchLocale('fr-FR')).toBeNull()
    expect(matchLocale(null)).toBeNull()
  })
})

describe('localized formats', () => {
  it('writes the play time with the separators of the language', () => {
    expect(formatPlayTime(0, 'en')).toBe('0 min')
    expect(formatPlayTime(7 * 60 + 59, 'es')).toBe('7 min')
    expect(formatPlayTime(12 * 3600 + 5 * 60, 'en')).toBe('12 h 05 min')
    expect(formatPlayTime(1234 * 3600, 'en')).toBe('1,234 h 00 min')
    expect(formatPlayTime(1234 * 3600, 'es')).toBe('1.234 h 00 min')
  })
})
