'use client'

import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
import GameButton from '@/app/components/GameButton'
import { useT } from '@/app/i18n/I18nProvider'

interface NewGameDialogProps {
  open: boolean
  starting: boolean
  onCancel: () => void
  onConfirm: () => void
}

/** Asks before a new game replaces the saved one (there is only one per account and it can not be undone). */
export default function NewGameDialog({ open, starting, onCancel, onConfirm }: NewGameDialogProps) {
  const t = useT()

  return (
    <Dialog open={open} onClose={starting ? undefined : onCancel} fullWidth maxWidth="xs">
      <DialogTitle>{t('home.newGameConfirm.title')}</DialogTitle>
      <DialogContent>
        <DialogContentText>{t('home.newGameConfirm.text')}</DialogContentText>
      </DialogContent>
      <DialogActions sx={{ gap: 1, p: 2 }}>
        <GameButton color="ghost" size="small" onClick={onCancel} disabled={starting}>
          {t('common.cancel')}
        </GameButton>
        <GameButton size="small" color="magenta" onClick={onConfirm} loading={starting}>
          {t('home.newGameConfirm.confirm')}
        </GameButton>
      </DialogActions>
    </Dialog>
  )
}
