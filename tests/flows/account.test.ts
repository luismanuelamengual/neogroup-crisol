import { DB } from '@neogroup/neorm'
import { beforeEach, describe, expect, it } from 'vitest'
import { deleteAccount } from '@/app/(protected)/(account)/services/accounts'
import { Save } from '@/app/(protected)/(saves)/models/Save'
import { startNewGame } from '@/app/(protected)/(saves)/services/saves'
import { User } from '@/app/models/User'
import { createUser, resetDatabase } from '@/tests/setup/database'

describe('account deletion', () => {
  let ana: number
  let beto: number

  beforeEach(async () => {
    await resetDatabase()
    ana = await createUser('ana@crisol.test')
    beto = await createUser('beto@crisol.test')
  })

  it('deletes the user, its tokens and its saved game', async () => {
    await startNewGame(ana)
    await startNewGame(beto)
    await DB.table('password_reset_tokens').insert({ userId: ana, token: 'reset', expiresAt: new Date() })
    await DB.table('email_verification_tokens').insert({ userId: ana, token: 'verify', expiresAt: new Date() })

    await deleteAccount(ana)

    expect(await User.find(ana)).toBeFalsy()
    expect(await Save.where('userId', ana).first()).toBeFalsy()
    expect(await DB.table('password_reset_tokens').where('userId', ana).get()).toHaveLength(0)
    expect(await DB.table('email_verification_tokens').where('userId', ana).get()).toHaveLength(0)
    // Other accounts are untouched.
    expect(await User.find(beto)).toBeTruthy()
    expect(await Save.where('userId', beto).first()).toBeTruthy()
  })
})
