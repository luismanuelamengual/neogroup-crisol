import { beforeEach, describe, expect, it } from 'vitest'
import { START_NODE_ID } from '@/app/(protected)/(engine)/data/world'
import { CharacterId } from '@/app/(protected)/(engine)/models/CharacterId'
import { GameState } from '@/app/(protected)/(engine)/models/GameState'
import { isGameState } from '@/app/(protected)/(engine)/utils/gameState'
import { createCharacter } from '@/app/(protected)/(engine)/utils/heroes'
import { Save } from '@/app/(protected)/(saves)/models/Save'
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
    expect(save.state.characters).toEqual([{ ...createCharacter(CharacterId.KAEL, 1), xp: 0, health: 120 }])
    expect(save.state.gameId).toMatch(/^[0-9a-f-]{36}$/)
    expect(await getSaveSummary(userId)).toMatchObject({ cycle: 0, topLevel: 1, characters: 1, playTimeSeconds: 0 })
  })

  it('stores the state sent by the browser and rejects one sent from an outdated copy', async () => {
    const save = await startNewGame(userId)
    const state: GameState = {
      ...save.state,
      gold: 12,
      characters: [{ ...createCharacter(CharacterId.KAEL, 3), xp: 40, health: 100 }]
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

  it('migrates a game saved with the first shape of the state', async () => {
    const save = await startNewGame(userId)
    const stored = await Save.where('userId', userId).first()
    const v1: Record<string, unknown> = { ...save.state, characters: [{ id: CharacterId.KAEL, level: 2, xp: 5 }] }

    delete v1.gameId
    delete v1.respawnedNodeIds
    delete v1.flaskCharges
    stored!.saveVersion = 1
    stored!.data = v1
    await stored!.save()

    const loaded = await loadGame(userId)

    expect(isGameState(loaded.state)).toBe(true)
    expect(loaded.state).toMatchObject({ gameId: 'legacy', respawnedNodeIds: [], flaskCharges: 1, echoes: 1 })
    expect(loaded.state.characters).toEqual([{ ...createCharacter(CharacterId.KAEL, 2), xp: 5, health: 132 }])
  })

  it('gives the upgrade of the only weapon of a v4 game to the weapon each character starts with', async () => {
    await startNewGame(userId)

    const stored = await Save.where('userId', userId).first()
    const { weaponId, weapons, ...kael } = createCharacter(CharacterId.KAEL, 12)

    expect([weaponId, weapons]).toEqual(['oath-sword', { 'oath-sword': 0 }])
    stored!.saveVersion = 4
    stored!.data = { ...(stored!.data as object), characters: [{ ...kael, weapon: 7 }] }
    await stored!.save()

    const loaded = await loadGame(userId)

    expect(isGameState(loaded.state)).toBe(true)
    expect(loaded.state.characters[0]).toMatchObject({ weaponId: 'oath-sword', weapons: { 'oath-sword': 7 } })
  })

  it('renames the staves, scepters and wand of a v5 game to the sickles, scythe and grimoires', async () => {
    await startNewGame(userId)

    const stored = await Save.where('userId', userId).first()
    const oren = { ...createCharacter(CharacterId.OREN, 20), weaponId: 'sun-scepter' }
    const ysolde = { ...createCharacter(CharacterId.YSOLDE, 20), weaponId: 'crystal-staff' }

    stored!.saveVersion = 5
    stored!.data = {
      ...(stored!.data as object),
      characters: [
        { ...oren, weapons: { 'grove-staff': 4, 'sun-scepter': 2, 'thorn-sickle': 1 } },
        { ...ysolde, weapons: { 'crystal-staff': 9, 'storm-scepter': 0, 'prism-wand': 3 } }
      ]
    }
    await stored!.save()

    const loaded = await loadGame(userId)

    expect(isGameState(loaded.state)).toBe(true)
    expect(loaded.state.characters.map(({ weaponId, weapons }) => [weaponId, weapons])).toEqual([
      ['noon-scythe', { 'root-sickle': 4, 'noon-scythe': 2, 'thorn-sickle': 1 }],
      ['trinity-tome', { 'trinity-tome': 9, 'thunder-codex': 0, 'dusk-grimoire': 3 }]
    ])
  })

  it('replaces the saved game when a new one is started', async () => {
    const save = await startNewGame(userId)

    await saveGame(userId, {
      version: save.version,
      playTimeSeconds: 3600,
      state: { ...save.state, characters: [{ ...createCharacter(CharacterId.KAEL, 9), xp: 0, health: 1 }] }
    })

    const fresh = await startNewGame(userId)

    expect(fresh.state.characters[0].level).toBe(1)
    expect(await getSaveSummary(userId)).toMatchObject({ topLevel: 1, playTimeSeconds: 0 })
  })
})
