'use client'

import './index.scss'
import AllInclusiveIcon from '@mui/icons-material/AllInclusive'
import CloseIcon from '@mui/icons-material/Close'
import DirectionsWalkIcon from '@mui/icons-material/DirectionsWalk'
import ExploreIcon from '@mui/icons-material/Explore'
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment'
import StorefrontIcon from '@mui/icons-material/Storefront'
import IconButton from '@mui/material/IconButton'
import GameButton from '@/app/components/GameButton'
import { useT } from '@/app/i18n/I18nProvider'

interface PointPanelProps {
  name: string
  /** Line under the name: what waits there (kind and level), or its state. */
  detail: string | null
  /** Where the point is: the party stands on it, there is a route to it, or there is none yet. */
  reach: 'here' | 'route' | 'none'
  steps: number
  openCamp: boolean
  merchant: boolean
  canTeleport: boolean
  /** Crisol fell: New Game+ can start from this camp (the cycle that would start). */
  nextCycle: number | null
  busy: boolean
  onGo: () => void
  onRest: () => void
  onTeleport: () => void
  onNextCycle: () => void
  onShop: () => void
  onClose: () => void
}

/** The selected point of the map: what it is and what the party can do there. */
export default function PointPanel({
  name,
  detail,
  reach,
  steps,
  openCamp,
  merchant,
  canTeleport,
  nextCycle,
  busy,
  onGo,
  onRest,
  onTeleport,
  onNextCycle,
  onShop,
  onClose
}: PointPanelProps) {
  const t = useT()

  return (
    <div className="point-panel">
      <div className="header">
        <div className="titles">
          <span className="name">{name}</span>
          {detail && <span className="detail">{detail}</span>}
        </div>
        <IconButton size="small" onClick={onClose} aria-label={t('common.close')}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </div>
      {reach === 'none' && <p className="note">{t('world.panel.noRoute')}</p>}
      <div className="actions">
        {reach === 'route' && (
          <GameButton size="small" onClick={onGo} disabled={busy} startIcon={<DirectionsWalkIcon />}>
            {t('world.panel.go')} · {steps}
          </GameButton>
        )}
        {reach === 'here' && merchant && (
          <GameButton size="small" onClick={onShop} disabled={busy} startIcon={<StorefrontIcon />}>
            {t('world.panel.shop')}
          </GameButton>
        )}
        {reach === 'here' && openCamp && (
          <>
            <GameButton size="small" onClick={onRest} disabled={busy} startIcon={<LocalFireDepartmentIcon />}>
              {t('world.panel.rest')}
            </GameButton>
            <GameButton
              size="small"
              color="cyan"
              onClick={onTeleport}
              disabled={busy || !canTeleport}
              startIcon={<ExploreIcon />}
            >
              {t('world.panel.teleport')}
            </GameButton>
            {nextCycle !== null && (
              <GameButton
                size="small"
                color="magenta"
                onClick={onNextCycle}
                disabled={busy}
                startIcon={<AllInclusiveIcon />}
              >
                {t('world.panel.nextCycle', { cycle: nextCycle })}
              </GameButton>
            )}
          </>
        )}
      </div>
    </div>
  )
}
