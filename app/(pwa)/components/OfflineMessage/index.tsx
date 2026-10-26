'use client'

import { useT } from '@/app/i18n/I18nProvider'

/** Content of the offline fallback page (see ~offline/page.tsx). */
export default function OfflineMessage() {
  const t = useT()

  return (
    <main
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.75rem',
        padding: '2rem',
        textAlign: 'center',
        color: '#f4e7cc',
        background: '#0d0806'
      }}
    >
      <div style={{ fontSize: '3rem' }}>🔥</div>
      <h1
        style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 700, margin: 0, color: '#e8b85a' }}
      >
        {t('pwa.offlineTitle')}
      </h1>
      <p style={{ maxWidth: '28rem', margin: 0, color: '#b8a07a', lineHeight: 1.5 }}>{t('pwa.offlineText')}</p>
    </main>
  )
}
