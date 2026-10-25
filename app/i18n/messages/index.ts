import { Locale } from '@/app/i18n/config'
import { en } from '@/app/i18n/messages/en'
import { es, Messages } from '@/app/i18n/messages/es'

type Leaf = string | { one: string; other: string }

type Paths<T, Prefix extends string = ''> = {
  [K in keyof T & string]: T[K] extends Leaf ? `${Prefix}${K}` : Paths<T[K], `${Prefix}${K}.`>
}[keyof T & string]

/** Dotted path of a message of the dictionaries, e.g. "errors.gameNotFound". */
export type MessageKey = Paths<Messages>

export type { Messages }

const DICTIONARIES: Record<Locale, Messages> = { es, en }

export function getMessages(locale: Locale): Messages {
  return DICTIONARIES[locale]
}
