import { Locale, LOCALE_TAGS } from '@/app/i18n/config'

/** Play time as hours and minutes, e.g. "12 h 05 min" (minutes alone under an hour: "7 min"). */
export function formatPlayTime(seconds: number, locale: Locale): string {
  const totalMinutes = Math.floor(Math.max(0, seconds) / 60)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  const format = (value: number, minimumIntegerDigits = 1) =>
    value.toLocaleString(LOCALE_TAGS[locale], { minimumIntegerDigits })

  return hours > 0 ? `${format(hours)} h ${format(minutes, 2)} min` : `${format(minutes)} min`
}
