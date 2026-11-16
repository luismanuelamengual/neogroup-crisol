/**
 * Cache where the service worker keeps every page visited (see sw.ts), so the
 * installed app opens offline: the start page goes to the cached menu, and the
 * menu and the world come from here.
 */
export const PAGES_CACHE = 'crisol-pages'

/** The caches of the defaultCache of Serwist that hold pages or their RSC payloads. */
const OTHER_PAGE_CACHES = ['pages', 'pages-rsc', 'pages-rsc-prefetch', 'others']

/** Forgets the cached pages (they show the signed-in account): done when signing out. */
export async function clearCachedPages(): Promise<void> {
  try {
    if (typeof caches !== 'undefined') {
      await Promise.all([PAGES_CACHE, ...OTHER_PAGE_CACHES].map((name) => caches.delete(name)))
    }
  } catch {
    // Without the Cache API there is nothing to forget.
  }
}
