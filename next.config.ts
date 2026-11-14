import { withSerwist } from '@serwist/turbopack'
import type { NextConfig } from 'next'
import { version } from './package.json'

const nextConfig: NextConfig = {
  serverExternalPackages: ['@neogroup/neorm', 'pg'],
  env: {
    // Vercel sets VERCEL_ENV ('production' | 'preview' | 'development') only on
    // the server. Re-exposing it under a NEXT_PUBLIC_ name inlines it into the
    // client bundle too (see app/utils/environment.ts).
    NEXT_PUBLIC_VERCEL_ENV: process.env.VERCEL_ENV,
    // Version shown on the main menu (see app/utils/version.ts). Inlined at
    // build time, so it always names the bundle that is actually running, even
    // when the installed PWA serves an older one from its cache.
    NEXT_PUBLIC_APP_VERSION: version,
    NEXT_PUBLIC_APP_COMMIT: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? '',
    NEXT_PUBLIC_APP_BUILT_AT: new Date().toISOString()
  }
}

export default withSerwist(nextConfig)
