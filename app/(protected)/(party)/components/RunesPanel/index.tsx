'use client'

import './index.scss'
import Popover from '@mui/material/Popover'
import classNames from 'classnames'
import { CSSProperties, MouseEvent, useState } from 'react'
import { getRune, RUNE_MASTERY_WINS, RUNE_SLOTS } from '@/app/(protected)/(engine)/data/runes'
import { CharacterState } from '@/app/(protected)/(engine)/models/CharacterState'
import { GameState } from '@/app/(protected)/(engine)/models/GameState'
import { Rune } from '@/app/(protected)/(engine)/models/Rune'
import {
  assignEchoes,
  canEquipEcho,
  equipEcho,
  equipRune,
  getEchoLoad,
  isRuneMastered,
  unequipEcho,
  unequipRune
} from '@/app/(protected)/(engine)/utils/heroes'
import ItemIcon from '@/app/(protected)/(party)/components/ItemIcon'
import { describeRune, runeName } from '@/app/(protected)/(party)/utils/describe'
import { runeColor } from '@/app/(protected)/(party)/utils/runeColors'
import GameButton from '@/app/components/GameButton'
import { useT } from '@/app/i18n/I18nProvider'
import type { MessageKey } from '@/app/i18n/messages'

interface RunesPanelProps {
  state: GameState
  character: CharacterState
  atCamp: boolean
  onChange: (state: GameState) => void
}

/** What the card shows: a rune (to wear it) or the echo of a mastered one, next to the tile clicked. */
interface Selection {
  kind: 'rune' | 'echo'
  index: number
  anchor: HTMLElement
}

/** A rune is tinted with the color of the attribute it raises. */
function runeStyle(rune: Rune): CSSProperties {
  return { '--rune-color': runeColor(rune) } as CSSProperties
}

/**
 * The runes and echoes of a hero: its three rune slots on top and the runes
 * of the party as a grid below. Clicking one opens its card next to it.
 */
