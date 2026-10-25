// Fonts are self-hosted (bundled from npm) so they also work offline inside the installed PWA.
import '@fontsource/bungee/400.css'
import '@fontsource-variable/nunito/index.css'
import './globals.scss'
import { SerwistProvider } from '@serwist/turbopack/react'
import type { Metadata, Viewport } from 'next'
import Script from 'next/script'
import { ReactNode } from 'react'
import { Toaster } from 'react-hot-toast'
import { PWA_CONFIG } from '@/app/(pwa)/services/pwa'
import ThemeRegistry from '@/app/components/ThemeRegistry'
import I18nProvider from '@/app/i18n/I18nProvider'
import { getLocale, getT } from '@/app/i18n/server'

const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT()

  return {
    applicationName: PWA_CONFIG.name,
    title: {
      default: PWA_CONFIG.name,
      template: `%s · ${PWA_CONFIG.name}`
    },
    description: t('pwa.description'),
    manifest: '/manifest.webmanifest',
    appleWebApp: {
      capable: true,
      statusBarStyle: 'black-translucent',
      title: PWA_CONFIG.shortName
    },
    formatDetection: {
      telephone: false
    },
    icons: {
      icon: '/favicon.ico',
      apple: '/apple-touch-icon.png'
    }
  }
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
  themeColor: PWA_CONFIG.themeColor
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale()

  return (
    <html lang={locale}>
      {GTM_ID && (
        <head>
          <Script id="gtm-script" strategy="afterInteractive">
            {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${GTM_ID}');`}
          </Script>
        </head>
      )}
      <body>
        {GTM_ID && (
          <noscript>
            <iframe
              src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
              height="0"
              width="0"
              style={{ display: 'none', visibility: 'hidden' }}
            />
          </noscript>
        )}
        <SerwistProvider swUrl="/serwist/sw.js">
          <ThemeRegistry>
            <I18nProvider locale={locale}>{children}</I18nProvider>
            <Toaster
              position="bottom-center"
              toastOptions={{
                style: {
                  background: 'var(--color-panel)',
                  color: 'var(--color-text)',
                  border: '3px solid var(--color-panel-border)',
                  borderRadius: 14,
                  fontWeight: 700
                }
              }}
            />
          </ThemeRegistry>
        </SerwistProvider>
      </body>
    </html>
  )
}
