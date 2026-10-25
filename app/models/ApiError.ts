import type { MessageKey } from '@/app/i18n/messages'

/** Error thrown by executeRequest: `message` is already translated, `key` identifies it (see ApiException). */
export type ApiError = Error & { key?: MessageKey }
