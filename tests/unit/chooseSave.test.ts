import { describe, expect, it } from 'vitest'
import { createInitialGameState, SAVE_VERSION } from '@/app/(protected)/(engine)/utils/gameState'
import { LoadedSave } from '@/app/(protected)/(saves)/models/LoadedSave'
import { LocalSave } from '@/app/(protected)/(saves)/models/LocalSave'
import { chooseSave } from '@/app/(protected)/(saves)/utils/chooseSave'

const USER_ID = 7
const state = createInitialGameState('game-1')
const EARLIER = '2026-11-16T10:00:00.000Z'
const LATER = '2026-11-16T12:00:00.000Z'

function server(version: number, playTimeSeconds: number, updatedAt = EARLIER, gameId = 'game-1'): LoadedSave {
  return { version, playTimeSeconds, updatedAt, state: { ...state, gameId } }
}

function local(version: number, playTimeSeconds: number, dirty: boolean, updatedAt?: string): LocalSave {
  return {
    userId: USER_ID,
    version,
    playTimeSeconds,
    updatedAt,
    saveVersion: SAVE_VERSION,
    state: { ...state, gold: 99 },
    dirty
  }
}

describe('choosing between the local copy and the server save', () => {
  it('plays the local copy offline, and nothing without one', () => {
    expect(chooseSave(USER_ID, local(3, 100, true), null)).toMatchObject({ save: { version: 3 }, discarded: null })
    expect(chooseSave(USER_ID, null, null)).toBeNull()
  })

  it('keeps the unsent changes of the same version', () => {
    expect(chooseSave(USER_ID, local(3, 100, true, EARLIER), server(3, 90, LATER))?.save.state.gold).toBe(99)
  })

  it('takes the server save when the local copy has nothing new', () => {
    expect(chooseSave(USER_ID, local(3, 100, false, LATER), server(4, 120))).toMatchObject({
      save: { version: 4, dirty: false, updatedAt: EARLIER },
      discarded: null
    })
  })

  it('keeps the copy changed the most recently when both moved on', () => {
    expect(chooseSave(USER_ID, local(3, 100, true, LATER), server(5, 900, EARLIER))).toMatchObject({
      save: { version: 5, playTimeSeconds: 100, dirty: true },
      discarded: 'server'
    })
    expect(chooseSave(USER_ID, local(3, 900, true, EARLIER), server(5, 100, LATER))).toMatchObject({
      save: { version: 5, playTimeSeconds: 100, dirty: false },
      discarded: 'local'
    })
  })

  it('applies the same rule to a New game started on another device', () => {
    expect(chooseSave(USER_ID, local(3, 500, true, EARLIER), server(4, 0, LATER, 'game-2'))?.save.state.gameId).toBe(
      'game-2'
    )
    expect(chooseSave(USER_ID, local(3, 500, true, LATER), server(4, 0, EARLIER, 'game-2'))).toMatchObject({
      save: { version: 4, state: { gameId: 'game-1' }, dirty: true },
      discarded: 'server'
    })
  })

  it('takes the server save, without a conflict, when it already has the change of the local copy', () => {
    expect(chooseSave(USER_ID, local(3, 100, true, LATER), server(4, 100, LATER))).toMatchObject({
      save: { version: 4, dirty: false },
      discarded: null
    })
  })

  it('drops a pending copy written before the changes were dated when the server moved on', () => {
    expect(chooseSave(USER_ID, local(3, 900, true), server(5, 100))).toMatchObject({ discarded: 'local' })
  })
})
