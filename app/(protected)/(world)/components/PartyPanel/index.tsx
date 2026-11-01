'use client'

import './index.scss'
import LocalDrinkIcon from '@mui/icons-material/LocalDrink'
import ButtonBase from '@mui/material/ButtonBase'
import Tooltip from '@mui/material/Tooltip'
import classNames from 'classnames'
import { CharacterId } from '@/app/(protected)/(engine)/models/CharacterId'
import { CharacterState } from '@/app/(protected)/(engine)/models/CharacterState'
import { Flask } from '@/app/(protected)/(engine)/models/Flask'
import { ACTIVE_HEROES } from '@/app/(protected)/(engine)/utils/battle'
import { getAttributePoints, getMaxHealth, getSkillPoints } from '@/app/(protected)/(engine)/utils/heroes'
import { xpToNextLevel } from '@/app/(protected)/(engine)/utils/progression'
import { getFocus } from '@/app/(protected)/(engine)/utils/worldMap'
import { useT } from '@/app/i18n/I18nProvider'
import type { MessageKey } from '@/app/i18n/messages'

interface PartyPanelProps {
  characters: CharacterState[]
  flask: Flask
  disabled: boolean
  onDrink: () => void
  /** Opens the page of a hero. */
  onOpenHero: (id: CharacterId) => void
  /** Echoes waiting to be assigned (marked on every hero, any of them can take them). */
  echoes: number
}

const share = (value: number, max: number) => `${Math.round(Math.min(1, value / max) * 100)}%`

/**
 * Bottom left of the map: a plaque per hero with its health, focus and
 * experience (the active ones lit), which opens its page, and the Amber Flask.
 */
export default function PartyPanel({ characters, flask, disabled, onDrink, onOpenHero, echoes }: PartyPanelProps) {
  const t = useT()
  const hurt = characters.some((character) => character.health < getMaxHealth(character))
  const hint =
    flask.charges === 0
      ? t('world.flask.empty')
      : !hurt
        ? t('world.flask.full')
        : t('world.flask.heals', { potency: flask.potency })

  return (
    <div className="party-panel">
      <ul className="party">
        {characters.map((character, position) => {
          const name = t(`characters.${character.id}.name` as MessageKey)
          const maxHealth = getMaxHealth(character)
          const { focus, maxFocus } = getFocus(character)
          const points = getAttributePoints(character) + Math.max(0, getSkillPoints(character))
          const active = position < ACTIVE_HEROES

          return (
            <li key={character.id}>
              <ButtonBase
                className={classNames('hero', { active, reserve: !active, fallen: character.health === 0 })}
                disabled={disabled}
                onClick={() => onOpenHero(character.id)}
                aria-label={t('party.openHero', { name })}
              >
                <span className="header">
                  <span className="name">{name}</span>
                  <span className="level">{t('world.levelShort', { level: character.level })}</span>
                </span>
                <span className="bar health">
                  <span
                    className={classNames('fill', { low: character.health / maxHealth < 0.3 })}
                    style={{ width: share(character.health, maxHealth) }}
                  />
                </span>
                <span className="bar focus">
                  <span className="fill" style={{ width: share(focus, maxFocus) }} />
                </span>
                <span className="bar xp">
                  <span className="fill" style={{ width: share(character.xp, xpToNextLevel(character.level)) }} />
                </span>
                {points > 0 && (
                  <span className="badge" title={t('party.pointsBadge')}>
                    {points}
                  </span>
                )}
                {points === 0 && echoes > 0 && <span className="badge echo" title={t('party.echoesBadge')} />}
              </ButtonBase>
            </li>
          )
        })}
        <li>
          <Tooltip title={`${t('world.flask.name')}: ${hint}`}>
            <span className="flask-wrap">
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
        </li>
      </ul>
    </div>
  )
}
