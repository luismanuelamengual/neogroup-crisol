'use client'

import './index.scss'
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward'
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward'
import CloseIcon from '@mui/icons-material/Close'
import Dialog from '@mui/material/Dialog'
import IconButton from '@mui/material/IconButton'
import classNames from 'classnames'
import { useState } from 'react'
import { CharacterId } from '@/app/(protected)/(engine)/models/CharacterId'
import { GameState } from '@/app/(protected)/(engine)/models/GameState'
import { ACTIVE_HEROES } from '@/app/(protected)/(engine)/utils/battle'
import { getAttributePoints, getSkillPoints, moveInFormation } from '@/app/(protected)/(engine)/utils/heroes'
import Bestiary from '@/app/(protected)/(party)/components/Bestiary'
import HeroSheet from '@/app/(protected)/(party)/components/HeroSheet'
import InventoryList from '@/app/(protected)/(party)/components/InventoryList'
import { useT } from '@/app/i18n/I18nProvider'
import type { MessageKey } from '@/app/i18n/messages'

interface PartyScreenProps {
  open: boolean
  state: GameState
  /** The party stands at an open camp: the weapons can be upgraded and the runes and the echoes changed. */
  atCamp: boolean
  /** The party stands on a cleared point: the weapons can be swapped. */
  canSwap: boolean
  onChange: (state: GameState) => void
  onClose: () => void
}

type View = 'heroes' | 'inventory' | 'bestiary'

const VIEWS: View[] = ['heroes', 'inventory', 'bestiary']

/** The party (full screen over the map): formation and build of each hero, the inventory and the bestiary. */
export default function PartyScreen({ open, state, atCamp, canSwap, onChange, onClose }: PartyScreenProps) {
  const t = useT()
  const [view, setView] = useState<View>('heroes')
  const [selectedId, setSelectedId] = useState<CharacterId>(state.characters[0].id)
  const selected = state.characters.find((character) => character.id === selectedId) ?? state.characters[0]

  return (
    <Dialog open={open} onClose={onClose} fullScreen className="party-screen">
      <header>
        <h2 className="frame-title">{t('party.title')}</h2>
        <IconButton className="close" onClick={onClose} aria-label={t('common.close')}>
          <CloseIcon />
        </IconButton>
      </header>
      <nav className="views" role="tablist">
        {VIEWS.map((option) => (
          <button
            key={option}
            type="button"
            role="tab"
            aria-selected={view === option}
            className={classNames({ selected: view === option })}
            onClick={() => setView(option)}
          >
            {t(`party.${option}`)}
          </button>
        ))}
      </nav>
      <div className="content">
        {view === 'heroes' && (
          <>
            <section className="formation">
              <h3>{t('party.formation')}</h3>
              <ol>
                {state.characters.map((character, position) => (
                  <li
                    key={character.id}
                    className={classNames({ selected: character.id === selected.id })}
                    onClick={() => setSelectedId(character.id)}
                  >
                    <span className="name">{t(`characters.${character.id}.name` as MessageKey)}</span>
                    <span className="level">{t('world.levelShort', { level: character.level })}</span>
                    {getAttributePoints(character) + getSkillPoints(character) > 0 && (
                      <span className="badge" title={t('party.pointsBadge')}>
                        {getAttributePoints(character) + getSkillPoints(character)}
                      </span>
                    )}
                    <span className={classNames('role', { reserve: position >= ACTIVE_HEROES })}>
                      {t(position < ACTIVE_HEROES ? 'party.active' : 'party.reserve')}
                    </span>
                    <IconButton
                      size="small"
                      disabled={position === 0}
                      aria-label={t('party.moveUp')}
                      onClick={(event) => {
                        event.stopPropagation()
                        onChange(moveInFormation(state, character.id, position - 1))
                      }}
                    >
                      <ArrowUpwardIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      disabled={position === state.characters.length - 1}
                      aria-label={t('party.moveDown')}
                      onClick={(event) => {
                        event.stopPropagation()
                        onChange(moveInFormation(state, character.id, position + 1))
                      }}
                    >
                      <ArrowDownwardIcon fontSize="small" />
                    </IconButton>
                  </li>
                ))}
              </ol>
              {state.characters.length > ACTIVE_HEROES && <p className="hint">{t('party.formationHint')}</p>}
            </section>
            <HeroSheet state={state} character={selected} atCamp={atCamp} canSwap={canSwap} onChange={onChange} />
          </>
        )}
        {view === 'inventory' && <InventoryList state={state} />}
        {view === 'bestiary' && <Bestiary kills={state.kills} />}
      </div>
    </Dialog>
  )
}
