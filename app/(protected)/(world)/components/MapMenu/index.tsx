'use client'

import './index.scss'
import BackpackIcon from '@mui/icons-material/Backpack'
import MenuBookIcon from '@mui/icons-material/MenuBook'
import ButtonBase from '@mui/material/ButtonBase'
import { useT } from '@/app/i18n/I18nProvider'

interface MapMenuProps {
  disabled: boolean
  onInventory: () => void
  onBestiary: () => void
}

/** Bottom right of the map: the inventory and the bestiary. */
export default function MapMenu({ disabled, onInventory, onBestiary }: MapMenuProps) {
  const t = useT()

  return (
    <div className="map-menu">
      <ButtonBase className="inventory" disabled={disabled} onClick={onInventory} aria-label={t('party.inventory')}>
        <BackpackIcon />
        <span>{t('party.inventory')}</span>
      </ButtonBase>
      <ButtonBase className="bestiary" disabled={disabled} onClick={onBestiary} aria-label={t('party.bestiary')}>
        <MenuBookIcon />
        <span>{t('party.bestiary')}</span>
      </ButtonBase>
    </div>
  )
}
