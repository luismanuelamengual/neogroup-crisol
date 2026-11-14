'use client'

import './index.scss'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import classNames from 'classnames'
import { useState } from 'react'
import { ITEMS } from '@/app/(protected)/(engine)/data/items'
import { getRune, RUNE_MASTERY_WINS } from '@/app/(protected)/(engine)/data/runes'
import { CharacterId } from '@/app/(protected)/(engine)/models/CharacterId'
import { CharacterState } from '@/app/(protected)/(engine)/models/CharacterState'
import { GameState } from '@/app/(protected)/(engine)/models/GameState'
import { canForgetSkills, getMaxHealth, isRuneMastered } from '@/app/(protected)/(engine)/utils/heroes'
import { getFocus } from '@/app/(protected)/(engine)/utils/worldMap'
import ItemIcon, { IconSubject } from '@/app/(protected)/(party)/components/ItemIcon'
import { describeRune, itemName, runeName } from '@/app/(protected)/(party)/utils/describe'
import { ITEM_FAMILIES, ItemFamily, itemFamily } from '@/app/(protected)/(party)/utils/itemFamilies'
import GameButton from '@/app/components/GameButton'
import GameScreen from '@/app/components/GameScreen'
import { useT } from '@/app/i18n/I18nProvider'
import type { MessageKey } from '@/app/i18n/messages'

interface InventoryScreenProps {
  state: GameState
  /** A Tear of Oblivion gives back the skill points of a hero. */
  onSpendTear: (characterId: CharacterId) => void
  onClose: () => void
}

type Category = 'all' | ItemFamily | 'runes' | 'special'

const CATEGORIES: Category[] = ['all', ...ITEM_FAMILIES, 'runes', 'special']

/** Something the inventory shows: an item, a rune or a Tear of Oblivion. */
interface Entry {
  key: string
  category: Exclude<Category, 'all'>
  subject: IconSubject
  name: string
  count: number
}

