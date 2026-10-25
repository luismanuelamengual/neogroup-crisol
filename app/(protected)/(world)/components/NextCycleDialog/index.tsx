'use client'

import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
import GameButton from '@/app/components/GameButton'
import { useT } from '@/app/i18n/I18nProvider'

interface NextCycleDialogProps {
  open: boolean
  /** The cycle that would start. */
  cycle: number
  onCancel: () => void
  onConfirm: () => void
}

/** Asks before New Game+ starts the world over (what is kept and what is lost). */
export default function NextCycleDialog({ open, cycle, onCancel, onConfirm }: NextCycleDialogProps) {
  const t = useT()

  return (
    <Dialog open={open} onClose={onCancel} fullWidth maxWidth="xs">
      <DialogTitle>{t('world.nextCycle.title', { cycle })}</DialogTitle>
      <DialogContent>
        <DialogContentText>{t('world.nextCycle.kept')}</DialogContentText>
        <DialogContentText sx={{ mt: 1.5 }}>{t('world.nextCycle.lost')}</DialogContentText>
      </DialogContent>
      <DialogActions sx={{ gap: 1, p: 2 }}>
        <GameButton color="ghost" size="small" onClick={onCancel}>
          {t('common.cancel')}
        </GameButton>
        <GameButton size="small" color="magenta" onClick={onConfirm}>
          {t('world.nextCycle.confirm', { cycle })}
        </GameButton>
      </DialogActions>
    </Dialog>
  )
}
