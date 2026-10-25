'use client'

import '@/app/(auth)/components/LoginForm/index.scss'
import Alert from '@mui/material/Alert'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import Link from 'next/link'
import { FormEvent, useState } from 'react'
import { useAuth } from '@/app/(auth)/hooks/useAuth'
import GameButton from '@/app/components/GameButton'
import { useT } from '@/app/i18n/I18nProvider'

export default function RegisterForm({ callbackUrl }: { callbackUrl: string | null }) {
  const t = useT()
  const { registerUser } = useAuth()
  const [name, setName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [registered, setRegistered] = useState(false)
  const loginHref = `/login${callbackUrl ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ''}`
  const passwordsMismatch = confirmPassword.length > 0 && password !== confirmPassword

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError(t('auth.register.passwordsMismatchDot'))

      return
    }

    setLoading(true)

    try {
      await registerUser({ name, lastName, email, password })
      setRegistered(true)
    } catch (requestError) {
      setError((requestError as Error).message || t('auth.somethingWentWrong'))
    } finally {
      setLoading(false)
    }
  }

  if (registered) {
    return (
      <div className="auth-form">
        <Typography variant="h5" component="h1" className="title">
          {t('auth.register.verifyTitle')}
        </Typography>
        <Alert severity="success">{t('auth.register.verifySent', { email })}</Alert>
        <Typography variant="body2" className="footer">
          {t('auth.register.alreadyActivated')}{' '}
          <Link href={loginHref} className="text-link">
            {t('auth.register.login')}
          </Link>
        </Typography>
      </div>
    )
  }

  return (
    <div className="auth-form">
      <Typography variant="h5" component="h1" className="title">
        {t('auth.register.title')}
      </Typography>
      <form onSubmit={handleSubmit} className="form">
        {error && <Alert severity="error">{error}</Alert>}
        <TextField
          label={t('auth.playerName')}
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
          fullWidth
          autoComplete="given-name"
          slotProps={{ htmlInput: { maxLength: 40 }, inputLabel: { shrink: true } }}
        />
        <TextField
          label={t('auth.lastName')}
          value={lastName}
          onChange={(event) => setLastName(event.target.value)}
          fullWidth
          autoComplete="family-name"
          slotProps={{ htmlInput: { maxLength: 40 }, inputLabel: { shrink: true } }}
        />
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
          autoComplete="new-password"
          helperText={t('auth.register.passwordHint')}
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <TextField
          label={t('auth.register.repeatPassword')}
          type="password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          required
          fullWidth
          autoComplete="new-password"
          error={passwordsMismatch}
          helperText={passwordsMismatch ? t('auth.register.passwordsMismatch') : ' '}
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <GameButton type="submit" fullWidth loading={loading}>
          {t('auth.register.submit')}
        </GameButton>
      </form>
      <Typography variant="body2" className="footer">
        {t('auth.register.haveAccount')}{' '}
        <Link href={loginHref} className="text-link">
          {t('auth.register.login')}
        </Link>
      </Typography>
    </div>
  )
}