export default function RunesPanel({ state, character, atCamp, onChange }: RunesPanelProps) {
  const t = useT()
  const id = character.id
  const name = t(`characters.${id}.name` as MessageKey)
  const owned = [...state.runes].sort((a, b) => a - b)
  const mastered = owned.filter((index) => isRuneMastered(state, index))
  const echoLoad = getEchoLoad(character)
  const [chosen, setChosen] = useState<Selection | null>(null)
  // An echo that is no longer mastered (or a rune no longer owned) closes its card.
  const selection =
    chosen && (chosen.kind === 'rune' ? owned : mastered).includes(chosen.index) && chosen.anchor.isConnected
      ? chosen
      : null
  const choose = (kind: Selection['kind'], index: number) => (event: MouseEvent<HTMLElement>) =>
    setChosen({ kind, index, anchor: event.currentTarget })
  const owner = (index: number) => state.characters.find((other) => other.runes.includes(index))
  const initialOf = (other: CharacterState) => t(`characters.${other.id}.name` as MessageKey).charAt(0)
  const isChosen = (kind: Selection['kind'], index: number) => selection?.kind === kind && selection.index === index

  return (
    <div className="runes-panel">
      <section>
        <h3>
          {t('party.runes')}
          <small>{t('party.runeSlots', { used: character.runes.length, total: RUNE_SLOTS })}</small>
        </h3>
        <ul className="rune-slots">
          {Array.from({ length: RUNE_SLOTS }, (_, slot) => {
            const index = character.runes[slot]

            if (index === undefined) {
              return (
                <li key={slot}>
                  <div className="slot empty">
                    <span className="hole" />
                    <span className="name">{t('party.emptySlot')}</span>
                  </div>
                </li>
              )
            }

            const rune = getRune(index)

            return (
              <li key={slot}>
                <button
                  type="button"
                  className={classNames('slot', { chosen: isChosen('rune', index) })}
                  style={runeStyle(rune)}
                  onClick={choose('rune', index)}
                >
                  <ItemIcon subject={{ type: 'rune', index }} size={52} />
                  <span className="name">{runeName(t, rune)}</span>
                </button>
              </li>
            )
          })}
        </ul>
        {!atCamp && owned.length > 0 && <p className="lines">{t('party.runesCampOnly')}</p>}
        {owned.length === 0 ? (
          <p className="lines">{t('party.noRunes')}</p>
        ) : (
          <ul className="rune-grid">
            {owned.map((index) => {
              const rune = getRune(index)
              const wearer = owner(index)

              return (
                <li key={index}>
                  <button
                    type="button"
                    className={classNames('tile', { worn: wearer === character, chosen: isChosen('rune', index) })}
                    style={runeStyle(rune)}
                    onClick={choose('rune', index)}
                  >
                    <ItemIcon subject={{ type: 'rune', index }} size={44} />
                    <span className="name">{runeName(t, rune)}</span>
                    {wearer && <span className="badge">{wearer === character ? '✓' : initialOf(wearer)}</span>}
                  </button>
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
        {!atCamp && mastered.length > 0 && <p className="lines">{t('party.echoesCampOnly')}</p>}
        {mastered.length === 0 ? (
          <p className="lines">{t('party.noEchoes')}</p>
        ) : (
          <ul className="rune-grid">
            {mastered.map((index) => {
              const rune = getRune(index)

              return (
                <li key={index}>
                  <button
                    type="button"
                    className={classNames('tile', 'echo', {
                      worn: character.echoes.includes(index),
                      chosen: isChosen('echo', index)
                    })}
                    style={runeStyle(rune)}
                    onClick={choose('echo', index)}
                  >
                    <ItemIcon subject={{ type: 'rune', index }} size={44} />
                    <span className="name">{runeName(t, rune)}</span>
                    <span className="badge">{character.echoes.includes(index) ? '✓' : rune.echoCost}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <Popover
        open={!!selection}
        anchorEl={selection?.anchor}
        onClose={() => setChosen(null)}
        anchorOrigin={{ vertical: 'center', horizontal: 'right' }}
        transformOrigin={{ vertical: 'center', horizontal: 'left' }}
        marginThreshold={8}
        slotProps={{ paper: { className: 'rune-card-paper' } }}
      >
        {selection && (
          <RuneCard
            key={`${selection.kind}-${selection.index}`}
            state={state}
            character={character}
            selection={selection}
            atCamp={atCamp}
            onChange={onChange}
          />
        )}
      </Popover>
    </div>
  )
}

interface RuneCardProps {
  state: GameState
  character: CharacterState
  selection: Selection
  atCamp: boolean
  onChange: (state: GameState) => void
}

/** The card of a rune (or its echo): what it does, and the button to wear it or take it off. */
function RuneCard({ state, character, selection, atCamp, onChange }: RuneCardProps) {
  const t = useT()
  const { kind, index } = selection
  const rune = getRune(index)
  const echo = kind === 'echo'
  const wearer = state.characters.find((other) => other.runes.includes(index))
  const worn = echo ? character.echoes.includes(index) : character.runes.includes(index)
  const disabled = echo
    ? !atCamp || (!worn && !canEquipEcho(state, character, index))
    : !atCamp || (!worn && character.runes.length >= RUNE_SLOTS)

  const toggle = () => {
    if (echo) {
      onChange(worn ? unequipEcho(state, character.id, index) : equipEcho(state, character.id, index))
    } else {
      onChange(worn ? unequipRune(state, character.id, index) : equipRune(state, character.id, index))
    }
  }

  return (
    <div className="rune-card" style={runeStyle(rune)}>
      <div className="header">
        <ItemIcon subject={{ type: 'rune', index }} size={72} />
        <div className="titles">
          <span className="name">{runeName(t, rune)}</span>
          <span className="tier">{t('inventory.runeTier', { tier: t(`world.runeTiers.${rune.tier}`) })}</span>
          <span className="stat">{t(`attributes.${rune.gain}`)}</span>
        </div>
      </div>
      {describeRune(t, rune, !echo).map((line) => (
        <p key={line} className="lines">
          {line}
        </p>
      ))}
      <p className="tag">
        {echo
          ? t('party.cost', { count: rune.echoCost })
          : isRuneMastered(state, index)
            ? t('party.mastered')
            : t('party.mastery', { wins: state.runeWins[index] ?? 0, needed: RUNE_MASTERY_WINS })}
      </p>
      {!echo && wearer && wearer !== character && (
        <p className="lines">{t('party.wornBy', { name: t(`characters.${wearer.id}.name` as MessageKey) })}</p>
      )}
      <GameButton
        fullWidth
        size="small"
        color={worn ? 'ghost' : echo ? 'magenta' : 'cyan'}
        disabled={disabled}
        onClick={toggle}
      >
        {t(worn ? 'party.unequip' : 'party.equip')}
      </GameButton>
    </div>
  )
}
