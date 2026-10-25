'use client'

import { createContext, ReactNode, useContext, useMemo } from 'react'
import { Locale } from '@/app/i18n/config'
import { createTranslator, Translator } from '@/app/i18n/translate'

interface I18nContextValue {
  locale: Locale
  t: Translator
}

const I18nContext = createContext<I18nContextValue | null>(null)

/** Gives the client components the language chosen on the server (see getLocale). */
export default function I18nProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  const value = useMemo<I18nContextValue>(() => ({ locale, t: createTranslator(locale) }), [locale])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

/** `{ t, locale }` of the current language. */
export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext)

  if (!context) {
    throw new Error('useI18n must be used inside <I18nProvider>')
  }

  return context
}

/** Shortcut for `useI18n().t`. */
export function useT(): Translator {
  return useI18n().t
}
