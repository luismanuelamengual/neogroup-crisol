'use client'

import './index.scss'
import MenuItem from '@mui/material/MenuItem'
import TextField from '@mui/material/TextField'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FormEvent, useState } from 'react'
import DeleteAccountDialog from '@/app/(protected)/(account)/components/DeleteAccountDialog'
import { useAccount } from '@/app/(protected)/(account)/hooks/useAccount'
import { useUserStore } from '@/app/(protected)/stores/users'
import GameButton from '@/app/components/GameButton'
import GamePanel from '@/app/components/GamePanel'
import PlayerAvatar from '@/app/components/PlayerAvatar'
import { useNotifications } from '@/app/hooks/useNotifications'
import { isLocale, Locale, LOCALE_FLAGS, LOCALE_NAMES, LOCALES } from '@/app/i18n/config'
import { useI18n } from '@/app/i18n/I18nProvider'
import { createTranslator } from '@/app/i18n/translate'

/**
 * Player profile: a panel with the badge and every setting, saved together with
 * one button, plus the account deletion and a link to the privacy policy.
 */
interface AccountFormProps {
  account: { name: string; lastName: string; nickname: string; displayName: string; email: string }
}

export default function AccountForm({ account }: AccountFormProps) {
  const router = useRouter()
  const { t, locale } = useI18n()
  const { updateAccount } = useAccount()
  const { showSuccessMessage } = useNotifications()
  const [profile, setProfile] = useState(account)
  const [name, setName] = useState(account.name)
  const [lastName, setLastName] = useState(account.lastName)
  const [nickname, setNickname] = useState(account.nickname)
  const [selectedLocale, setSelectedLocale] = useState<Locale>(locale)
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)

    try {
      const updated = await updateAccount({ name, lastName, nickname, locale: selectedLocale })
      const user = useUserStore.getState().user

      setProfile({
        ...profile,
        name: updated.name,
        lastName: updated.lastName ?? '',
        nickname: updated.nickname ?? '',
        displayName: updated.displayName
      })

      // Keep the app bar badge in sync.
      if (user) {
        useUserStore.setState({
          user: {
            ...user,
            name: updated.name,
            lastName: updated.lastName,
            nickname: updated.nickname,
            displayName: updated.displayName
          }
        })
      }

      // The page still runs in the old language until the refresh arrives: confirm in the saved one.
      showSuccessMessage(createTranslator(updated.locale)('account.saved'))
      router.refresh()
    } catch {
      // The error toast is shown by useRequests.
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="account-page">
      <GamePanel className="profile" title={t('account.profile')}>
        <div className="badge">
          <PlayerAvatar name={profile.displayName || '?'} className="avatar" />
          <div>
            <div className="name">{profile.displayName}</div>
            <div className="email">{profile.email}</div>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="form">
          <TextField
            label={t('account.playerNameTitle')}
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            fullWidth
            slotProps={{ htmlInput: { maxLength: 40 }, inputLabel: { shrink: true } }}
          />
          <TextField
            label={t('account.lastNameTitle')}
            value={lastName}
            onChange={(event) => setLastName(event.target.value)}
            fullWidth
            slotProps={{ htmlInput: { maxLength: 40 }, inputLabel: { shrink: true } }}
          />
          <TextField
            label={t('account.nicknameTitle')}
            value={nickname}
            onChange={(event) => setNickname(event.target.value)}
            fullWidth
            helperText={t('account.nicknameHint')}
            slotProps={{ htmlInput: { maxLength: 40 }, inputLabel: { shrink: true } }}
          />
          <TextField
            select
            label={t('account.languageLabel')}
            value={selectedLocale}
            onChange={(event) => isLocale(event.target.value) && setSelectedLocale(event.target.value)}
            fullWidth
            slotProps={{ inputLabel: { shrink: true } }}
          >
            {LOCALES.map((option) => (
              <MenuItem key={option} value={option}>
                {LOCALE_FLAGS[option]} {LOCALE_NAMES[option]}
              </MenuItem>
            ))}
          </TextField>
          <GameButton type="submit" color="cyan" fullWidth loading={saving}>
            {t('account.save')}
          </GameButton>
        </form>
      </GamePanel>
      <GamePanel className="danger-zone" title={t('account.delete.section')} accent="magenta">
        <p className="danger-text">{t('account.delete.description')}</p>
        <DeleteAccountDialog />
      </GamePanel>
      <Link href="/privacy" className="text-link privacy-link">
        {t('legal.privacyLink')}
      </Link>
    </div>
  )
}
