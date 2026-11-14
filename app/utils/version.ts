/**
 * The version of the running bundle, shown on the main menu so a deploy can be
 * told apart from the previous one (e.g. to check whether the installed PWA
 * already picked up the new build).
 *
 * All three values are inlined into the client bundle at build time by
 * next.config.ts: the semantic version from package.json, the short commit
 * Vercel built (`VERCEL_GIT_COMMIT_SHA`, empty locally) and the build time.
 */
export const appVersion = process.env.NEXT_PUBLIC_APP_VERSION ?? '0.0.0'

export const appCommit = process.env.NEXT_PUBLIC_APP_COMMIT || ''

export const appBuiltAt = process.env.NEXT_PUBLIC_APP_BUILT_AT ?? ''

/** E.g. "v0.1.0 · a1b2c3d" on Vercel, "v0.1.0 · dev" locally. */
export const versionLabel = `v${appVersion} · ${appCommit || 'dev'}`

/** The build time as a short local date and time, e.g. "14/11/26, 19:37". */
export function formatBuiltAt(locale: string): string {
  const date = new Date(appBuiltAt)

  if (!appBuiltAt || Number.isNaN(date.getTime())) {
    return ''
  }

  return new Intl.DateTimeFormat(locale, { dateStyle: 'short', timeStyle: 'short' }).format(date)
}
