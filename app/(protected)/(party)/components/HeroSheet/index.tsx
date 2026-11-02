'use client'

import './index.scss'
import AddIcon from '@mui/icons-material/Add'
import CloseIcon from '@mui/icons-material/Close'
import ButtonBase from '@mui/material/ButtonBase'
import IconButton from '@mui/material/IconButton'
import classNames from 'classnames'
import { getRune, RUNE_MASTERY_WINS, RUNE_SLOTS } from '@/app/(protected)/(engine)/data/runes'
import { getSkill } from '@/app/(protected)/(engine)/data/skills'
import {
  getCharacterWeapons,
  getUpgradeCost,
  MAX_WEAPON_LEVEL,
  WEAPON_POWER_PER_LEVEL
} from '@/app/(protected)/(engine)/data/weapons'
import { CharacterState } from '@/app/(protected)/(engine)/models/CharacterState'
import { CombatStats } from '@/app/(protected)/(engine)/models/CombatStats'
import { GameState } from '@/app/(protected)/(engine)/models/GameState'
import {
  assignEchoes,
  canEquipEcho,
  canForgetSkills,
  canUpgradeWeapon,
  equipEcho,
  equipRune,
  equipSkill,
  equipWeapon,
  getAttributePoints,
  getCharacterStats,
  getEchoLoad,
  getKnownSkills,
  getSkillLevel,
  getSkillPoints,
  getWeaponLevel,
  isRuneMastered,
  isTreeComplete,
  SKILL_SLOTS,
  spendAttributePoint,
  spendTear,
  TRADE_ECHOES,
  tradeSkillPoint,
  unequipEcho,
  unequipRune,
  unequipSkill,
  upgradeWeapon
} from '@/app/(protected)/(engine)/utils/heroes'
import SkillIcon from '@/app/(protected)/(party)/components/SkillIcon'
import SkillTree from '@/app/(protected)/(party)/components/SkillTree'
import {
  describeBonuses,
  describeRune,
  formatShare,
  formatStat,
  itemName,
  runeName,
  skillCost,
  skillName
} from '@/app/(protected)/(party)/utils/describe'
import GameButton from '@/app/components/GameButton'
import { useT } from '@/app/i18n/I18nProvider'
import type { MessageKey } from '@/app/i18n/messages'

/** The tabs of the page of a hero. */
export type HeroTab = 'attributes' | 'weapons' | 'skills' | 'runes' | 'echoes'

export const HERO_TABS: HeroTab[] = ['attributes', 'weapons', 'skills', 'runes', 'echoes']

