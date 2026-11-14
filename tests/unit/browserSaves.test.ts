import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createInitialGameState, SAVE_VERSION } from '@/app/(protected)/(engine)/utils/gameState'
import { LocalSave } from '@/app/(protected)/(saves)/models/LocalSave'
import {
  deleteBrowserSave,
  loadBrowserGame,
  readBrowserSave,
  startBrowserGame,
  writeBrowserSave
} from '@/app/(protected)/(saves)/utils/browserSaves'

const USER_ID = 7

/** A minimal localStorage (the tests run in node). */
class MemoryStorage {
  items = new Map<string, string>()
  full = false

  getItem(key: string) {
    return this.items.get(key) ?? null
  }

  setItem(key: string, value: string) {
    if (this.full) {
      throw new Error('QuotaExceededError')
    }

    this.items.set(key, value)
  }

  removeItem(key: string) {
    this.items.delete(key)
  }
}

let storage: MemoryStorage

beforeEach(() => {
  storage = new MemoryStorage()
  ;(globalThis as { window?: unknown }).window = { localStorage: storage }
})

afterEach(() => {
  delete (globalThis as { window?: unknown }).window
})

function save(playTimeSeconds: number): LocalSave {
  return {
    userId: USER_ID,
    version: 0,
    playTimeSeconds,
    saveVersion: SAVE_VERSION,
    state: { ...createInitialGameState('game-1'), gold: 50 },
    dirty: true
  }
}

describe('saved games in localStorage', () => {
  it('has no game until one is written, one per account', async () => {
    expect(readBrowserSave(USER_ID)).toBeNull()
    expect(await loadBrowserGame(USER_ID)).toBeNull()

    expect(writeBrowserSave(save(30), new Date('2026-11-14T10:00:00Z'))).toBe(true)
    expect(readBrowserSave(8)).toBeNull()
    expect(await loadBrowserGame(USER_ID)).toMatchObject({
      playTimeSeconds: 30,
      dirty: false,
      updatedAt: '2026-11-14T10:00:00.000Z',
      state: { gameId: 'game-1', gold: 50 }
    })

    deleteBrowserSave(USER_ID)
    expect(readBrowserSave(USER_ID)).toBeNull()
  })

  it('starts a new game replacing the previous one', async () => {
    writeBrowserSave(save(500))

    const fresh = startBrowserGame(USER_ID)

    expect(fresh).toMatchObject({ playTimeSeconds: 0, saveVersion: SAVE_VERSION, state: { cycle: 0 } })
    expect((await loadBrowserGame(USER_ID))?.state.gameId).toBe(fresh!.state.gameId)
  })

  it('migrates a game written with an older SAVE_VERSION and stores it migrated', async () => {
    writeBrowserSave({ ...save(10), saveVersion: SAVE_VERSION - 1 })

    const loaded = await loadBrowserGame(USER_ID)

    expect(loaded?.saveVersion).toBe(SAVE_VERSION)
    expect(readBrowserSave(USER_ID)?.saveVersion).toBe(SAVE_VERSION)
  })

  it('ignores what cannot be read and reports the writes that fail', async () => {
    storage.setItem(`crisol.save.${USER_ID}`, '{not json')
    expect(await loadBrowserGame(USER_ID)).toBeNull()

    storage.full = true
    expect(writeBrowserSave(save(1))).toBe(false)
    expect(startBrowserGame(USER_ID)).toBeNull()
  })
})
