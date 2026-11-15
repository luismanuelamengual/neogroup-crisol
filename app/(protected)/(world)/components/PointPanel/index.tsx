'use client'

import './index.scss'
import AllInclusiveIcon from '@mui/icons-material/AllInclusive'
import ExploreIcon from '@mui/icons-material/Explore'
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment'
import StorefrontIcon from '@mui/icons-material/Storefront'
import ButtonBase from '@mui/material/ButtonBase'
import { useT } from '@/app/i18n/I18nProvider'

interface PointPanelProps {
  openCamp: boolean
  merchant: boolean
  canTeleport: boolean
  /** Crisol fell: New Game+ can start from this camp (the cycle that would start). */
  nextCycle: number | null
  busy: boolean
  onRest: () => void
  onTeleport: () => void
  onNextCycle: () => void
  onShop: () => void
}

/**
 * What the party can do at the point where it stands (an open camp or a
 * merchant): small buttons pinned over the hero on the map, shown by
 * themselves while the party is there.
 */
export default function PointPanel({
  openCamp,
  merchant,
  canTeleport,
  nextCycle,
  busy,
  onRest,
  onTeleport,
  onNextCycle,
  onShop
}: PointPanelProps) {
  const t = useT()

  return (
    <div className="point-panel">
      {merchant && (
        <ButtonBase className="shop" disabled={busy} onClick={onShop} aria-label={t('world.panel.shop')}>
          <StorefrontIcon />
          <span>{t('world.panel.shop')}</span>
        </ButtonBase>
      )}
      {openCamp && nextCycle !== null && (
        <ButtonBase
          className="next-cycle"
          disabled={busy}
          onClick={onNextCycle}
          aria-label={t('world.panel.nextCycle', { cycle: nextCycle })}
        >
          <AllInclusiveIcon />
          <span>{t('world.panel.nextCycle', { cycle: nextCycle })}</span>
        </ButtonBase>
      )}
      {openCamp && (
        <>
          <ButtonBase className="rest" disabled={busy} onClick={onRest} aria-label={t('world.panel.rest')}>
            <LocalFireDepartmentIcon />
            <span>{t('world.panel.rest')}</span>
          </ButtonBase>
          <ButtonBase
            className="teleport"
            disabled={busy || !canTeleport}
            onClick={onTeleport}
            aria-label={t('world.panel.teleport')}
          >
            <ExploreIcon />
            <span>{t('world.panel.teleport')}</span>
          </ButtonBase>
        </>
      )}
    </div>
  )
}
