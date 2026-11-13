'use client'

import './index.scss'
import Dialog from '@mui/material/Dialog'
import ItemIcon, { IconSubject } from '@/app/(protected)/(party)/components/ItemIcon'
import LootGrid from '@/app/(protected)/(party)/components/LootGrid'
import GameButton from '@/app/components/GameButton'
import GamePanel from '@/app/components/GamePanel'
import { useT } from '@/app/i18n/I18nProvider'

/** How the window shows one reward. */
export interface RewardView {
  text: string
  /** Its picture, if it has one. */
  icon?: IconSubject
  /** Things that pile up (gold, items, Echoes): a tile with the picture, how much and the name, instead of the text. */
  loot?: { amount: string; name: string }
}

interface RewardsDialogProps {
  /** What the point or the chest gave; nothing shows while it is empty. */
  rewards: RewardView[]
  onClose: () => void
}

/** What a point gives (a camp, a freed hero, a rune, a chest...), big and in the middle of the screen. */
export default function RewardsDialog({ rewards, onClose }: RewardsDialogProps) {
  const t = useT()
  const lines = rewards.filter((reward) => !reward.loot || !reward.icon)
  const loot = rewards.flatMap((reward, position) =>
    reward.loot && reward.icon
      ? [
          {
            key: `${position}:${reward.text}`,
            subject: reward.icon,
            amount: reward.loot.amount,
            name: reward.loot.name
          }
        ]
      : []
  )

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
        {lines.length > 0 && (
          <ul className="rewards-lines">
            {lines.map((reward, position) => (
              <li key={`${position}:${reward.text}`} style={{ animationDelay: `${150 + position * 180}ms` }}>
                {reward.icon && <ItemIcon subject={reward.icon} size={40} />}
                <span>{reward.text}</span>
              </li>
            ))}
          </ul>
        )}
        {loot.length > 0 && <LootGrid entries={loot} delay={150 + lines.length * 180} className="rewards-loot" />}
        <GameButton fullWidth onClick={onClose}>
          {t('battle.continue')}
        </GameButton>
      </GamePanel>
    </Dialog>
  )
}
