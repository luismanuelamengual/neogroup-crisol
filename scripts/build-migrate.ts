/* eslint-disable no-console */
/**
 * Runs the database migrations automatically as part of `yarn build`, but only
 * on the Vercel production deploy (VERCEL_ENV === 'production'). Preview and
 * local builds are skipped — use `yarn db:migrate` for a manual run against
 * whatever database is configured.
 */
import { execSync } from 'child_process'

if (process.env.VERCEL_ENV !== 'production') {
  console.log(`Skipping automatic migrations (VERCEL_ENV=${process.env.VERCEL_ENV ?? 'not set'}).`)
  process.exit(0)
}

if (!process.env.DB_URL && !process.env.DB_DRIVER) {
  // Accounts (sign in) always live in the database, even with the saved games in localStorage.
  console.error(
    'No database configured for the production deploy. Set DB_URL (e.g. postgres://user:pass@host/db?sslmode=require) ' +
      'or DB_DRIVER + DB_HOST/DB_PORT/DB_NAME/DB_USERNAME/DB_PASSWORD in Vercel → Settings → Environment Variables (Production).'
  )
  process.exit(1)
}

console.log('VERCEL_ENV=production — applying database migrations before build...')
execSync('yarn db:migrate', { stdio: 'inherit' })
