'use client'

import './index.scss'
import Popover from '@mui/material/Popover'
import classNames from 'classnames'
import { CSSProperties, MouseEvent, useState } from 'react'
import { ECHOES_UNLOCK_RUNES, getRune, RUNE_MASTERY_WINS, RUNE_SLOTS } from '@/app/(protected)/(engine)/data/runes'
import { CharacterState } from '@/app/(protected)/(engine)/models/CharacterState'
import { GameState } from '@/app/(protected)/(engine)/models/GameState'
import { Rune } from '@/app/(protected)/(engine)/models/Rune'
import {
  areEchoesUnlocked,
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
  /** The tab shown: the runes (slots and grid) or the echoes of the mastered ones. */
  view: 'runes' | 'echoes'
  canChange: boolean
  onChange: (state: GameState) => void
}

/** Why an echo the hero does not wear cannot be equipped (whatever the place): its rune is worn, or it does not fit. */
type EchoLock = 'asRune' | 'noRoom'

function getEchoLock(state: GameState, character: CharacterState, index: number): EchoLock | null {
  if (character.echoes.includes(index) || canEquipEcho(state, character, index)) {
    return null
  }

  return character.runes.includes(index) ? 'asRune' : 'noRoom'
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
 * The runes or the echoes of a hero. Runes: its three rune slots on top and the
 * runes of the party as a grid below. Echoes: the capacity, the echoes worn on
 * top and the other mastered ones below, greyed out when they cannot be
 * equipped. Clicking one opens its card next to it.
 */
export default function RunesPanel({ state, character, view, canChange, onChange }: RunesPanelProps) {
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

  // The runes another hero wears cannot be equipped here: they go last.
  const isTaken = (index: number) => {
    const wearer = owner(index)

    return !!wearer && wearer !== character
  }

  const runeOrder = [...owned.filter((index) => !isTaken(index)), ...owned.filter(isTaken)]
  const worn = mastered.filter((index) => character.echoes.includes(index))
  const others = mastered.filter((index) => !character.echoes.includes(index))
  const anyLocked = others.some((index) => getEchoLock(state, character, index))
  const echoesOpen = areEchoesUnlocked(state)
  const echoesLockedHint = t('party.echoesLocked', { needed: ECHOES_UNLOCK_RUNES, count: owned.length })

  return (
    <div className="runes-panel">
      {view === 'runes' && (
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
          {!canChange && owned.length > 0 && <p className="lines">{t('party.runesFreePointOnly')}</p>}
          {owned.length === 0 ? (
            <p className="lines">{t('party.noRunes')}</p>
          ) : (
            <ul className="rune-grid">
              {runeOrder.map((index) => {
                const rune = getRune(index)
                const wearer = owner(index)
                const taken = isTaken(index)

                return (
                  <li key={index}>
                    <button
                      type="button"
                      className={classNames('tile', {
                        worn: wearer === character,
                        locked: taken,
                        chosen: isChosen('rune', index)
                      })}
                      style={runeStyle(rune)}
                      onClick={choose('rune', index)}
                    >
                      <ItemIcon subject={{ type: 'rune', index }} size={44} />
                      <span className="name">{runeName(t, rune)}</span>
                      {taken && wearer && (
                        <span className="reason">
                          {t('party.runeTakenBy', { name: t(`characters.${wearer.id}.name` as MessageKey) })}
                        </span>
                      )}
                      {wearer && <span className="badge">{wearer === character ? '✓' : initialOf(wearer)}</span>}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
          {!echoesOpen && <p className="lines echoes-locked">{echoesLockedHint}</p>}
        </section>
      )}

      {view === 'echoes' && !echoesOpen && (
        <section>
          <h3>{t('party.echoes')}</h3>
          <p className="lines echoes-locked">{echoesLockedHint}</p>
        </section>
      )}

      {view === 'echoes' && echoesOpen && (
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
          <span
            className="echo-meter"
            role="meter"
            aria-valuemin={0}
            aria-valuemax={character.echoCapacity}
            aria-valuenow={echoLoad}
            aria-label={t('party.echoCapacity', { used: echoLoad, capacity: character.echoCapacity })}
          >
            <span
              className="fill"
              style={{ width: `${Math.min(100, (echoLoad / Math.max(1, character.echoCapacity)) * 100)}%` }}
            />
          </span>
          <p className="lines">{t('party.echoesHint')}</p>
          {!canChange && mastered.length > 0 && <p className="lines">{t('party.echoesFreePointOnly')}</p>}
          {mastered.length === 0 ? (
            <p className="lines">{t('party.noEchoes')}</p>
          ) : (
            <>
              <h4 className="grid-title">{t('party.echoesWorn')}</h4>
              {worn.length === 0 ? (
                <p className="lines">{t('party.noEchoesWorn')}</p>
              ) : (
                <ul className="rune-grid worn-echoes">
                  {worn.map((index) => {
                    const rune = getRune(index)

                    return (
                      <li key={index}>
                        <button
                          type="button"
                          className={classNames('tile', 'echo', 'worn', { chosen: isChosen('echo', index) })}
                          style={runeStyle(rune)}
                          onClick={choose('echo', index)}
                        >
                          <ItemIcon subject={{ type: 'rune', index }} size={52} />
                          <span className="name">{runeName(t, rune)}</span>
                          <span className="badge">✓ {rune.echoCost}</span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
              {others.length > 0 && (
                <>
                  <h4 className="grid-title">{t('party.echoesOthers')}</h4>
                  {anyLocked && <p className="lines">{t('party.echoesLockedHint')}</p>}
                  <ul className="rune-grid">
                    {others.map((index) => {
                      const rune = getRune(index)
                      const lock = getEchoLock(state, character, index)

                      return (
                        <li key={index}>
                          <button
                            type="button"
                            className={classNames('tile', 'echo', { locked: lock, chosen: isChosen('echo', index) })}
                            style={runeStyle(rune)}
                            onClick={choose('echo', index)}
                          >
                            <ItemIcon subject={{ type: 'rune', index }} size={44} />
                            <span className="name">{runeName(t, rune)}</span>
                            {lock && (
                              <span className="reason">
                                {t(lock === 'asRune' ? 'party.echoAsRune' : 'party.echoNoRoom')}
                              </span>
                            )}
                            <span className="badge">{rune.echoCost}</span>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </>
              )}
            </>
          )}
        </section>
      )}

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
            canChange={canChange}
            onChange={onChange}
            onClose={() => setChosen(null)}
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
  canChange: boolean
  onChange: (state: GameState) => void
  /** Closes the card (once the rune or the echo is equipped or removed). */
  onClose: () => void
}

/** The card of a rune (or its echo): what it does, and the button to wear it or take it off. */
function RuneCard({ state, character, selection, canChange, onChange, onClose }: RuneCardProps) {
  const t = useT()
  const { kind, index } = selection
  const rune = getRune(index)
  const echo = kind === 'echo'
  const wearer = state.characters.find((other) => other.runes.includes(index))
  const worn = echo ? character.echoes.includes(index) : character.runes.includes(index)
  const lock = echo ? getEchoLock(state, character, index) : null
  const disabled = echo
    ? !canChange || (!worn && !canEquipEcho(state, character, index))
    : !canChange || (!worn && (character.runes.length >= RUNE_SLOTS || (!!wearer && wearer !== character)))

  const toggle = () => {
    if (echo) {
      onChange(worn ? unequipEcho(state, character.id, index) : equipEcho(state, character.id, index))
    } else {
      onChange(worn ? unequipRune(state, character.id, index) : equipRune(state, character.id, index))
    }

    onClose()
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
      {echo && lock === 'noRoom' && (
        <p className="lines warning">
          {t('party.echoNoRoomHint', {
            missing: getEchoLoad(character) + rune.echoCost - character.echoCapacity
          })}
        </p>
      )}
      {echo && lock === 'asRune' && <p className="lines warning">{t('party.echoAsRuneHint')}</p>}
      {!echo && wearer && wearer !== character && (
        <p className="lines warning">
          {t('party.runeTakenHint', { name: t(`characters.${wearer.id}.name` as MessageKey) })}
        </p>
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
