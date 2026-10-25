'use client'

import './index.scss'
import Alert from '@mui/material/Alert'
import Divider from '@mui/material/Divider'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { FormEvent, useState } from 'react'
import GameButton from '@/app/components/GameButton'
import { useT } from '@/app/i18n/I18nProvider'

interface LoginFormProps {
  callbackUrl: string | null
  verified?: boolean
  passwordReset?: boolean
}

/** Google "G" logo (brand asset required by Google's sign-in guidelines). */
export function GoogleLogo() {
  return (
    <svg className="google-logo" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  )
}

export default function LoginForm({ callbackUrl, verified, passwordReset }: LoginFormProps) {
  const t = useT()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const targetUrl = callbackUrl ? `/?callbackUrl=${encodeURIComponent(callbackUrl)}` : '/'

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setLoading(true)

    const response = await signIn('credentials', { email, password, redirect: false })

    if (response?.error) {
      setError(t('auth.login.invalidCredentials'))
      setLoading(false)

      return
    }

    router.push(targetUrl)
    router.refresh()
  }

  const handleGoogleSignIn = () => {
    signIn('google', { redirectTo: targetUrl })
  }

  return (
    <div className="auth-form">
      <Typography variant="h5" component="h1" className="title">
        {t('auth.login.title')}
      </Typography>
      <Typography variant="body2" color="text.secondary" className="subtitle">
        {t('auth.login.subtitle')}
      </Typography>
      <GameButton
        color="ghost"
        fullWidth
        className="google-button"
        startIcon={<GoogleLogo />}
        onClick={handleGoogleSignIn}
      >
        {t('auth.login.google')}
      </GameButton>
      <Divider className="divider">{t('auth.login.or')}</Divider>
      <form onSubmit={handleSubmit} className="form">
        {verified && <Alert severity="success">{t('auth.login.verified')}</Alert>}
        {passwordReset && <Alert severity="success">{t('auth.login.passwordReset')}</Alert>}
        {error && <Alert severity="error">{error}</Alert>}
        <TextField
          label={t('auth.email')}
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          fullWidth
          autoComplete="email"
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <TextField
          label={t('auth.password')}
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          fullWidth
          autoComplete="current-password"
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <GameButton type="submit" fullWidth loading={loading}>
          {t('auth.login.submit')}
        </GameButton>
        <Typography variant="body2" className="forgot-password">
          <Link href="/forgot-password" className="text-link">
            {t('auth.login.forgotPassword')}
          </Link>
        </Typography>
      </form>
      <Typography variant="body2" className="footer">
        {t('auth.login.noAccount')}{' '}
        <Link
          href={`/register${callbackUrl ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ''}`}
          className="text-link"
        >
          {t('auth.login.register')}
        </Link>
      </Typography>
    </div>
  )
}
