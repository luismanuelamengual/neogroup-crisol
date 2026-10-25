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

export default function ForgotPasswordForm() {
  const t = useT()
  const { requestPasswordReset } = useAuth()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setLoading(true)

    try {
      await requestPasswordReset(email)
    } catch {
      // Silently ignored to avoid user enumeration.
    }

    setLoading(false)
    setSent(true)
  }

  return (
    <div className="auth-form">
      <Typography variant="h5" component="h1" className="title">
        {t('auth.forgot.title')}
      </Typography>
      {sent ? (
        <Alert severity="success">{t('auth.forgot.sent', { email })}</Alert>
      ) : (
        <>
          <Typography variant="body2" color="text.secondary" className="subtitle">
            {t('auth.forgot.subtitle')}
          </Typography>
          <form onSubmit={handleSubmit} className="form">
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
            <GameButton type="submit" fullWidth loading={loading}>
              {t('auth.forgot.submit')}
            </GameButton>
          </form>
        </>
      )}
      <Typography variant="body2" className="footer">
        <Link href="/login" className="text-link">
          {t('auth.forgot.back')}
        </Link>
      </Typography>
    </div>
  )
}
