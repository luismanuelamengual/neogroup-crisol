import type { Metadata } from 'next'
import LoginForm from '@/app/(auth)/components/LoginForm'
import { getT } from '@/app/i18n/server'

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())('metadata.login') }
}

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ callbackUrl?: string; verified?: string; passwordReset?: string }>
}) {
  const { callbackUrl, verified, passwordReset } = await searchParams

  return (
    <LoginForm callbackUrl={callbackUrl ?? null} verified={verified === '1'} passwordReset={passwordReset === '1'} />
  )
}
