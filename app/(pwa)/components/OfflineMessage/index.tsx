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
        color: '#f8fafc',
        background: '#0b1026'
      }}
    >
      <div style={{ fontSize: '3rem' }}>🛰️</div>
      <h1
        style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 400, margin: 0, color: '#ffc233' }}
      >
        {t('pwa.offlineTitle')}
      </h1>
      <p style={{ maxWidth: '28rem', margin: 0, color: '#aab4e8', lineHeight: 1.5 }}>{t('pwa.offlineText')}</p>
    </main>
  )
}
