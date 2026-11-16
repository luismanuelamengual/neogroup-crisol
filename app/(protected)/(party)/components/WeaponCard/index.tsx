'use client'

import './index.scss'
import LockIcon from '@mui/icons-material/Lock'
import Tooltip from '@mui/material/Tooltip'
import classNames from 'classnames'
import { getSkill } from '@/app/(protected)/(engine)/data/skills'
import {
  getUpgradeCost,
  MAX_WEAPON_LEVEL,
  Weapon,
  WEAPON_POWER_PER_LEVEL
} from '@/app/(protected)/(engine)/data/weapons'
import { CharacterState } from '@/app/(protected)/(engine)/models/CharacterState'
import { GameState } from '@/app/(protected)/(engine)/models/GameState'
import { canUpgradeWeapon, equipWeapon, getWeaponLevel, upgradeWeapon } from '@/app/(protected)/(engine)/utils/heroes'
import ItemIcon, { IconSubject } from '@/app/(protected)/(party)/components/ItemIcon'
import SkillIcon from '@/app/(protected)/(party)/components/SkillIcon'
import WeaponArt from '@/app/(protected)/(party)/components/WeaponArt'
import { bonusEntries, formatShare, itemName, skillName } from '@/app/(protected)/(party)/utils/describe'
import GameButton from '@/app/components/GameButton'
import { useT } from '@/app/i18n/I18nProvider'
import type { MessageKey } from '@/app/i18n/messages'

interface WeaponCardProps {
  state: GameState
  character: CharacterState
  weapon: Weapon
  /** The party stands on a cleared point: the weapon can be wielded and upgraded. */
  canSwap: boolean
  onChange: (state: GameState) => void
}

/** Levels between two effects of a weapon (+5, +10, +15 and +20). */
const MILESTONE_STEP = 5

/** What an upgrade asks for, with how much of it the party has. */
interface Requirement {
  key: string
  subject: IconSubject
  name: string
  have: number
  need: number
}

/**
 * A weapon of a hero: its picture large with its level, its numbers in tiles
 * (power, style and the effects of +5, +10, +15 and +20) and what the next
 * upgrade asks for, as the pictures of the stones and the gold with how many
 * the party has of each.
 */
export default function WeaponCard({ state, character, weapon, canSwap, onChange }: WeaponCardProps) {
  const t = useT()
  const held = weapon.id === character.weaponId
  const level = getWeaponLevel(character, weapon.id)
  const attack = getSkill(weapon.attack)
  const next = level < MAX_WEAPON_LEVEL ? level + 1 : null
  const cost = next ? getUpgradeCost(next) : null
  const traits = bonusEntries(t, weapon.traits)
  const reached = Math.floor(level / MILESTONE_STEP)
  const requirements: Requirement[] = cost
    ? [
        {
          key: cost.stoneId,
          subject: { type: 'item', id: cost.stoneId },
          name: itemName(t, cost.stoneId),
          have: state.inventory[cost.stoneId] ?? 0,
          need: cost.stones
        },
        { key: 'gold', subject: { type: 'gold' }, name: t('world.gold'), have: state.gold, need: cost.gold }
      ]
    : []

  return (
    <li className={classNames('weapon-card', { worn: held })}>
      <div className="showcase">
        <WeaponArt weapon={weapon} held={held} className="large" />
        <span className={classNames('level-badge', { max: !next })}>+{level}</span>
        <span
          className="level-track"
          role="meter"
          aria-valuemin={0}
          aria-valuemax={MAX_WEAPON_LEVEL}
          aria-valuenow={level}
          aria-label={t('party.weaponLevel', { level })}
        >
          <span className="fill" style={{ width: `${(level / MAX_WEAPON_LEVEL) * 100}%` }} />
        </span>
      </div>

      <div className="weapon-body">
        <div className="titles">
          <span className="name">{t(`weapons.${weapon.id}.name` as MessageKey)}</span>
          {held && <span className="held-tag">{t('party.weaponHeld')}</span>}
        </div>
        <div className="attack">
          <span className="kind">{t(`weapons.${weapon.id}.kind` as MessageKey)}</span>
          <span className="skill">
            <SkillIcon skillId={attack.id} size="small" />
            {skillName(t, attack.id)}
          </span>
          <span className={classNames('chip', `type-${attack.damageType}`)}>
            {t(`damageTypes.${attack.damageType}`)}
          </span>
          <span className="chip">{t(`targets.${attack.target}`)}</span>
        </div>

        <ul className="stats">
          <li className="power">
            <span className="value">
              {formatShare(WEAPON_POWER_PER_LEVEL * level)}
              {next && <span className="gain">→ {formatShare(WEAPON_POWER_PER_LEVEL * next)}</span>}
            </span>
            <span className="label">{t('party.weaponPower')}</span>
          </li>
          {traits.map((entry) => (
            <li key={entry.label} className={classNames({ bad: entry.bad })}>
              <span className="value">{entry.value}</span>
              <span className="label">{entry.label}</span>
            </li>
          ))}
          {traits.length === 0 && (
            <li className="balanced">
              <span className="value">=</span>
              <span className="label">{t('party.weaponBalanced')}</span>
            </li>
          )}
        </ul>

        <ol className="milestones" aria-label={t('party.weaponMilestones')}>
          {weapon.effects.map((effect, index) => {
            const at = (index + 1) * MILESTONE_STEP
            const unlocked = index < reached

            return (
              <li
                key={at}
                className={classNames({ unlocked, upcoming: index === reached })}
                title={t('party.weaponMilestone', { level: at })}
              >
                <span className="at">
                  {!unlocked && <LockIcon fontSize="inherit" />}+{at}
                </span>
                {bonusEntries(t, effect).map((entry) => (
                  <span key={entry.label} className={classNames('effect', { bad: entry.bad })}>
                    <b>{entry.value}</b> {entry.label}
                  </span>
                ))}
              </li>
            )
          })}
        </ol>

        <div className="forge">
          {next ? (
            <div className="needs">
              <span className="needs-title">{t('party.upgradeNeeds', { level: next })}</span>
              {requirements.map((requirement) => {
                const enough = requirement.have >= requirement.need

                return (
                  <Tooltip key={requirement.key} title={requirement.name}>
                    <span className={classNames('requirement', { short: !enough })}>
                      <ItemIcon subject={requirement.subject} size={34} />
                      <span className="count">
                        <b>{requirement.have}</b>/{requirement.need}
                      </span>
                    </span>
                  </Tooltip>
                )
              })}
            </div>
          ) : (
            <span className="max">{t('party.weaponMax')}</span>
          )}
          <div className="actions">
            {!held && (
              <GameButton
                size="small"
                color="cyan"
                disabled={!canSwap}
                onClick={() => onChange(equipWeapon(state, character.id, weapon.id))}
              >
                {t('party.wield')}
              </GameButton>
            )}
            {next && (
              <GameButton
                size="small"
                color="lime"
                disabled={!canSwap || !canUpgradeWeapon(state, character, weapon.id)}
                aria-label={t('party.upgrade', { level: next })}
                onClick={() => onChange(upgradeWeapon(state, character.id, weapon.id))}
              >
                {t('party.upgradeShort')} +{next}
              </GameButton>
            )}
          </div>
        </div>
      </div>
    </li>
  )
}
