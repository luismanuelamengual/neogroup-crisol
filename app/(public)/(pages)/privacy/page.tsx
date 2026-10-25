import type { Metadata } from 'next'
import { LOCALE_TAGS } from '@/app/i18n/config'
import { getLocale, getT } from '@/app/i18n/server'
import { CONTACT_EMAIL, PRIVACY_POLICY_UPDATED_AT } from '@/app/utils/legal'

const SECTIONS = [
  'data',
  'use',
  'thirdParties',
  'storage',
  'retention',
  'deletion',
  'security',
  'children',
  'changes'
] as const

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())('metadata.privacy') }
}

/** Privacy policy. Public (signed in or not): Google Play links to it. */
export default async function PrivacyPage() {
  const t = await getT()
  const locale = await getLocale()
  const updatedAt = PRIVACY_POLICY_UPDATED_AT.toLocaleDateString(LOCALE_TAGS[locale], {
    dateStyle: 'long',
    timeZone: 'UTC'
  })

  return (
    <article>
      <h1>{t('legal.privacy.title')}</h1>
      <p className="updated">{t('legal.updatedAt', { date: updatedAt })}</p>
      <p>{t('legal.privacy.intro')}</p>
      {SECTIONS.map((section) => (
        <section key={section}>
          <h2>{t(`legal.privacy.${section}.title`)}</h2>
          <p>{t(`legal.privacy.${section}.text`, { email: CONTACT_EMAIL })}</p>
        </section>
      ))}
    </article>
  )
}
