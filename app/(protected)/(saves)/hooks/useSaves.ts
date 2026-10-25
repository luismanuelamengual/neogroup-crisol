'use client'

import { useCallback } from 'react'
import { LoadedSave } from '@/app/(protected)/(saves)/models/LoadedSave'
import { SaveGameInput } from '@/app/(protected)/(saves)/models/SaveGameInput'
import { SaveSummary } from '@/app/(protected)/(saves)/models/SaveSummary'
import { useRequests } from '@/app/hooks/useRequests'

export function useSaves() {
  const executeRequest = useRequests()
  const getSaveSummary = useCallback(() => executeRequest<SaveSummary | null>('/getSaveSummary'), [executeRequest])
  const loadGame = useCallback(
    (notifyError = true) => executeRequest<LoadedSave>('/loadGame', {}, notifyError),
    [executeRequest]
  )
  const newGame = useCallback(() => executeRequest<LoadedSave>('/newGame'), [executeRequest])
  const saveGame = useCallback(
    (input: SaveGameInput, notifyError = true) => executeRequest<LoadedSave>('/saveGame', input, notifyError),
    [executeRequest]
  )

  return { getSaveSummary, loadGame, newGame, saveGame }
}
