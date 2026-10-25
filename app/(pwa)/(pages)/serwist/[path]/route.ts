import { spawnSync } from 'node:child_process'
import { createSerwistRoute } from '@serwist/turbopack'
import { WORLD_VERSION } from '@/app/(protected)/(engine)/data/world'

/**
 * Serwist route handler (Turbopack integration).
 *
 * Serves the compiled service worker at `/serwist/sw.js` (registered by the
 * <SerwistProvider> in app/layout.tsx). Next.js 16 uses Turbopack, so we use
 * @serwist/turbopack instead of the webpack-based @serwist/next plugin.
 */

// A revision versions the precached shell so stale precached responses are not
// reused after a deploy. `git rev-parse HEAD` is convenient; when git is not
// available (e.g. some serverless builds) we fall back to a random id.
const revision = spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf-8' }).stdout?.trim() || crypto.randomUUID()

export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } = createSerwistRoute({
  // The world map is precached so the game can be played offline.
  additionalPrecacheEntries: [
    { url: '/~offline', revision },
    { url: '/world/world.json', revision: `world-${WORLD_VERSION}` }
  ],
  swSrc: 'app/(pwa)/services/sw.ts',
  useNativeEsbuild: true
})
