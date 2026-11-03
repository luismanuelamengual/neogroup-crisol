'use client'

import './index.scss'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import IconButton from '@mui/material/IconButton'
import { useState } from 'react'
import { CharacterId } from '@/app/(protected)/(engine)/models/CharacterId'
import { GameState } from '@/app/(protected)/(engine)/models/GameState'
import { getAttributePoints, getSkillPoints } from '@/app/(protected)/(engine)/utils/heroes'
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

/** The page of a hero (full screen over the map): the arrows of the title go through the party, the tabs show its state and its build. */
export default function HeroScreen({ state, characterId, atCamp, canSwap, onChange, onClose }: HeroScreenProps) {
  const t = useT()
  const [shownId, setShownId] = useState(characterId)
  const [tab, setTab] = useState<HeroTab>('status')
  const position = Math.max(
    0,
    state.characters.findIndex((character) => character.id === shownId)
  )
  const character = state.characters[position]
  const name = t(`characters.${character.id}.name` as MessageKey)
  const count = state.characters.length
  const badges: Partial<Record<HeroTab, number>> = {
    attributes: getAttributePoints(character),
    skills: Math.max(0, getSkillPoints(character)),
    runes: state.echoes
  }

  return (
    <GameScreen
      open
      title={
        <>
          <IconButton
            className="switch"
            disabled={count < 2}
            aria-label={t('party.previousHero')}
            onClick={() => setShownId(state.characters[(position - 1 + count) % count].id)}
          >
            <ChevronLeftIcon />
          </IconButton>
          <span className="hero-name">{name}</span>
          <IconButton
            className="switch"
            disabled={count < 2}
            aria-label={t('party.nextHero')}
            onClick={() => setShownId(state.characters[(position + 1) % count].id)}
          >
            <ChevronRightIcon />
          </IconButton>
        </>
      }
      onClose={onClose}
      className="hero-screen"
      tabs={HERO_TABS.map((id) => ({ id, label: t(`party.tabs.${id}`), badge: badges[id] }))}
      tab={tab}
      onTab={setTab}
    >
      <HeroSheet state={state} character={character} tab={tab} atCamp={atCamp} canSwap={canSwap} onChange={onChange} />
    </GameScreen>
  )
}
