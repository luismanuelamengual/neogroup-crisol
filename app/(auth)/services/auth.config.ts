import type { NextAuthConfig } from 'next-auth'

/** Pages reachable without a session. Signed-in users hitting one are sent to `/`. */
const PUBLIC_PATHS = ['/login', '/register', '/verify-email', '/forgot-password', '/reset-password']
/** Pages reachable by everybody, signed in or not (the legal pages linked from Google Play). */
const OPEN_PATHS = ['/privacy', '/delete-account']
// Session timeout in seconds. Defaults to 30 days if not set.
const SESSION_MAX_AGE = process.env.AUTH_SESSION_MAX_AGE
  ? parseInt(process.env.AUTH_SESSION_MAX_AGE, 10)
  : 30 * 24 * 60 * 60

/**
 * Edge-safe Auth.js configuration (no database access) shared between the
 * proxy (route protection) and the full server-side configuration.
 */
export const authConfig = {
  pages: {
    signIn: '/login'
  },
  session: {
    strategy: 'jwt',
    maxAge: SESSION_MAX_AGE
  },
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      // The root path is always allowed: app/page.tsx renders the public landing
      // or redirects a signed-in player to the main menu.
      if (nextUrl.pathname === '/' || OPEN_PATHS.includes(nextUrl.pathname)) {
        return true
      }

      const isLoggedIn = !!auth?.user
      const isPublicPath = PUBLIC_PATHS.some((path) => nextUrl.pathname.startsWith(path))

      if (isPublicPath) {
        if (isLoggedIn) {
          return Response.redirect(new URL('/', nextUrl))
        }

        return true
      }

      if (isLoggedIn) {
        return true
      }

      // proxy.ts wraps `auth()` with its own handler, so next-auth never builds
      // the "/login?callbackUrl=..." redirect by itself: build it here.
      const signInUrl = new URL('/login', nextUrl)

      signInUrl.searchParams.set('callbackUrl', nextUrl.href)

      return Response.redirect(signInUrl)
    }
  }
} satisfies NextAuthConfig
