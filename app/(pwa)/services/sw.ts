/// <reference lib="esnext" />
/// <reference lib="webworker" />
import { defaultCache } from '@serwist/turbopack/worker'
import { NetworkOnly, type PrecacheEntry, Serwist, type SerwistGlobalConfig } from 'serwist'

// Declares the injection point for the precache manifest to TypeScript.
declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined
  }
}

declare const self: ServiceWorkerGlobalScope

// Ads (AdSense) must never be cached: always straight from the network.
const AD_HOSTS = /(^|\.)(googlesyndication\.com|doubleclick\.net|googleadservices\.com|adtrafficquality\.google)$/
const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [{ matcher: ({ url }) => AD_HOSTS.test(url.hostname), handler: new NetworkOnly() }, ...defaultCache],
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
