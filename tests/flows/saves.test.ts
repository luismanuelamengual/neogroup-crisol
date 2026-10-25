import { beforeEach, describe, expect, it } from 'vitest'
import { START_NODE_ID } from '@/app/(protected)/(engine)/data/world'
import { CharacterId } from '@/app/(protected)/(engine)/models/CharacterId'
import { GameState } from '@/app/(protected)/(engine)/models/GameState'
import { getSaveSummary, loadGame, saveGame, startNewGame } from '@/app/(protected)/(saves)/services/saves'
import { createUser, resetDatabase } from '@/tests/setup/database'

describe('saved games', () => {
  let userId: number

  beforeEach(async () => {
    await resetDatabase()
    userId = await createUser()
  })

  it('has no saved game until a new one is started', async () => {
    expect(await getSaveSummary(userId)).toBeNull()
    await expect(loadGame(userId)).rejects.toMatchObject({ messageKey: 'errors.saveNotFound' })
  })

  it('starts a new game with Kael alone, at level 1, in the starting camp', async () => {
    const save = await startNewGame(userId)

    expect(save.state.cycle).toBe(0)
    expect(save.state.positionNodeId).toBe(START_NODE_ID)
    expect(save.state.openCampIds).toEqual([START_NODE_ID])
    expect(save.state.characters).toEqual([{ id: CharacterId.KAEL, level: 1, xp: 0 }])
    expect(await getSaveSummary(userId)).toMatchObject({ cycle: 0, topLevel: 1, characters: 1, playTimeSeconds: 0 })
  })

  it('stores the state sent by the browser and rejects one sent from an outdated copy', async () => {
    const save = await startNewGame(userId)
    const state: GameState = {
      ...save.state,
      gold: 12,
      characters: [{ id: CharacterId.KAEL, level: 3, xp: 40 }]
    }
    const saved = await saveGame(userId, { version: save.version, playTimeSeconds: 600, state })

    expect(saved.version).toBe(save.version + 1)
    expect((await loadGame(userId)).state).toEqual(state)
    expect(await getSaveSummary(userId)).toMatchObject({ topLevel: 3, playTimeSeconds: 600 })

    // A second device still holding the first version.
    await expect(saveGame(userId, { version: save.version, playTimeSeconds: 700, state })).rejects.toMatchObject({
      messageKey: 'errors.saveOutdated'
    })
  })

  it('rejects a state with the wrong shape', async () => {
    const save = await startNewGame(userId)
    const broken = { ...save.state, characters: [{ id: 'nobody', level: 0, xp: -1 }] } as unknown as GameState

    await expect(saveGame(userId, { version: save.version, playTimeSeconds: 0, state: broken })).rejects.toMatchObject({
      messageKey: 'errors.invalidSave'
    })
  })

  it('replaces the saved game when a new one is started', async () => {
    const save = await startNewGame(userId)

    await saveGame(userId, {
      version: save.version,
      playTimeSeconds: 3600,
      state: { ...save.state, characters: [{ id: CharacterId.KAEL, level: 9, xp: 0 }] }
    })

    const fresh = await startNewGame(userId)

    expect(fresh.state.characters[0].level).toBe(1)
    expect(await getSaveSummary(userId)).toMatchObject({ topLevel: 1, playTimeSeconds: 0 })
  })
})
