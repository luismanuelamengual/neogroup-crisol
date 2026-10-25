import { useCallback } from 'react'
import { useNotifications } from '@/app/hooks/useNotifications'
import type { MessageKey } from '@/app/i18n/messages'
import type { ApiError } from '@/app/models/ApiError'
import { ApiResponse } from '@/app/models/ApiResponse'

/**
 * Returns `executeRequest<T>(url, payload)`: posts `payload` as JSON to
 * `/api${url}` and resolves with the response `data`, or throws an Error whose
 * message is the server's error message (shown as a toast unless `notifyError`
 * is false).
 */
export function useRequests() {
  const { showErrorMessage } = useNotifications()
  const executeRequest = useCallback(
    async <T>(url: string, payload: unknown = {}, notifyError = true): Promise<T> => {
      const response = await fetch(`/api${url}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const result = (await response.json()) as ApiResponse<T>

      if (!result.success) {
        const error: ApiError = new Error(result.error?.message ?? 'internalError')

        error.key = result.error?.key as MessageKey | undefined

        if (notifyError) {
          showErrorMessage(error.message)
        }

        throw error
      }

      return result.data as T
    },
    [showErrorMessage]
  )

  return executeRequest
}
