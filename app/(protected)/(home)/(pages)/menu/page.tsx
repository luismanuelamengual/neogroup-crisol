import type { Metadata } from 'next'
import { auth } from '@/app/(auth)/services/auth'
import MainMenu from '@/app/(protected)/(home)/components/MainMenu'
import { getSaveSummary } from '@/app/(protected)/(saves)/services/saves'
import { getT } from '@/app/i18n/server'

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())('metadata.mainMenu') }
}

export default async function MenuPage() {
  const session = await auth()
  const save = await getSaveSummary(Number(session!.user.id))

  return <MainMenu save={save} />
}
