import type { Locale } from '@/app/i18n/config'

/** Payload of /api/updateAccount: the fields to change (at least one). */
export interface AccountInput {
  name?: string
  /** '' clears it. */
  lastName?: string
  /** '' clears it (the name and last name are shown again). */
  nickname?: string
  locale?: Locale
}
