import type { Metadata } from 'next'
import ForgotPasswordForm from '@/app/(auth)/components/ForgotPasswordForm'
import { getT } from '@/app/i18n/server'

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())('metadata.forgotPassword') }
}

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />
}
