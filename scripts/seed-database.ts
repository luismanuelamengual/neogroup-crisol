/* eslint-disable no-console */
/**
 * Seeds demo data for local development: a verified demo user that can sign in
 * with email and password right away (no verification mail needed).
 *
 * Usage: yarn db:seed
 */
import { config } from 'dotenv'

config({ path: '.env.local' })
config({ path: '.env' })

import { DB } from '@neogroup/neorm'
import bcrypt from 'bcryptjs'

const DEMO_EMAIL = 'demo@crisol.app'
const DEMO_PASSWORD = 'demo1234'

async function run(): Promise<void> {
  if (process.env.VERCEL_ENV === 'production') {
    console.error('🚫 db:seed refuses to run against production.')
    process.exit(1)
  }

  const existing = await DB.table('users').where('email', DEMO_EMAIL).first()

  if (existing) {
    console.log(`Demo user already exists (${DEMO_EMAIL}).`)

    return
  }

  await DB.table('users').insert({
    email: DEMO_EMAIL,
    passwordHash: await bcrypt.hash(DEMO_PASSWORD, 10),
    name: 'Kael',
    emailVerified: true,
    active: true
  })

  console.log(`Demo user created: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`)
}

run()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Seed failed:', error)
    process.exit(1)
  })