/** What the party carries (full screen over the map), by kind, each thing with its picture and what it does. */
export default function InventoryScreen({ state, onSpendTear, onClose }: InventoryScreenProps) {
  const t = useT()
  const [category, setCategory] = useState<Category>('all')
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const entries: Entry[] = [
    ...ITEMS.filter((item) => (state.inventory[item.id] ?? 0) > 0).map((item) => ({
      key: `item:${item.id}`,
      category: itemFamily(item),
      subject: { type: 'item', id: item.id } as IconSubject,
      name: itemName(t, item.id),
      count: state.inventory[item.id]
    })),
    ...[...state.runes]
      .sort((a, b) => a - b)
      .map((index) => ({
        key: `rune:${index}`,
        category: 'runes' as const,
        subject: { type: 'rune', index } as IconSubject,
        name: runeName(t, getRune(index)),
        count: 1
      })),
    ...(state.tears > 0
      ? [
          {
            key: 'tear',
            category: 'special' as const,
            subject: { type: 'tear' } as IconSubject,
            name: t('inventory.tear.name'),
            count: state.tears
          }
        ]
      : [])
  ]
  const shown = category === 'all' ? entries : entries.filter((entry) => entry.category === category)
  const selected = entries.find((entry) => entry.key === selectedKey) ?? null

  return (
    <GameScreen
      open
      title={t('party.inventory')}
      onClose={onClose}
      className="inventory-screen"
      tabs={CATEGORIES.map((id) => ({ id, label: t(`inventory.tabs.${id}`) }))}
      tab={category}
      onTab={setCategory}
    >
      <p className="wealth">
        <span>{t('shop.gold', { gold: state.gold })}</span>
        <span>{t('party.echoPool', { count: state.echoes })}</span>
      </p>
      {shown.length === 0 ? (
        <p className="empty">{t(`inventory.empty.${category}`)}</p>
      ) : (
        <ul className="grid">
          {shown.map((entry) => (
            <li key={entry.key}>
              <button type="button" className="tile" onClick={() => setSelectedKey(entry.key)}>
                <ItemIcon subject={entry.subject} size={56} />
                {entry.count > 1 && <span className="count">×{entry.count}</span>}
                <span className="name">{entry.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {selected && (
        <EntryDialog
          key={selected.key}
          entry={selected}
          state={state}
          onSpendTear={onSpendTear}
          onClose={() => setSelectedKey(null)}
        />
      )}
    </GameScreen>
  )
}

interface EntryDialogProps {
  entry: Entry
  state: GameState
  onSpendTear: (characterId: CharacterId) => void
  onClose: () => void
}

/** One thing of the inventory: its picture, what it does and, when it can be used now, who uses it. */
function EntryDialog({ entry, state, onSpendTear, onClose }: EntryDialogProps) {
  const t = useT()
  const [choosing, setChoosing] = useState(false)
  const lines: string[] = []
  let usage: { use: (id: CharacterId) => void; can: (character: CharacterState) => boolean } | null = null
  let note: string | null = null

  if (entry.subject.type === 'item') {
    const itemId = entry.subject.id

    lines.push(t(`items.${itemId}.text` as MessageKey))

    // Consumables are only used in battle (up to three per turn); stones at the smith.
    note = t(entry.category === 'stones' ? 'inventory.stoneUse' : 'inventory.battleOnly')
  } else if (entry.subject.type === 'rune') {
    const index = entry.subject.index
    const rune = getRune(index)
    const wearer = state.characters.find((character) => character.runes.includes(index))

    lines.push(t('inventory.runeTier', { tier: t(`world.runeTiers.${rune.tier}`) }))
    lines.push(...describeRune(t, rune))
    lines.push(
      isRuneMastered(state, index)
        ? t('party.mastered')
        : t('party.mastery', { wins: state.runeWins[index] ?? 0, needed: RUNE_MASTERY_WINS })
    )

    if (wearer) {
      lines.push(t('party.wornBy', { name: t(`characters.${wearer.id}.name` as MessageKey) }))
    }

    note = t('inventory.runeUse')
  } else {
    lines.push(t('inventory.tear.text'))
    usage = { use: onSpendTear, can: canForgetSkills }
  }

  const canUse = !!usage && state.characters.some((character) => usage!.can(character))

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="xs" className="inventory-entry">
      <DialogTitle className="title">
        <ItemIcon subject={entry.subject} size={64} />
        <span className="titles">
          <span className="name">{entry.name}</span>
          {entry.count > 1 && <span className="count">{t('party.owned', { count: entry.count })}</span>}
        </span>
      </DialogTitle>
      <div className="body">
        {lines.map((line) => (
          <p key={line} className="lines">
            {line}
          </p>
        ))}
        {note && <p className="note">{note}</p>}
        {usage && !choosing && (
          <GameButton fullWidth color="cyan" disabled={!canUse} onClick={() => setChoosing(true)}>
            {t('inventory.use')}
          </GameButton>
        )}
        {usage && !canUse && <p className="note">{t('inventory.tear.nobody')}</p>}
      </div>
      {usage && choosing && (
        <>
          <p className="choose">{t('inventory.tear.chooseHero')}</p>
          <List sx={{ pb: 2 }}>
            {state.characters.map((character) => (
              <HeroOption
                key={character.id}
                character={character}
                disabled={!usage!.can(character)}
                onClick={() => {
                  usage!.use(character.id)
                  setChoosing(false)
                }}
              />
            ))}
          </List>
        </>
      )}
    </Dialog>
  )
}

/** A hero to pick, with its health and focus. */
function HeroOption({
  character,
  disabled,
  onClick
}: {
  character: CharacterState
  disabled: boolean
  onClick: () => void
}) {
  const t = useT()
  const maxHealth = getMaxHealth(character)
  const { focus, maxFocus } = getFocus(character)

  return (
    <ListItemButton className="hero" disabled={disabled} onClick={onClick}>
      <span className="name">{t(`characters.${character.id}.name` as MessageKey)}</span>
      <span className="bars">
        <span className="bar health">
          <span className="fill" style={{ width: `${Math.round((character.health / maxHealth) * 100)}%` }} />
        </span>
        <span className="value">
          {character.health}/{maxHealth}
        </span>
        <span className={classNames('bar', 'focus')}>
          <span className="fill" style={{ width: `${Math.round((focus / maxFocus) * 100)}%` }} />
        </span>
        <span className="value">
          {focus}/{maxFocus}
        </span>
      </span>
    </ListItemButton>
  )
}
