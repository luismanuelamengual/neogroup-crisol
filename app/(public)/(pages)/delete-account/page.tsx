import type { Metadata } from 'next'
import GameButton from '@/app/components/GameButton'
import { getT } from '@/app/i18n/server'
import { CONTACT_EMAIL } from '@/app/utils/legal'

const STEPS = ['signIn', 'profile', 'confirm'] as const

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())('metadata.deleteAccount') }
}

/**
 * How to delete a Crisol account and what is deleted. Public (signed in or
 * not): it is the "delete account" web link that Google Play asks for.
 */
export default async function DeleteAccountPage() {
  const t = await getT()

  return (
    <article>
      <h1>{t('legal.deleteAccount.title')}</h1>
      <p>{t('legal.deleteAccount.intro')}</p>
      <ol>
        {STEPS.map((step) => (
          <li key={step}>{t(`legal.deleteAccount.steps.${step}`)}</li>
        ))}
      </ol>
      <h2>{t('legal.deleteAccount.whatTitle')}</h2>
      <p>{t('legal.deleteAccount.whatText')}</p>
      <h2>{t('legal.deleteAccount.noAccessTitle')}</h2>
      <p>{t('legal.deleteAccount.noAccessText', { email: CONTACT_EMAIL })}</p>
      <div className="actions">
        <GameButton href="/account">{t('legal.deleteAccount.goToProfile')}</GameButton>
      </div>
    </article>
  )
}
