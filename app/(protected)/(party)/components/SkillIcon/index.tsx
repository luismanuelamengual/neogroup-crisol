'use client'

import './index.scss'
import AcUnitIcon from '@mui/icons-material/AcUnit'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import BoltIcon from '@mui/icons-material/Bolt'
import DarkModeIcon from '@mui/icons-material/DarkMode'
import FavoriteIcon from '@mui/icons-material/Favorite'
import GavelIcon from '@mui/icons-material/Gavel'
import KeyboardDoubleArrowUpIcon from '@mui/icons-material/KeyboardDoubleArrowUp'
import LandscapeIcon from '@mui/icons-material/Landscape'
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment'
import NavigationIcon from '@mui/icons-material/Navigation'
import ShieldIcon from '@mui/icons-material/Shield'
import WbSunnyIcon from '@mui/icons-material/WbSunny'
import SvgIcon, { SvgIconProps } from '@mui/material/SvgIcon'
import classNames from 'classnames'
import { ComponentType } from 'react'
import { getSkill } from '@/app/(protected)/(engine)/data/skills'
import { DamageType } from '@/app/(protected)/(engine)/models/DamageType'
import { StatusType } from '@/app/(protected)/(engine)/models/StatusType'
import { TargetType } from '@/app/(protected)/(engine)/models/TargetType'

/** A sword (Material Design Icons, Apache 2.0): the icons of MUI have no blade. */
function SwordIcon(props: SvgIconProps) {
  return (
    <SvgIcon {...props}>
      <path d="M6.92 5H5l9 9 1-.94M19.96 19.12l-.84.84a.996.996 0 0 1-1.41 0l-3.12-3.12-2.68 2.66-1.41-1.41 1.42-1.42L3 7.75V3h4.75l8.92 8.92 1.42-1.42 1.41 1.41-2.67 2.67 3.12 3.12c.4.4.4 1.03.01 1.42" />
    </SvgIcon>
  )
}

const TYPE_ICONS: Record<DamageType, ComponentType<{ fontSize?: 'inherit' }>> = {
  [DamageType.SLASH]: SwordIcon,
  [DamageType.PIERCE]: NavigationIcon,
  [DamageType.BLUNT]: GavelIcon,
  [DamageType.FIRE]: LocalFireDepartmentIcon,
  [DamageType.ICE]: AcUnitIcon,
  [DamageType.LIGHTNING]: BoltIcon,
  [DamageType.EARTH]: LandscapeIcon,
  [DamageType.LIGHT]: WbSunnyIcon,
  [DamageType.DARKNESS]: DarkModeIcon
}

/** The kind of a special, by what it does: hurt, heal or strengthen. */
export function getSkillKind(skillId: string): 'damage' | 'heal' | 'buff' {
  const skill = getSkill(skillId)

  if (skill.heal || skill.revive) {
    return 'heal'
  }

  return skill.power > 0 ? 'damage' : 'buff'
}

function iconOf(skillId: string) {
  const skill = getSkill(skillId)

  if (skill.revive) {
    return AutoAwesomeIcon
  }

  if (skill.heal) {
    return FavoriteIcon
  }

  if (skill.power === 0) {
    return skill.statuses?.some((status) => status.type === StatusType.DEFENSE_UP)
      ? ShieldIcon
      : KeyboardDoubleArrowUpIcon
  }

  return TYPE_ICONS[skill.damageType]
}

interface SkillIconProps {
  skillId: string
  size?: 'small' | 'medium' | 'large'
  className?: string
}

/**
 * The emblem of a special: a medallion colored by its damage type, with an
 * icon of what it does, and a double ring when it reaches every enemy or ally.
 */
export default function SkillIcon({ skillId, size = 'medium', className }: SkillIconProps) {
  const skill = getSkill(skillId)
  const Icon = iconOf(skillId)
  const area = skill.target === TargetType.ALL_ENEMIES || skill.target === TargetType.ALL_ALLIES

  return (
    <span
      className={classNames(
        'skill-icon',
        size,
        `type-${skill.damageType}`,
        `kind-${getSkillKind(skillId)}`,
        className,
        {
          area
        }
      )}
      aria-hidden
    >
      <Icon fontSize="inherit" />
    </span>
  )
}
