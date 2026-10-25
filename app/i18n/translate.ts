import { DEFAULT_LOCALE, Locale } from '@/app/i18n/config'
import type { MessageKey } from '@/app/i18n/messages'
import { getMessages } from '@/app/i18n/messages'

export type TranslationParams = Record<string, string | number>

export type Translator = (key: MessageKey, params?: TranslationParams) => string

interface PluralMessage {
  one: string
  other: string
}

function resolve(messages: unknown, key: string): string | PluralMessage | undefined {
  let current: unknown = messages

  for (const part of key.split('.')) {
    if (typeof current !== 'object' || current === null) {
      return undefined
    }

    current = (current as Record<string, unknown>)[part]
  }

  if (typeof current === 'string') {
    return current
  }

  if (typeof current === 'object' && current !== null && 'other' in current) {
    return current as PluralMessage
  }

  return undefined
}

/**
 * Returns the translation function of a language. `{name}` placeholders are
 * replaced with `params`; a message written as `{ one, other }` is a plural
 * form chosen with `params.count`. A key missing from the language falls back
 * to the default one, and finally to the key itself.
 */
export function createTranslator(locale: Locale): Translator {
  const rules = new Intl.PluralRules(locale)

  return (key, params) => {
    const message = resolve(getMessages(locale), key) ?? resolve(getMessages(DEFAULT_LOCALE), key)

    if (message === undefined) {
      return key
    }

    const template =
      typeof message === 'string'
        ? message
        : rules.select(Number(params?.count ?? 0)) === 'one'
          ? message.one
          : message.other

    return template.replace(/\{(\w+)\}/g, (placeholder, name: string) =>
      params && name in params ? String(params[name]) : placeholder
    )
  }
}
