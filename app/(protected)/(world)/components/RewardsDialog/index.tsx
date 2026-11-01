'use client'

import './index.scss'
import Dialog from '@mui/material/Dialog'
import GameButton from '@/app/components/GameButton'
import GamePanel from '@/app/components/GamePanel'
import { useT } from '@/app/i18n/I18nProvider'

interface RewardsDialogProps {
  /** The texts of what the point gave; nothing shows while it is empty. */
  rewards: string[]
  onClose: () => void
}

/** What a point gives when its battle is won (a camp, a freed hero, a rune...), big and in the middle of the screen. */
export default function RewardsDialog({ rewards, onClose }: RewardsDialogProps) {
  const t = useT()

  return (
    <Dialog
      open={rewards.length > 0}
      onClose={onClose}
      fullWidth
      maxWidth="xs"
      className="rewards-dialog"
      slotProps={{ paper: { elevation: 0 } }}
    >
      <GamePanel title={t('world.rewards.title')}>
        <ul>
          {rewards.map((text, position) => (
            <li key={text} style={{ animationDelay: `${150 + position * 180}ms` }}>
              {text}
            </li>
          ))}
        </ul>
        <GameButton fullWidth onClick={onClose}>
          {t('battle.continue')}
        </GameButton>
      </GamePanel>
    </Dialog>
  )
}
