/* eslint-disable no-console */
/**
 * Database reset runner.
 *
 * Drops every table of the configured database and re-applies all the
 * migrations (`yarn db:migrate`). Engine-aware: works on PostgreSQL and SQLite.
 *
 * Usage: yarn db:reset
 */
import { config } from 'dotenv'

config({ path: '.env.local' })
config({ path: '.env' })

import { DB } from '@neogroup/neorm'
import { execSync } from 'child_process'
import * as readline from 'readline'

const IS_SQLITE = (process.env.DB_DRIVER ?? 'postgres') === 'sqlite'

function confirm(question: string): Promise<boolean> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close()
      resolve(answer.trim().toLowerCase() === 'y')
    })
  })
}

async function getTableNames(): Promise<string[]> {
  if (IS_SQLITE) {
    const rows = await DB.query("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'")

    return rows.map((row) => String(row.name))
  }

  const rows = await DB.query("SELECT tablename AS name FROM pg_tables WHERE schemaname = 'public'")

  return rows.map((row) => String(row.name))
}

async function dropAllTables(): Promise<void> {
  const tables = await getTableNames()

  if (tables.length === 0) {
    console.log('No tables found — nothing to drop.')

    return
  }

  if (IS_SQLITE) {
    await DB.execute('PRAGMA foreign_keys = OFF')

    for (const table of tables) {
      await DB.execute(`DROP TABLE IF EXISTS "${table}"`)
    }

    await DB.execute('PRAGMA foreign_keys = ON')
  } else {
    for (const table of tables) {
      await DB.execute(`DROP TABLE IF EXISTS "${table}" CASCADE`)
    }
  }

  console.log(`Dropped ${tables.length} table(s): ${tables.join(', ')}`)
}

async function run(): Promise<void> {
  if (process.env.VERCEL_ENV === 'production') {
    console.error('🚫 db:reset refuses to run against production.')
    process.exit(1)
  }

  const ok = await confirm('⚠️  This will drop ALL tables and re-run migrations. Continue? (y/N) ')

  if (!ok) {
    console.log('Aborted.')

    return
  }

  await dropAllTables()
  console.log('\nRunning migrations...')
  execSync('yarn run db:migrate', { stdio: 'inherit' })
  console.log('\nDatabase reset complete.')
}

run()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Reset failed:', error)
    process.exit(1)
  })