interface HeroSheetProps {
  state: GameState
  character: CharacterState
  /** The part of the build shown. */
  tab: HeroTab
  atCamp: boolean
  /** The party stands on a cleared point: the weapons can be swapped. */
  canSwap: boolean
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

/** One part of the build of a hero: attributes, weapons, skills (loadout and tree), runes or echoes. */
export default function HeroSheet({ state, character, tab, atCamp, canSwap, onChange }: HeroSheetProps) {
  const t = useT()
  const id = character.id
  const name = t(`characters.${id}.name` as MessageKey)
  const stats = getCharacterStats(character)
  const attributePoints = getAttributePoints(character)
  const skillPoints = getSkillPoints(character)
  const owner = (index: number) => state.characters.find((other) => other.runes.includes(index))
  const mastered = state.runes.filter((index) => isRuneMastered(state, index)).sort((a, b) => a - b)
  const echoLoad = getEchoLoad(character)
  const spare = getKnownSkills(character).filter((skill) => !character.skills.includes(skill))
  const costOf = (skillId: string) => skillCost(skillId, Math.max(1, getSkillLevel(character, skillId)))

  return (
    <div className="hero-sheet">
      {tab === 'attributes' && (
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
      )}

      {tab === 'skills' && (
        <>
          <section>
            <h3>
              {t('party.battleSkills')}
              <small>
                {character.skills.length}/{SKILL_SLOTS}
              </small>
            </h3>
            <p className="lines">{t('party.battleSkillsHint', { count: SKILL_SLOTS })}</p>
            <ul className="loadout">
              {Array.from({ length: SKILL_SLOTS }, (_, index) => character.skills[index]).map((skillId, index) =>
                skillId ? (
                  <li key={skillId} className="slot">
                    <span className="badge">
                      <SkillIcon skillId={skillId} size="small" />
                      <span className="level">{getSkillLevel(character, skillId)}</span>
                    </span>
                    <span className="name">{skillName(t, skillId)}</span>
                    {costOf(skillId) > 0 && <span className="cost">{costOf(skillId)}</span>}
                    <IconButton
                      size="small"
                      aria-label={t('party.unequipSkill', { skill: skillName(t, skillId) })}
                      onClick={() => onChange(unequipSkill(state, id, skillId))}
                    >
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </li>
                ) : (
                  <li key={`empty-${index}`} className="slot empty">
                    {t('battle.emptySlot')}
                  </li>
                )
              )}
            </ul>
            {spare.length > 0 && (
              <>
                <h4 className="spare-title">{t('party.spareSkills')}</h4>
                <div className="spare">
                  {spare.map((skillId) => (
                    <ButtonBase
                      key={skillId}
                      className="spare-skill"
                      disabled={character.skills.length >= SKILL_SLOTS}
                      onClick={() => onChange(equipSkill(state, id, skillId))}
                    >
                      <SkillIcon skillId={skillId} size="small" />
                      {skillName(t, skillId)}
                      {costOf(skillId) > 0 && <span className="cost">{costOf(skillId)}</span>}
                    </ButtonBase>
                  ))}
                </div>
              </>
            )}
          </section>

          <section>
            <h3>
              {t('party.skills')}
              <small>{t('party.skillPoints', { count: Math.max(0, skillPoints) })}</small>
            </h3>
            <SkillTree state={state} character={character} onChange={onChange} />
            <div className="row">
              <span className="lines">{t('party.tears', { count: state.tears })}</span>
              <GameButton
                size="small"
                color="ghost"
                disabled={state.tears <= 0 || !canForgetSkills(character)}
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
        </>
      )}

      {tab === 'weapons' && (
        <section>
          <h3>{t('party.weapons')}</h3>
          {!canSwap && <p className="lines">{t('party.swapOnly')}</p>}
          {!atCamp && <p className="lines">{t('party.upgradeCampOnly')}</p>}
          <ul className="cards weapons">
            {getCharacterWeapons(id)
              .filter((weapon) => weapon.id in character.weapons)
              .map((weapon) => {
                const held = weapon.id === character.weaponId
                const level = getWeaponLevel(character, weapon.id)
                const attack = getSkill(weapon.attack)
                const nextUpgrade = level < MAX_WEAPON_LEVEL ? getUpgradeCost(level + 1) : null
                const nextEffect = weapon.effects[Math.floor(level / 5)]
                const traits = describeBonuses(t, weapon.traits)

                return (
                  <li key={weapon.id} className={classNames({ worn: held })}>
                    <div className="titles">
                      <span className="name">{t(`weapons.${weapon.id}.name` as MessageKey)}</span>
                      <span className="tag">{held ? t('party.weaponHeld') : `+${level}`}</span>
                    </div>
                    <p className="lines kind">
                      {t(`weapons.${weapon.id}.kind` as MessageKey)}
                      {held && ` · +${level}`}
                    </p>
                    <p className="lines">
                      {t('party.weaponAttack', {
                        skill: skillName(t, attack.id),
                        type: t(`damageTypes.${attack.damageType}`),
                        target: t(`targets.${attack.target}`)
                      })}
                    </p>
                    <p className="lines">
                      {traits.length > 0
                        ? t('party.weaponStyle', { traits: traits.join(' · ') })
                        : t('party.weaponBalanced')}
                    </p>
                    <p className="lines">
                      {t('party.weaponPower', { value: formatShare(WEAPON_POWER_PER_LEVEL * level).slice(1) })}
                    </p>
                    {nextEffect && (
                      <p className="lines">
                        {t('party.weaponNext', {
                          level: (Math.floor(level / 5) + 1) * 5,
                          effect: describeBonuses(t, nextEffect).join(' · ')
                        })}
                      </p>
                    )}
                    {nextUpgrade ? (
                      <p className="lines">
                        {t('party.upgradeCost', {
                          stones: nextUpgrade.stones,
                          stone: itemName(t, nextUpgrade.stoneId),
                          gold: nextUpgrade.gold
                        })}
                        {' · '}
                        {t('party.have', { count: state.inventory[nextUpgrade.stoneId] ?? 0 })}
                      </p>
                    ) : (
                      <p className="lines">{t('party.weaponMax')}</p>
                    )}
                    <div className="actions">
                      {!held && (
                        <GameButton
                          size="small"
                          color="cyan"
                          disabled={!canSwap}
                          onClick={() => onChange(equipWeapon(state, id, weapon.id))}
                        >
                          {t('party.wield')}
                        </GameButton>
                      )}
                      {nextUpgrade && (
                        <GameButton
                          size="small"
                          disabled={!atCamp || !canUpgradeWeapon(state, character, weapon.id)}
                          onClick={() => onChange(upgradeWeapon(state, id, weapon.id))}
                        >
                          {t('party.upgrade', { level: level + 1 })}
                        </GameButton>
                      )}
                    </div>
                  </li>
                )
              })}
          </ul>
        </section>
      )}

      {tab === 'runes' && (
        <section>
          <h3>
            {t('party.runes')}
            <small>{t('party.runeSlots', { used: character.runes.length, total: RUNE_SLOTS })}</small>
          </h3>
          {!atCamp && state.runes.length > 0 && <p className="lines">{t('party.runesCampOnly')}</p>}
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
      )}

      {tab === 'echoes' && (
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
          {!atCamp && mastered.length > 0 && <p className="lines">{t('party.echoesCampOnly')}</p>}
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
      )}
    </div>
  )
}
