'use client'

import './index.scss'
import AddIcon from '@mui/icons-material/Add'
import IconButton from '@mui/material/IconButton'
import classNames from 'classnames'
import { getRune, RUNE_MASTERY_WINS, RUNE_SLOTS } from '@/app/(protected)/(engine)/data/runes'
import { getTree } from '@/app/(protected)/(engine)/data/talents'
import {
  getUpgradeCost,
  MAX_WEAPON_LEVEL,
  WEAPON_EFFECTS,
  WEAPON_POWER_PER_LEVEL
} from '@/app/(protected)/(engine)/data/weapons'
import { CharacterState } from '@/app/(protected)/(engine)/models/CharacterState'
import { CombatStats } from '@/app/(protected)/(engine)/models/CombatStats'
import { GameState } from '@/app/(protected)/(engine)/models/GameState'
import {
  assignEchoes,
  buyTalent,
  canBuyTalent,
  canEquipEcho,
  canUpgradeWeapon,
  equipEcho,
  equipRune,
  getAttributePoints,
  getCharacterStats,
  getEchoLoad,
  getSkillPoints,
  isRuneMastered,
  isTreeComplete,
  spendAttributePoint,
  spendTear,
  TRADE_ECHOES,
  tradeSkillPoint,
  unequipEcho,
  unequipRune,
  upgradeWeapon
} from '@/app/(protected)/(engine)/utils/heroes'
import {
  describeBonuses,
  describeRune,
  describeTalent,
  formatShare,
  formatStat,
  itemName,
  runeName,
  talentName
} from '@/app/(protected)/(party)/utils/describe'
import GameButton from '@/app/components/GameButton'
import { useT } from '@/app/i18n/I18nProvider'
import type { MessageKey } from '@/app/i18n/messages'

interface HeroSheetProps {
  state: GameState
  character: CharacterState
  atCamp: boolean
  onChange: (state: GameState) => void
}

const ATTRIBUTES: (keyof CombatStats)[] = [
  'maxHealth',
  'maxFocus',
  'attack',
  'special',
  'defense',
  'speed',
  'critChance',
  'critDamage'
]

