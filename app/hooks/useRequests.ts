import { useCallback } from 'react'
import { useNotifications } from '@/app/hooks/useNotifications'
import { useT } from '@/app/i18n/I18nProvider'
import type { MessageKey } from '@/app/i18n/messages'
import type { ApiError } from '@/app/models/ApiError'
import { ApiResponse } from '@/app/models/ApiResponse'

/** How long a request waits for the server before failing as offline (a weak signal can hang for minutes). */
const REQUEST_TIMEOUT_MS = 15_000

/**
 * Returns `executeRequest<T>(url, payload)`: posts `payload` as JSON to
 * `/api${url}` and resolves with the response `data`, or throws an Error whose
 * message is the server's error message (shown as a toast unless `notifyError`
 * is false). Without network (or when the server does not answer in time) the
 * error has the key `errors.offline`.
 */
export function useRequests() {
  const t = useT()
  const { showErrorMessage } = useNotifications()
  const executeRequest = useCallback(
    async <T>(url: string, payload: unknown = {}, notifyError = true): Promise<T> => {
      const fail = (message: string, key?: MessageKey): never => {
        const error: ApiError = new Error(message)

        error.key = key

        if (notifyError) {
          showErrorMessage(error.message)
        }

        throw error
      }

      let result: ApiResponse<T>

      try {
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          throw new Error('offline')
        }

        const response = await fetch(`/api${url}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
        })

        result = (await response.json()) as ApiResponse<T>
      } catch {
        return fail(t('errors.offline'), 'errors.offline')
      }

      if (!result.success) {
        return fail(result.error?.message ?? 'internalError', result.error?.key as MessageKey | undefined)
      }

      return result.data as T
    },
    [showErrorMessage, t]
  )

  return executeRequest
}
