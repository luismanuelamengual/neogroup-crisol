import type { Metadata } from 'next'
import RegisterForm from '@/app/(auth)/components/RegisterForm'
import { getT } from '@/app/i18n/server'

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())('metadata.register') }
}

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ callbackUrl?: string }> }) {
  const { callbackUrl } = await searchParams

  return <RegisterForm callbackUrl={callbackUrl ?? null} />
}