/** The build of one hero: attributes, skill tree, weapon, runes and echoes. */
export default function HeroSheet({ state, character, atCamp, onChange }: HeroSheetProps) {
  const t = useT()
  const id = character.id
  const name = t(`characters.${id}.name` as MessageKey)
  const stats = getCharacterStats(character)
  const attributePoints = getAttributePoints(character)
  const skillPoints = getSkillPoints(character)
  const tree = getTree(id)
  const owner = (index: number) => state.characters.find((other) => other.runes.includes(index))
  const mastered = state.runes.filter((index) => isRuneMastered(state, index)).sort((a, b) => a - b)
  const echoLoad = getEchoLoad(character)
  const nextUpgrade = character.weapon < MAX_WEAPON_LEVEL ? getUpgradeCost(character.weapon + 1) : null
  const nextEffect = WEAPON_EFFECTS[id][Math.floor(character.weapon / 5)]

  return (
    <div className="hero-sheet">
      <section>
        <h3>
          {t('party.attributes')}
          {attributePoints > 0 && <small>{t('party.attributePoints', { count: attributePoints })}</small>}
        </h3>
        <ul className="attributes">
          {ATTRIBUTES.map((stat) => (
            <li key={stat}>
              <span className="label">{t(`attributes.${stat}`)}</span>
              <span className="value">{formatStat(stat, stats[stat])}</span>
              <IconButton
                size="small"
                disabled={attributePoints <= 0}
                aria-label={t('party.spendPoint', { stat: t(`attributes.${stat}`) })}
                onClick={() => onChange(spendAttributePoint(state, id, stat))}
              >
                <AddIcon fontSize="small" />
              </IconButton>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3>
          {t('party.skills')}
          <small>{t('party.skillPoints', { count: Math.max(0, skillPoints) })}</small>
        </h3>
        <div className="tree">
          {[0, 1, 2].map((branch) => (
            <div key={branch} className="branch">
              <h4>{t(`talents.branches.${id}.b${branch}` as MessageKey)}</h4>
              <ol>
                {tree
                  .filter((talent) => talent.branch === branch)
                  .map((talent) => {
                    const bought = character.talents.includes(talent.id)
                    const locked = !!talent.requires && !character.talents.includes(talent.requires)

                    return (
                      <li key={talent.id} className={classNames({ bought, locked })}>
                        <span className="name">{talentName(t, talent)}</span>
                        <p className="lines">{describeTalent(t, talent.id).join(' · ')}</p>
                        {bought ? (
                          <span className="state">{t('party.bought')}</span>
                        ) : locked ? (
                          <span className="state">{t('party.locked')}</span>
                        ) : (
                          <GameButton
                            size="small"
                            color="cyan"
                            disabled={!canBuyTalent(character, talent.id)}
                            onClick={() => onChange(buyTalent(state, id, talent.id))}
                          >
                            {t('party.buy', { cost: talent.cost })}
                          </GameButton>
                        )}
                      </li>
                    )
                  })}
              </ol>
            </div>
          ))}
        </div>
        <div className="row">
          <span className="lines">{t('party.tears', { count: state.tears })}</span>
          <GameButton
            size="small"
            color="ghost"
            disabled={state.tears <= 0 || character.talents.length === 0}
            onClick={() => onChange(spendTear(state, id))}
          >
            {t('party.spendTear')}
          </GameButton>
        </div>
        {isTreeComplete(character) && (
          <div className="row">
            <span className="lines">{t('party.tradeHint')}</span>
            <GameButton
              size="small"
              color="magenta"
              disabled={skillPoints <= 0}
              onClick={() => onChange(tradeSkillPoint(state, id))}
            >
              {t('party.trade', { count: TRADE_ECHOES })}
            </GameButton>
          </div>
        )}
      </section>

      {!atCamp && <p className="camp-only">{t('party.campOnly')}</p>}

      <section>
        <h3>
          {t('party.weapon')}
          <small>{t('party.weaponLevel', { level: character.weapon })}</small>
        </h3>
        <p className="lines">
          {t('party.weaponPower', { value: formatShare(WEAPON_POWER_PER_LEVEL * character.weapon).slice(1) })}
        </p>
        {nextEffect && (
          <p className="lines">
            {t('party.weaponNext', {
              level: (Math.floor(character.weapon / 5) + 1) * 5,
              effect: describeBonuses(t, nextEffect).join(' · ')
            })}
          </p>
        )}
        {nextUpgrade ? (
          <div className="row">
            <span className="lines">
              {t('party.upgradeCost', {
                stones: nextUpgrade.stones,
                stone: itemName(t, nextUpgrade.stoneId),
                gold: nextUpgrade.gold
              })}
              {' · '}
              {t('party.have', { count: state.inventory[nextUpgrade.stoneId] ?? 0 })}
            </span>
            <GameButton
              size="small"
              disabled={!atCamp || !canUpgradeWeapon(state, character)}
              onClick={() => onChange(upgradeWeapon(state, id))}
            >
              {t('party.upgrade', { level: character.weapon + 1 })}
            </GameButton>
          </div>
        ) : (
          <p className="lines">{t('party.weaponMax')}</p>
        )}
      </section>

      <section>
        <h3>
          {t('party.runes')}
          <small>{t('party.runeSlots', { used: character.runes.length, total: RUNE_SLOTS })}</small>
        </h3>
        {state.runes.length === 0 ? (
          <p className="lines">{t('party.noRunes')}</p>
        ) : (
          <ul className="cards">
            {[...state.runes]
              .sort((a, b) => a - b)
              .map((index) => {
                const rune = getRune(index)
                const worn = character.runes.includes(index)
                const wearer = owner(index)

                return (
                  <li key={index} className={classNames({ worn })}>
                    <div className="titles">
                      <span className="name">{runeName(t, rune)}</span>
                      <span className="tag">
                        {isRuneMastered(state, index)
                          ? t('party.mastered')
                          : t('party.mastery', { wins: state.runeWins[index] ?? 0, needed: RUNE_MASTERY_WINS })}
                      </span>
                    </div>
                    <p className="lines">{describeRune(t, rune).join(' · ')}</p>
                    {wearer && !worn && (
                      <p className="lines">
                        {t('party.wornBy', { name: t(`characters.${wearer.id}.name` as MessageKey) })}
                      </p>
                    )}
                    <GameButton
                      size="small"
                      color={worn ? 'ghost' : 'cyan'}
                      disabled={!atCamp || (!worn && character.runes.length >= RUNE_SLOTS)}
                      onClick={() => onChange(worn ? unequipRune(state, id, index) : equipRune(state, id, index))}
                    >
                      {t(worn ? 'party.unequip' : 'party.equip')}
                    </GameButton>
                  </li>
                )
              })}
          </ul>
        )}
      </section>

      <section>
        <h3>
          {t('party.echoes')}
          <small>{t('party.echoCapacity', { used: echoLoad, capacity: character.echoCapacity })}</small>
        </h3>
        {state.echoes > 0 && (
          <div className="row">
            <span className="lines">
              {t('party.echoPool', { count: state.echoes })} · {t('party.assignHint')}
            </span>
            <GameButton size="small" color="magenta" onClick={() => onChange(assignEchoes(state, id, 1))}>
              {t('party.assign', { name })}
            </GameButton>
          </div>
        )}
        <p className="lines">{t('party.echoesHint')}</p>
        {mastered.length === 0 ? (
          <p className="lines">{t('party.noEchoes')}</p>
        ) : (
          <ul className="cards">
            {mastered.map((index) => {
              const rune = getRune(index)
              const worn = character.echoes.includes(index)

              return (
                <li key={index} className={classNames({ worn })}>
                  <div className="titles">
                    <span className="name">{runeName(t, rune)}</span>
                    <span className="tag">{t('party.cost', { count: rune.echoCost })}</span>
                  </div>
                  <p className="lines">{describeRune(t, rune, false).join(' · ')}</p>
                  <GameButton
                    size="small"
                    color={worn ? 'ghost' : 'magenta'}
                    disabled={!atCamp || (!worn && !canEquipEcho(state, character, index))}
                    onClick={() => onChange(worn ? unequipEcho(state, id, index) : equipEcho(state, id, index))}
                  >
                    {t(worn ? 'party.unequip' : 'party.equip')}
                  </GameButton>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
