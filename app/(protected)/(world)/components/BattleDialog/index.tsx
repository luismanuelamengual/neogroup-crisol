'use client'

import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
import { Encounter } from '@/app/(protected)/(engine)/models/Encounter'
import GameButton from '@/app/components/GameButton'
import { useT } from '@/app/i18n/I18nProvider'

interface BattleDialogProps {
  encounter: Encounter | null
  name: string
  onWin: () => void
  onLose: () => void
  onRetreat: () => void
}

/**
 * Stand-in for the battle until phase 4: tells what the fight is and lets the
 * player choose how it ends. It can't be closed without an outcome.
 */
export default function BattleDialog({ encounter, name, onWin, onLose, onRetreat }: BattleDialogProps) {
  const t = useT()

  return (
    <Dialog open={!!encounter} fullWidth maxWidth="xs">
      {encounter && (
        <>
          <DialogTitle>
            {t('world.battle.title', { kind: t(`world.encounters.${encounter.kind}`), level: encounter.level })}
          </DialogTitle>
          <DialogContent>
            {name !== t(`world.encounters.${encounter.kind}`) && (
              <DialogContentText sx={{ color: 'var(--color-gold)', fontWeight: 800, mb: 1 }}>{name}</DialogContentText>
            )}
            <DialogContentText>{t('world.battle.placeholder')}</DialogContentText>
            {!encounter.canRetreat && (
              <DialogContentText sx={{ mt: 1, fontSize: '0.85rem' }}>{t('world.battle.noRetreat')}</DialogContentText>
            )}
          </DialogContent>
          <DialogActions sx={{ gap: 1, p: 2, flexWrap: 'wrap' }}>
            {encounter.canRetreat && (
              <GameButton color="ghost" size="small" onClick={onRetreat}>
                {t('world.battle.retreat')}
              </GameButton>
            )}
            <GameButton color="magenta" size="small" onClick={onLose}>
              {t('world.battle.lose')}
            </GameButton>
            <GameButton color="lime" size="small" onClick={onWin}>
              {t('world.battle.win')}
            </GameButton>
          </DialogActions>
        </>
      )}
    </Dialog>
  )
}
