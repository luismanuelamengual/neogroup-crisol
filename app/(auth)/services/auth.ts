import bcrypt from 'bcryptjs'
import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import Google from 'next-auth/providers/google'
import { cache } from 'react'
import { authConfig } from '@/app/(auth)/services/auth.config'
import { isLocale } from '@/app/i18n/config'
import { detectLocale } from '@/app/i18n/detect'
import { User } from '@/app/models/User'
import { getUserDisplayName, normalizeName } from '@/app/utils/users'

export const { handlers, auth, signIn, signOut, unstable_update } = NextAuth({
  ...authConfig,
  providers: [
    Google({}),
    Credentials({
      credentials: {
        email: {},
        password: {}
      },
      async authorize(credentials) {
        const email = String(credentials?.email ?? '')
          .trim()
          .toLowerCase()
        const password = String(credentials?.password ?? '')

        if (!email || !password) {
          return null
        }

        const user = await User.where('email', email).first()

        if (!user?.passwordHash) {
          return null
        }

        const passwordMatches = await bcrypt.compare(password, user.passwordHash)

        if (!passwordMatches || !user.emailVerified || !user.active) {
          return null
        }

        return { id: String(user.id), email: user.email }
      }
    })
  ],
  callbacks: {
    ...authConfig.callbacks,

    async jwt({ token, user, account, profile, trigger }) {
      if (account?.provider === 'google' && token.email) {
        const email = token.email.toLowerCase()
        let dbUser = await User.where('email', email).first()

        // First Google sign-in: the account is created on the fly, already verified.
        if (!dbUser) {
          dbUser = new User()
          dbUser.email = email
          dbUser.passwordHash = null
          dbUser.name = normalizeName(String(profile?.given_name ?? profile?.name ?? '')) || null
          dbUser.lastName = normalizeName(String(profile?.family_name ?? '')) || null
          dbUser.emailVerified = true
          dbUser.active = true
          dbUser.locale = await detectLocale()
          await dbUser.save()
        } else {
          let changed = false

          if (!dbUser.emailVerified) {
            // Google already proved ownership of the address: an account registered
            // by email and never verified becomes verified.
            dbUser.emailVerified = true
            changed = true
          }

          // Accounts without a last name yet take it from Google ('' = cleared by the player, kept).
          const familyName = normalizeName(String(profile?.family_name ?? ''))

          if (dbUser.lastName === null && familyName) {
            dbUser.lastName = familyName
            changed = true
          }

          if (changed) {
            await dbUser.save()
          }
        }

        // Banned accounts cannot sign in, even via Google.
        if (!dbUser.active) {
          return null
        }

        token.userId = Number(dbUser.id)
        token.name = getUserDisplayName(dbUser)
        token.locale = dbUser.locale
      }

      if (account?.provider === 'credentials' && user?.id) {
        const dbUser = await User.find(Number(user.id))

        if (dbUser) {
          token.userId = Number(dbUser.id)
          token.name = getUserDisplayName(dbUser)
          token.locale = dbUser.locale
        }
      }

      // `unstable_update()` (e.g. after the player renames itself or changes its language) re-reads the user.
      if (trigger === 'update' && token.userId) {
        const dbUser = await User.find(token.userId)

        if (dbUser) {
          token.name = getUserDisplayName(dbUser)
          token.locale = dbUser.locale
        }
      }

      return token
    },

    async session({ session, token }) {
      if (token.userId) {
        session.user.id = String(token.userId)
        session.user.name = token.name ?? session.user.email ?? ''
        session.user.locale = isLocale(token.locale) ? token.locale : undefined
      }

      return session
    }
  }
})

export const getSession = cache(async () => {
  return await auth()
})
