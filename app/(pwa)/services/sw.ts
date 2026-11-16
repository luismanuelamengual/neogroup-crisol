/// <reference lib="esnext" />
/// <reference lib="webworker" />
import { defaultCache } from '@serwist/turbopack/worker'
import {
  CacheFirst,
  ExpirationPlugin,
  NetworkFirst,
  NetworkOnly,
  type PrecacheEntry,
  RangeRequestsPlugin,
  type RuntimeCaching,
  Serwist,
  type SerwistGlobalConfig,
  StaleWhileRevalidate
} from 'serwist'
import { PAGES_CACHE } from '@/app/(pwa)/utils/offlinePages'

// Declares the injection point for the precache manifest to TypeScript.
declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined
  }
}

declare const self: ServiceWorkerGlobalScope

/** Seconds a page waits for the network before the cached copy is shown (a weak signal can hang for minutes). */
const NETWORK_TIMEOUT_SECONDS = 6
const OFFLINE_URL = '/~offline'
const MENU_URL = '/menu'

function isPage(request: Request, url: URL, sameOrigin: boolean): boolean {
  return sameOrigin && request.mode === 'navigate' && !url.pathname.startsWith('/api/')
}

// Every page visited is kept, without expiry, so the installed app opens and
// plays offline even days after it was last online (the game is saved in the
// browser and synced when the connection comes back, see syncLocalSave).
const pageCache: RuntimeCaching[] = [
  {
    // The start page of the app (manifest start_url) only redirects a signed-in
    // player to the menu, and a redirect is never cached: offline, it goes to the
    // cached menu (the player was signed in when it was cached).
    matcher: ({ request, url, sameOrigin }) => isPage(request, url, sameOrigin) && url.pathname === '/',
    handler: new NetworkOnly({
      networkTimeoutSeconds: NETWORK_TIMEOUT_SECONDS,
      plugins: [
        {
          handlerDidError: async () => {
            const menu = await caches.open(PAGES_CACHE).then((cache) => cache.match(MENU_URL))

            return menu
              ? Response.redirect(new URL(MENU_URL, self.location.origin).href, 302)
              : serwist.matchPrecache(OFFLINE_URL)
          }
        }
      ]
    })
  },
  {
    matcher: ({ request, url, sameOrigin }) => isPage(request, url, sameOrigin),
    handler: new NetworkFirst({
      cacheName: PAGES_CACHE,
      networkTimeoutSeconds: NETWORK_TIMEOUT_SECONDS,
      plugins: [new ExpirationPlugin({ maxEntries: 32 })]
    })
  },
  {
    // The fonts are hashed files (bundled from @fontsource), so a cached one never changes.
    matcher: ({ url, sameOrigin }) => sameOrigin && /\.(?:woff2?|ttf|otf)$/i.test(url.pathname),
    handler: new CacheFirst({
      cacheName: 'crisol-fonts',
      plugins: [new ExpirationPlugin({ maxEntries: 60, maxAgeFrom: 'last-used' })]
    })
  }
]
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
  // In development (next dev) the pages are always fetched, like the rest of defaultCache.
  runtimeCaching: [...(process.env.NODE_ENV === 'production' ? pageCache : []), ...gameCache, ...defaultCache],
  fallbacks: {
    entries: [
      {
        // Shown when a navigation request fails while offline.
        url: OFFLINE_URL,
        matcher({ request }) {
          return request.destination === 'document'
        }
      }
    ]
  }
})

/**
 * A new deploy replaces the precached scripts, so the cached pages (which point
 * to the old ones) would not start offline: they are fetched again while the
 * new service worker activates, which happens online. A page that now
 * redirects (e.g. the session expired) is forgotten.
 */
async function refreshCachedPages(): Promise<void> {
  const cache = await caches.open(PAGES_CACHE)

  await Promise.all(
    (await cache.keys()).map(async (request) => {
      try {
        const response = await fetch(request.url, { credentials: 'same-origin', redirect: 'manual' })

        if (response.ok) {
          await cache.put(request, response)
        } else if (response.type === 'opaqueredirect' || response.status < 500) {
          await cache.delete(request)
        }
      } catch {
        // Offline: the old copy is better than nothing.
      }
    })
  )
}

self.addEventListener('activate', (event) => event.waitUntil(refreshCachedPages()))

serwist.addEventListeners()
