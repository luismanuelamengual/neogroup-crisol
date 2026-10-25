import { NextResponse } from 'next/server'

/**
 * Digital Asset Links of the Android app published in Google Play (a Trusted
 * Web Activity that opens this site). They prove that the app and the site
 * belong to the same owner, so Chrome opens the site full screen, without its
 * address bar. Configured with environment variables:
 *
 *   - ANDROID_PACKAGE_NAME: the package of the app (e.g. "app.crisol.twa").
 *   - ANDROID_SHA256_CERT_FINGERPRINTS: the SHA-256 fingerprints of the keys
 *     that sign the app, comma separated (Play Console → Test and release →
 *     App integrity → App signing: the "App signing key" one, and the upload
 *     key one to also trust the builds installed by hand).
 *
 * Its path contains a dot, so the auth proxy never runs for it.
 */
export function GET(): NextResponse {
  const packageName = process.env.ANDROID_PACKAGE_NAME?.trim()
  const fingerprints = (process.env.ANDROID_SHA256_CERT_FINGERPRINTS ?? '')
    .split(',')
    .map((fingerprint) => fingerprint.trim().toUpperCase())
    .filter(Boolean)
  const statements =
    packageName && fingerprints.length > 0
      ? [
          {
            relation: ['delegate_permission/common.handle_all_urls'],
            target: { namespace: 'android_app', package_name: packageName, sha256_cert_fingerprints: fingerprints }
          }
        ]
      : []

  return NextResponse.json(statements)
}
