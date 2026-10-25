import { DB, Schema } from '@neogroup/neorm'

/**
 * Base schema of Crisol.
 *
 * The DDL is engine-agnostic (neorm's `Schema` builder compiles it to
 * PostgreSQL in production and to SQLite in tests):
 *
 *   - users / email_verification_tokens / password_reset_tokens → authentication
 *   - saves → the saved game of each player (one per account)
 *
 * `saves.data` (jsonb, TEXT on SQLite) holds the whole state of the game
 * (see app/(protected)/(engine)/models/GameState.ts). The world itself and the
 * catalogs (characters, skills, runes, enemies...) are not stored: they live in
 * the code. `saves.version` is increased on every write: updates are
 * conditional on it (optimistic locking, the same account may play on two devices).
 */
export default {
  name: '001-create-base-tables',

  async up(): Promise<void> {
    await DB.transaction(async () => {
      await Schema.createIfNotExists('users', (table) => {
        table.increments('id')
        table.string('email', 255).unique()
        table.string('passwordHash', 255).nullable()
        table.string('name', 60).nullable()
        table.string('lastName', 60).nullable()
        table.string('nickname', 60).nullable()
        // Language chosen by the player ('en' | 'es', see app/i18n/config.ts): app and emails.
        table.string('locale', 5).default('en')
        table.boolean('emailVerified').default(false)
        table.boolean('active').default(true)
        table.timestamp('createdAt').useCurrent()
      })

      await Schema.createIfNotExists('email_verification_tokens', (table) => {
        table.increments('id')
        table.integer('userId')
        table.string('token', 128).unique()
        table.timestamp('expiresAt')
        table.timestamp('createdAt').useCurrent()

        table.foreign('userId').references('id').on('users').cascadeOnDelete()
      })

      await Schema.createIfNotExists('password_reset_tokens', (table) => {
        table.increments('id')
        table.integer('userId')
        table.string('token', 128).unique()
        table.timestamp('expiresAt')
        table.timestamp('createdAt').useCurrent()

        table.foreign('userId').references('id').on('users').cascadeOnDelete()
      })

      await Schema.createIfNotExists('saves', (table) => {
        table.increments('id')
        // One saved game per account: "New game" replaces it.
        table.integer('userId').unique()
        // New Game+ cycle: 0 = first playthrough, 1 = NG+1...
        table.integer('cycle').default(0)
        // Version of the world (world.json) the save was made on.
        table.integer('worldVersion').default(1)
        // Shape of `data`: a save of an older shape is migrated when it is loaded.
        table.integer('saveVersion').default(1)
        // Increased on every write (optimistic locking).
        table.integer('version').default(1)
        table.integer('playTimeSeconds').default(0)
        // State of the game (see the note at the top).
        table.jsonb('data')
        table.timestamp('createdAt').useCurrent()
        table.timestamp('updatedAt').useCurrent()

        table.foreign('userId').references('id').on('users').cascadeOnDelete()
      })
    })
  }
}
