'use client'

import './index.scss'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import classNames from 'classnames'
import { useState } from 'react'
import { useArtImages } from '@/app/(protected)/(art)/hooks/useArtImages'
import { artUrl, figureArtId } from '@/app/(protected)/(art)/utils/art'
import { CharacterId } from '@/app/(protected)/(engine)/models/CharacterId'
import { GameState } from '@/app/(protected)/(engine)/models/GameState'
import { ACTIVE_HEROES } from '@/app/(protected)/(engine)/utils/battle'
import {
  getAttributePoints,
  getMaxHealth,
  getSkillPoints,
  moveInFormation
} from '@/app/(protected)/(engine)/utils/heroes'
import { xpToNextLevel } from '@/app/(protected)/(engine)/utils/progression'
import { getFocus } from '@/app/(protected)/(engine)/utils/worldMap'
import HeroSheet, { HERO_TABS, HeroTab } from '@/app/(protected)/(party)/components/HeroSheet'
import GameScreen from '@/app/components/GameScreen'
import { useT } from '@/app/i18n/I18nProvider'
import type { MessageKey } from '@/app/i18n/messages'

interface HeroScreenProps {
  state: GameState
  /** The hero shown first (the arrows go through the others). */
  characterId: CharacterId
  /** The party stands at an open camp: the weapons can be upgraded and the runes and the echoes changed. */
  atCamp: boolean
  /** The party stands on a cleared point: the weapons can be swapped. */
  canSwap: boolean
  onChange: (state: GameState) => void
  onClose: () => void
}

/** The page of a hero (full screen over the map): who it is, its place in the formation and its build by tabs. */
export default function HeroScreen({ state, characterId, atCamp, canSwap, onChange, onClose }: HeroScreenProps) {
  const t = useT()
  const images = useArtImages()
  const [shownId, setShownId] = useState(characterId)
  const [tab, setTab] = useState<HeroTab>('attributes')
  const position = Math.max(
    0,
    state.characters.findIndex((character) => character.id === shownId)
  )
  const character = state.characters[position]
  const name = t(`characters.${character.id}.name` as MessageKey)
  const maxHealth = getMaxHealth(character)
  const { focus, maxFocus } = getFocus(character)
  const next = xpToNextLevel(character.level)
  const active = position < ACTIVE_HEROES
  const portrait = figureArtId('hero', character.id, false)
  const count = state.characters.length
  const badges: Partial<Record<HeroTab, number>> = {
    attributes: getAttributePoints(character),
    skills: Math.max(0, getSkillPoints(character)),
    echoes: state.echoes
  }
  const bars = [
    { kind: 'health', label: t('party.health'), value: character.health, max: maxHealth },
    { kind: 'focus', label: t('party.focus'), value: focus, max: maxFocus },
    { kind: 'xp', label: t('party.experience'), value: character.xp, max: next }
  ]

  return (
    <GameScreen
      open
      title={name}
      onClose={onClose}
      className="hero-screen"
      tabs={HERO_TABS.map((id) => ({ id, label: t(`party.tabs.${id}`), badge: badges[id] }))}
      tab={tab}
      onTab={setTab}
      header={
        <div className="hero-summary">
          <IconButton
            className="switch"
            disabled={count < 2}
            aria-label={t('party.previousHero')}
            onClick={() => setShownId(state.characters[(position - 1 + count) % count].id)}
          >
            <ChevronLeftIcon />
          </IconButton>
          <div className={classNames('portrait', { fallen: character.health === 0 })}>
            {images[portrait] ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element -- the art is already a sized webp */}
                <img src={artUrl(portrait)} alt="" draggable={false} />
              </>
            ) : (
              <span className="initial">{name.charAt(0)}</span>
            )}
          </div>
          <div className="details">
            <div className="titles">
              <span className="level">{t('world.level', { level: character.level })}</span>
              <span className={classNames('role', { reserve: !active })}>
                {t(active ? 'party.active' : 'party.reserve')}
              </span>
            </div>
            <ul className="bars">
              {bars.map((bar) => (
                <li key={bar.kind} className={bar.kind}>
                  <span className="label">{bar.label}</span>
                  <span className="track">
                    <span className="fill" style={{ width: `${Math.min(100, (bar.value / bar.max) * 100)}%` }} />
                  </span>
                  <span className="value">
                    {bar.value}/{bar.max}
                  </span>
                </li>
              ))}
            </ul>
            {count > 1 && (
              <div className="formation">
                <span className="label">{t('party.formationPlace', { place: position + 1, total: count })}</span>
                <Tooltip title={t('party.moveUp')}>
                  <span>
                    <IconButton
                      size="small"
                      disabled={position === 0}
                      aria-label={t('party.moveUp')}
                      onClick={() => onChange(moveInFormation(state, character.id, position - 1))}
                    >
                      <ChevronLeftIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
                <Tooltip title={t('party.moveDown')}>
                  <span>
                    <IconButton
                      size="small"
                      disabled={position === count - 1}
                      aria-label={t('party.moveDown')}
                      onClick={() => onChange(moveInFormation(state, character.id, position + 1))}
                    >
                      <ChevronRightIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
              </div>
            )}
          </div>
          <IconButton
            className="switch"
            disabled={count < 2}
            aria-label={t('party.nextHero')}
            onClick={() => setShownId(state.characters[(position + 1) % count].id)}
          >
            <ChevronRightIcon />
          </IconButton>
        </div>
      }
    >
      {count > ACTIVE_HEROES && tab === 'attributes' && <p className="formation-hint">{t('party.formationHint')}</p>}
      <HeroSheet state={state} character={character} tab={tab} atCamp={atCamp} canSwap={canSwap} onChange={onChange} />
    </GameScreen>
  )
}
