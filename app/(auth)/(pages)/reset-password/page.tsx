import type { Metadata } from 'next'
import AuthMessage from '@/app/(auth)/components/AuthMessage'
import ResetPasswordForm from '@/app/(auth)/components/ResetPasswordForm'
import { getT } from '@/app/i18n/server'

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())('metadata.newPassword') }
}

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams
  const t = await getT()

  if (!token) {
    return (
      <AuthMessage
        title={t('auth.verify.invalidTitle')}
        severity="error"
        linkHref="/forgot-password"
        linkLabel={t('auth.reset.requestNew')}
      >
        {t('auth.resetInvalid')}
      </AuthMessage>
    )
  }

  return <ResetPasswordForm token={token} />
}
