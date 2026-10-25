'use client'

import { useCallback } from 'react'
import { RegisterInput } from '@/app/(auth)/models/RegisterInput'
import { useRequests } from '@/app/hooks/useRequests'

export function useAuth() {
  const executeRequest = useRequests()
  const registerUser = useCallback(
    (input: RegisterInput): Promise<{ id: number }> => executeRequest<{ id: number }>('/registerUser', input, false),
    [executeRequest]
  )
  const requestPasswordReset = useCallback(
    (email: string): Promise<null> => executeRequest<null>('/forgotPassword', { email }, false),
    [executeRequest]
  )
  const resetPassword = useCallback(
    (token: string, password: string): Promise<null> =>
      executeRequest<null>('/resetPassword', { token, password }, false),
    [executeRequest]
  )

  return { registerUser, requestPasswordReset, resetPassword }
}
