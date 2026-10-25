import { describe, expect, it } from 'vitest'
import { createInitialGameState, SAVE_VERSION } from '@/app/(protected)/(engine)/utils/gameState'
import { LoadedSave } from '@/app/(protected)/(saves)/models/LoadedSave'
import { LocalSave } from '@/app/(protected)/(saves)/models/LocalSave'
import { chooseSave } from '@/app/(protected)/(saves)/utils/chooseSave'

const USER_ID = 7
const state = createInitialGameState('game-1')

function server(version: number, playTimeSeconds: number, gameId = 'game-1'): LoadedSave {
  return { version, playTimeSeconds, state: { ...state, gameId } }
}

function local(version: number, playTimeSeconds: number, dirty: boolean): LocalSave {
  return { userId: USER_ID, version, playTimeSeconds, saveVersion: SAVE_VERSION, state: { ...state, gold: 99 }, dirty }
}

describe('choosing between the local copy and the server save', () => {
  it('plays the local copy offline, and nothing without one', () => {
    expect(chooseSave(USER_ID, local(3, 100, true), null)).toMatchObject({ save: { version: 3 }, discarded: null })
    expect(chooseSave(USER_ID, null, null)).toBeNull()
  })

  it('keeps the unsent changes of the same version', () => {
    expect(chooseSave(USER_ID, local(3, 100, true), server(3, 90))?.save.state.gold).toBe(99)
  })

  it('takes the server save when the local copy has nothing new or belongs to another game', () => {
    expect(chooseSave(USER_ID, local(3, 100, false), server(4, 120))?.save).toMatchObject({ version: 4, dirty: false })
    expect(chooseSave(USER_ID, local(3, 500, true), server(1, 0, 'game-2'))?.save.state.gameId).toBe('game-2')
  })

  it('keeps the copy played the longest when both moved on', () => {
    expect(chooseSave(USER_ID, local(3, 500, true), server(5, 200))).toMatchObject({
      save: { version: 5, playTimeSeconds: 500, dirty: true },
      discarded: 'server'
    })
    expect(chooseSave(USER_ID, local(3, 100, true), server(5, 200))).toMatchObject({
      save: { version: 5, playTimeSeconds: 200, dirty: false },
      discarded: 'local'
    })
  })
})
