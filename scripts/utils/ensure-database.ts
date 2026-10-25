/* eslint-disable no-console */
/**
 * Creates the PostgreSQL database configured in the environment when it does
 * not exist yet, so `yarn db:migrate` works on a fresh server (e.g. a local
 * Postgres shared with other projects) without a manual `CREATE DATABASE`.
 *
 * It connects to the server's maintenance database (`postgres`) with the same
 * credentials and creates the target one. No-op on SQLite.
 */
import { Client, ClientConfig } from 'pg'

interface TargetDatabase {
  name: string
  config: ClientConfig
}

function resolveTarget(): TargetDatabase | null {
  const url = process.env.DB_URL

  if (url) {
    if (!url.startsWith('postgres')) {
      return null
    }

    const parsed = new URL(url)
    const name = decodeURIComponent(parsed.pathname.replace(/^\//, ''))

    parsed.pathname = '/postgres'

    return name ? { name, config: { connectionString: parsed.toString() } } : null
  }

  if ((process.env.DB_DRIVER ?? 'postgres') !== 'postgres' || !process.env.DB_NAME) {
    return null
  }

  return {
    name: process.env.DB_NAME,
    config: {
      host: process.env.DB_HOST ?? 'localhost',
      port: Number(process.env.DB_PORT ?? 5432),
      user: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: 'postgres'
    }
  }
}

export async function ensureDatabaseExists(): Promise<void> {
  const target = resolveTarget()

  if (!target) {
    return
  }

  const client = new Client(target.config)

  await client.connect()

  try {
    const result = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [target.name])

    if (result.rowCount === 0) {
      // Identifiers cannot be bound as parameters: quote it safely by hand.
      await client.query(`CREATE DATABASE "${target.name.replace(/"/g, '""')}"`)
      console.log(`Database "${target.name}" created.`)
    }
  } finally {
    await client.end()
  }
}
