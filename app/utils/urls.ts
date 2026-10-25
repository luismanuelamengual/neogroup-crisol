/**
 * Builds the app's own absolute base URL (e.g. "https://crisol.app") from an
 * HTTP Host header value. Used to build absolute links sent by email (email
 * verification, password reset). Falls back to NEXT_PUBLIC_APP_URL when there
 * is no Host header.
 */
export function resolveAppUrl(host: string): string {
  if (!host) {
    return process.env.NEXT_PUBLIC_APP_URL ?? ''
  }

  const protocol = host.includes('localhost') || host.startsWith('127.0.0.1') ? 'http' : 'https'

  return `${protocol}://${host}`
}

/**
 * Normalizes a `callbackUrl` value into a safe, same-origin relative path, or
 * `null` when there's nothing usable. Absolute URLs keep only path + search +
 * hash, so a callbackUrl pointing to another host can never leave the app.
 */
export function resolveCallbackPath(callbackUrl?: string | null): string | null {
  if (!callbackUrl) {
    return null
  }

  if (callbackUrl.startsWith('/') && !callbackUrl.startsWith('//')) {
    return callbackUrl
  }

  try {
    const url = new URL(callbackUrl)

    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    return null
  }
}
