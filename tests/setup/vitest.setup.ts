/* eslint-disable */
/**
 * Vitest global setup. FORCES the ORM onto a throwaway in-memory SQLite
 * database — never whatever real database the environment is configured with
 * (tests drop and recreate tables) — and coerces SQLite bindings (boolean → 0/1,
 * Date → ISO string), which node:sqlite cannot bind natively.
 */
import { createRequire } from 'node:module'
import path from 'node:path'
import { DB, SqliteDataSource } from '@neogroup/neorm'

process.env.DB_DRIVER = 'sqlite'
process.env.DB_URL = 'sqlite://:memory:'
process.env.AUTH_SECRET = 'test-secret'
;(globalThis as any).__neorm = { sources: new Map(), activeSourceName: undefined }
DB.register(new SqliteDataSource())

const require = createRequire(import.meta.url)

function coerceBinding(value: unknown): unknown {
  if (typeof value === 'boolean') {
    return value ? 1 : 0
  }

  if (value instanceof Date) {
    return value.toISOString()
  }

  if (value === undefined) {
    return null
  }

  return value
}

try {
  const sqlitePath = path.join(
    process.cwd(),
    'node_modules',
    '@neogroup',
    'neorm',
    'dist',
    'database',
    'sources',
    'sqlite',
    'SqliteConnection.js'
  )
  const { SqliteConnection } = require(sqlitePath)
  const wrap = (method: 'query' | 'execute') => {
    const original = SqliteConnection.prototype[method]

    SqliteConnection.prototype[method] = function (sql: string, bindings: unknown[]) {
      return original.call(this, sql, Array.isArray(bindings) ? bindings.map(coerceBinding) : bindings)
    }
  }

  wrap('query')
  wrap('execute')
} catch {
  // Not running on SQLite — nothing to coerce.
}
