import type { Metadata } from 'next'
import AuthMessage from '@/app/(auth)/components/AuthMessage'
import { getT } from '@/app/i18n/server'

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())('metadata.verifyEmail') }
}

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams
  const t = await getT()

  if (error === 'expiredToken') {
    return (
      <AuthMessage
        title={t('auth.verify.expiredTitle')}
        severity="warning"
        linkHref="/register"
        linkLabel={t('auth.verify.registerAgain')}
      >
        {t('auth.verify.expiredText')}
      </AuthMessage>
    )
  }

  if (error) {
    return (
      <AuthMessage
        title={t('auth.verify.invalidTitle')}
        severity="error"
        linkHref="/register"
        linkLabel={t('auth.verify.registerAgain')}
      >
        {t('auth.verify.invalidText')}
      </AuthMessage>
    )
  }

  return (
    <AuthMessage title={t('auth.verify.title')} severity="info">
      {t('auth.verify.text')}
    </AuthMessage>
  )
}
