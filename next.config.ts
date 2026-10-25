import { withSerwist } from '@serwist/turbopack'
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  serverExternalPackages: ['@neogroup/neorm', 'pg'],
  env: {
    // Vercel sets VERCEL_ENV ('production' | 'preview' | 'development') only on
    // the server. Re-exposing it under a NEXT_PUBLIC_ name inlines it into the
    // client bundle too (see app/utils/environment.ts).
    NEXT_PUBLIC_VERCEL_ENV: process.env.VERCEL_ENV
  }
}

export default withSerwist(nextConfig)
