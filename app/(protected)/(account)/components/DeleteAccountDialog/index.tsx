'use client'

import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
import TextField from '@mui/material/TextField'
import { FormEvent, useState } from 'react'
import { useAccount } from '@/app/(protected)/(account)/hooks/useAccount'
import GameButton from '@/app/components/GameButton'
import { useT } from '@/app/i18n/I18nProvider'

/**
 * "Eliminar cuenta": deletes the player's account and all its data for good.
 * The player has to type a confirmation word, since it can not be undone.
 * Required by Google Play for apps that let people create an account.
 */
export default function DeleteAccountDialog() {
  const t = useT()
  const { deleteAccount } = useAccount()
  const [open, setOpen] = useState(false)
  const [confirmation, setConfirmation] = useState('')
  const [deleting, setDeleting] = useState(false)
  const confirmWord = t('account.delete.confirmWord')
  const confirmed = confirmation.trim().toUpperCase() === confirmWord.toUpperCase()

  const close = () => {
    setOpen(false)
    setConfirmation('')
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()

    if (!confirmed) {
      return
    }

    setDeleting(true)

    try {
      await deleteAccount()
      // Full reload: the session cookie is gone, every cached screen must go too.
      window.location.assign('/')
    } catch {
      // The error toast is shown by useRequests.
      setDeleting(false)
    }
  }

  return (
    <>
      <GameButton color="magenta" fullWidth onClick={() => setOpen(true)}>
        {t('account.delete.button')}
      </GameButton>
      <Dialog open={open} onClose={close} fullWidth maxWidth="xs">
        <form onSubmit={handleSubmit}>
          <DialogTitle>{t('account.delete.title')}</DialogTitle>
          <DialogContent>
            <DialogContentText>{t('account.delete.warning')}</DialogContentText>
            <TextField
              autoFocus
              fullWidth
              margin="dense"
              label={t('account.delete.confirmLabel', { word: confirmWord })}
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              slotProps={{ htmlInput: { autoCapitalize: 'characters', autoComplete: 'off' } }}
            />
          </DialogContent>
          <DialogActions sx={{ gap: 1, p: 2 }}>
            <GameButton color="ghost" size="small" onClick={close}>
              {t('common.cancel')}
            </GameButton>
            <GameButton type="submit" size="small" color="magenta" disabled={!confirmed} loading={deleting}>
              {t('account.delete.confirm')}
            </GameButton>
          </DialogActions>
        </form>
      </Dialog>
    </>
  )
}
