'use client'

import './index.scss'
import AcUnitIcon from '@mui/icons-material/AcUnit'
import AirIcon from '@mui/icons-material/Air'
import CoronavirusIcon from '@mui/icons-material/Coronavirus'
import CycloneIcon from '@mui/icons-material/Cyclone'
import HardwareIcon from '@mui/icons-material/Hardware'
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment'
import WaterDropIcon from '@mui/icons-material/WaterDrop'
import ClickAwayListener from '@mui/material/ClickAwayListener'
import Tooltip from '@mui/material/Tooltip'
import classNames from 'classnames'
import { useState } from 'react'
import { getHardshipDefinition, HardshipKind } from '@/app/(protected)/(engine)/data/hardships'
import type { ActiveHardship } from '@/app/(protected)/(engine)/utils/hardships'
import { useT } from '@/app/i18n/I18nProvider'

const ICONS: Record<HardshipKind, typeof AcUnitIcon> = {
  [HardshipKind.THIRST]: WaterDropIcon,
  [HardshipKind.SPORES]: CoronavirusIcon,
  [HardshipKind.THIN_AIR]: AirIcon,
  [HardshipKind.RUST]: HardwareIcon,
  [HardshipKind.COLD]: AcUnitIcon,
  [HardshipKind.HEAT]: LocalFireDepartmentIcon,
  [HardshipKind.VOID]: CycloneIcon
}
/** A share as a whole percent (0.12 → 12). */
const percent = (share: number) => Math.round(share * 100)

/** The numbers a hardship is told with: what it takes now, what each step adds and its maximum. */
export function hardshipNumbers(hardship: Pick<ActiveHardship, 'biome' | 'kind' | 'value'>) {
  const definition = getHardshipDefinition(hardship.biome)!
  const spores = hardship.kind === HardshipKind.SPORES

  return {
    value: spores ? hardship.value : percent(hardship.value),
    perStep: spores ? definition.perStep : percent(definition.perStep),
    max: spores ? (definition.max ?? 0) : percent(definition.max ?? 0)
  }
}

/**
 * The hardship that weighs on the party where it stands (top of the map):
 * its icon and what it takes away now. A tap (or hovering it) explains it.
 */
export default function HardshipBadge({ hardship }: { hardship: ActiveHardship }) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const Icon = ICONS[hardship.kind]
  const numbers = hardshipNumbers(hardship)
  const key = `world.hardships.${hardship.kind}` as const
  const name = t(`${key}.name`)

  return (
    <ClickAwayListener onClickAway={() => setOpen(false)}>
      <span>
        <Tooltip
          open={open}
          onOpen={() => setOpen(true)}
          onClose={() => setOpen(false)}
          disableTouchListener
          classes={{ tooltip: 'hardship-tooltip' }}
          title={
            <>
              <strong>{name}</strong>
              <span className="now">{t(`${key}.now`, numbers)}</span>
              <span>{t(`${key}.description`, numbers)}</span>
              <span className="steps">
                {t('world.hardships.steps', { count: hardship.steps })}
                {hardship.maxed && ` · ${t('world.hardships.maxed')}`}
              </span>
              <span className="relief">{t('world.hardships.relief')}</span>
            </>
          }
        >
          <button
            type="button"
            className={classNames('hardship-badge', `hardship-${hardship.kind}`, { maxed: hardship.maxed })}
            aria-label={`${name}: ${t(`${key}.now`, numbers)}`}
            onClick={() => setOpen(true)}
          >
            <Icon fontSize="small" />
            <span className="label">{name}</span>
            <span className="value">{t(`${key}.short`, numbers)}</span>
          </button>
        </Tooltip>
      </span>
    </ClickAwayListener>
  )
}
