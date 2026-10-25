import { DefaultSession } from 'next-auth'
import type { Locale } from '@/app/i18n/config'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      locale?: Locale
    } & DefaultSession['user']
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    userId?: number
    locale?: Locale
  }
}
