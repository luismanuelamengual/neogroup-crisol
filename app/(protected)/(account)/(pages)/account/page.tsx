import type { Metadata } from 'next'
import { auth } from '@/app/(auth)/services/auth'
import AccountForm from '@/app/(protected)/(account)/components/AccountForm'
import { getT } from '@/app/i18n/server'
import { User } from '@/app/models/User'

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())('metadata.profile') }
}

export default async function AccountPage() {
  const session = await auth()
  const userId = Number(session!.user.id)
  const user = await User.find(userId)

  return (
    <AccountForm
      account={{
        name: user?.name ?? '',
        lastName: user?.lastName ?? '',
        nickname: user?.nickname ?? '',
        displayName: user?.displayName ?? '',
        email: user?.email ?? ''
      }}
    />
  )
}
