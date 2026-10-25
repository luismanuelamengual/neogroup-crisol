'use client'

import './index.scss'
import CloudDoneIcon from '@mui/icons-material/CloudDone'
import CloudOffIcon from '@mui/icons-material/CloudOff'
import CloudSyncIcon from '@mui/icons-material/CloudSync'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn'
import MyLocationIcon from '@mui/icons-material/MyLocation'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import { SyncStatus } from '@/app/(protected)/(world)/stores/game'
import { useT } from '@/app/i18n/I18nProvider'

interface MapHudProps {
  location: string
  biome: string
  gold: number
  /** New Game+ cycle (0 = first playthrough). */
  cycle: number
  sync: SyncStatus
  onRecenter: () => void
}

const SYNC_ICONS: Record<SyncStatus, typeof CloudDoneIcon> = {
  synced: CloudDoneIcon,
  pending: CloudUploadIcon,
  syncing: CloudSyncIcon,
  offline: CloudOffIcon
}

/** Top of the map: where the party is, its gold and whether the game is saved. */
export default function MapHud({ location, biome, gold, cycle, sync, onRecenter }: MapHudProps) {
  const t = useT()
  const SyncIcon = SYNC_ICONS[sync]

  return (
    <div className="map-hud">
      <div className="location">
        <span className="biome">{biome}</span>
        <span className="name">{location}</span>
      </div>
      <div className="spacer" />
      {cycle > 0 && <span className="cycle">{t('home.cycle', { cycle })}</span>}
      <div className="gold" aria-label={t('world.gold')}>
        <MonetizationOnIcon fontSize="small" />
        {gold}
      </div>
      <Tooltip title={t(`world.sync.${sync}`)}>
        <span className={`sync sync-${sync}`} aria-label={t(`world.sync.${sync}`)}>
          <SyncIcon fontSize="small" />
        </span>
      </Tooltip>
      <IconButton className="recenter" onClick={onRecenter} size="small" aria-label={t('world.panel.here')}>
        <MyLocationIcon fontSize="small" />
      </IconButton>
    </div>
  )
}
