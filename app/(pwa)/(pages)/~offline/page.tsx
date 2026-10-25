import type { Metadata } from 'next'
import OfflineMessage from '@/app/(pwa)/components/OfflineMessage'
import { getT } from '@/app/i18n/server'

/**
 * Offline fallback page. Precached by the service worker and shown when a
 * navigation fails without network. It must stay fully static (no session,
 * no data). Excluded from the auth proxy so it renders for everyone.
 */
export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())('metadata.offline') }
}

export default function OfflinePage() {
  return <OfflineMessage />
}
