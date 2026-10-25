'use client'

import './index.scss'
import GroupsIcon from '@mui/icons-material/Groups'
import LocalDrinkIcon from '@mui/icons-material/LocalDrink'
import ButtonBase from '@mui/material/ButtonBase'
import Tooltip from '@mui/material/Tooltip'
import classNames from 'classnames'
import { CharacterState } from '@/app/(protected)/(engine)/models/CharacterState'
import { Flask } from '@/app/(protected)/(engine)/models/Flask'
import { getAttributePoints, getMaxHealth, getSkillPoints } from '@/app/(protected)/(engine)/utils/heroes'
import { useT } from '@/app/i18n/I18nProvider'
import type { MessageKey } from '@/app/i18n/messages'

interface PartyPanelProps {
  characters: CharacterState[]
  flask: Flask
  disabled: boolean
  onDrink: () => void
  /** Opens the party screen (builds, inventory, bestiary). */
  onOpenParty: () => void
  /** Echoes waiting to be assigned. */
  echoes: number
}

/** Bottom of the map: the party with its health, and the Amber Flask. */
export default function PartyPanel({ characters, flask, disabled, onDrink, onOpenParty, echoes }: PartyPanelProps) {
  const t = useT()
  const hurt = characters.some((character) => character.health < getMaxHealth(character))
  const hint =
    flask.charges === 0
      ? t('world.flask.empty')
      : !hurt
        ? t('world.flask.full')
        : t('world.flask.heals', { potency: flask.potency })
  const pending =
    echoes + characters.reduce((sum, character) => sum + getAttributePoints(character) + getSkillPoints(character), 0)

  return (
    <div className="party-panel">
      <ul className="party">
        {characters.map((character) => {
          const maxHealth = getMaxHealth(character)
          const share = character.health / maxHealth

          return (
            <li key={character.id} className={classNames({ fallen: character.health === 0 })}>
              <div className="header">
                <span className="name">{t(`characters.${character.id}.name` as MessageKey)}</span>
                <span className="level">{t('world.levelShort', { level: character.level })}</span>
              </div>
              <div className="health-bar">
                <div
                  className={classNames('fill', { low: share < 0.3 })}
                  style={{ width: `${Math.round(share * 100)}%` }}
                />
              </div>
              <span className="health">
                {character.health}/{maxHealth}
              </span>
            </li>
          )
        })}
      </ul>
      <ButtonBase className="open-party" onClick={onOpenParty} disabled={disabled} aria-label={t('party.open')}>
        <GroupsIcon />
        <span>{t('party.open')}</span>
        {pending > 0 && <span className="badge">{pending}</span>}
      </ButtonBase>
      <Tooltip title={`${t('world.flask.name')}: ${hint}`}>
        <span>
          <ButtonBase
            className="flask"
            onClick={onDrink}
            disabled={disabled || flask.charges === 0 || !hurt}
            aria-label={`${t('world.flask.drink')} ${t('world.flask.name')}`}
          >
            <LocalDrinkIcon />
            <span className="charges">
              {flask.charges}/{flask.maxCharges}
            </span>
            <span className="potency">{flask.potency}%</span>
          </ButtonBase>
        </span>
      </Tooltip>
    </div>
  )
}
