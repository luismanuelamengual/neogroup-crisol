/// <reference lib="esnext" />
/// <reference lib="webworker" />
import { defaultCache } from '@serwist/turbopack/worker'
import {
  CacheFirst,
  ExpirationPlugin,
  NetworkFirst,
  type PrecacheEntry,
  RangeRequestsPlugin,
  type RuntimeCaching,
  Serwist,
  type SerwistGlobalConfig,
  StaleWhileRevalidate
} from 'serwist'

// Declares the injection point for the precache manifest to TypeScript.
declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined
  }
}

declare const self: ServiceWorkerGlobalScope

// The game's art and music are not precached (they are large): each piece is
// kept once it has been seen or heard, so the places visited play offline.
const gameCache: RuntimeCaching[] = [
  {
    matcher: ({ url }) => url.pathname === '/art/manifest.json',
    handler: new NetworkFirst({ cacheName: 'crisol-art-manifest', networkTimeoutSeconds: 3 })
  },
  {
    matcher: ({ url }) => url.pathname.startsWith('/art/'),
    handler: new StaleWhileRevalidate({
      cacheName: 'crisol-art',
      plugins: [new ExpirationPlugin({ maxEntries: 800, maxAgeFrom: 'last-used' })]
    })
  },
  {
    matcher: ({ url }) => url.pathname.startsWith('/audio/'),
    handler: new CacheFirst({
      cacheName: 'crisol-audio',
      plugins: [new ExpirationPlugin({ maxEntries: 80, maxAgeFrom: 'last-used' }), new RangeRequestsPlugin()]
    })
  }
]
const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [...gameCache, ...defaultCache],
  fallbacks: {
    entries: [
      {
        // Shown when a navigation request fails while offline.
        url: '/~offline',
        matcher({ request }) {
          return request.destination === 'document'
        }
      }
    ]
  }
})

serwist.addEventListeners()
