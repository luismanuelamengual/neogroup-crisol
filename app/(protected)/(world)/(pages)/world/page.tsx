import type { Metadata } from 'next'
import WorldScreen from '@/app/(protected)/(world)/components/WorldScreen'
import { getT } from '@/app/i18n/server'

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())('metadata.world') }
}

export default function WorldPage() {
  return <WorldScreen />
}
