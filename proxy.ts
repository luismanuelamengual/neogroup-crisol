import { NextResponse } from 'next/server'
import NextAuth from 'next-auth'
import { authConfig } from '@/app/(auth)/services/auth.config'

const { auth } = NextAuth(authConfig)

/**
 * Middleware: enforces authentication on every page (see the `authorized`
 * callback in auth.config.ts for the public paths). Runs on the Edge — it must
 * stay free of Node.js-only modules (no DB access).
 */
export const proxy = auth(() => NextResponse.next())

export const config = {
  // `~offline` is excluded so the PWA offline fallback renders for everyone and
  // the service worker precaches the page itself (not a login redirect).
  // `serwist/*` and `manifest.webmanifest` match the `.*\..*` exclusion.
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|~offline|.*\\..*).*)']
}
