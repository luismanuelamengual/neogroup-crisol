import { NextResponse } from 'next/server'
import { PWA_CONFIG } from '@/app/(pwa)/services/pwa'
import { getLocale } from '@/app/i18n/server'
import { createTranslator } from '@/app/i18n/translate'

/**
 * Web App Manifest. Its path contains a dot, so the auth proxy never runs for
 * it: the browser can always fetch it without a session.
 */
export async function GET(): Promise<NextResponse> {
  const locale = await getLocale()
  const manifest = {
    // Stable identity of the app (Chrome and the Google Play TWA package key on it).
    id: '/',
    name: PWA_CONFIG.name,
    short_name: PWA_CONFIG.shortName,
    description: createTranslator(locale)('pwa.description'),
    lang: locale,
    start_url: '/',
    scope: '/',
    display: 'standalone',
    // The map and the battles work in both orientations: let the player rotate freely.
    orientation: 'any',
    theme_color: PWA_CONFIG.themeColor,
    background_color: PWA_CONFIG.backgroundColor,
    categories: ['games', 'entertainment'],
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
    ]
  }

  return NextResponse.json(manifest, { headers: { 'Content-Type': 'application/manifest+json' } })
}
