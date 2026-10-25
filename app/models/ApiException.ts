import type { MessageKey } from '@/app/i18n/messages'
import { createTranslator, TranslationParams } from '@/app/i18n/translate'

/**
 * Error to be thrown inside API handlers. `messageKey` identifies the message in
 * the dictionaries (app/i18n/messages): the response sends it translated to the
 * language of the request (see withApi). `message` is the Spanish text, the
 * default language, used in logs and tests. `status` is the HTTP status of the response.
 */
export class ApiException extends Error {
  constructor(
    public messageKey: MessageKey,
    public status = 400,
    public params?: TranslationParams
  ) {
    super(createTranslator('es')(messageKey, params))
    this.name = 'ApiException'
  }
}
