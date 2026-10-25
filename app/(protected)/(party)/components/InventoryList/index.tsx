'use client'

import { ITEMS } from '@/app/(protected)/(engine)/data/items'
import { GameState } from '@/app/(protected)/(engine)/models/GameState'
import { itemName } from '@/app/(protected)/(party)/utils/describe'
import { useT } from '@/app/i18n/I18nProvider'
import type { MessageKey } from '@/app/i18n/messages'

interface InventoryListProps {
  state: GameState
}

/** What the party carries: potions and bombs (used in battle) and smithing stones (used at a camp). */
export default function InventoryList({ state }: InventoryListProps) {
  const t = useT()
  const owned = ITEMS.filter((item) => (state.inventory[item.id] ?? 0) > 0)
  const groups = [
    { title: t('party.consumables'), items: owned.filter((item) => item.kind === 'consumable') },
    { title: t('party.stones'), items: owned.filter((item) => item.kind === 'stone') }
  ]

  return (
    <>
      <section>
        <h3>{t('party.inventory')}</h3>
        <p className="lines">
          {t('shop.gold', { gold: state.gold })} · {t('party.echoPool', { count: state.echoes })} ·{' '}
          {t('party.tears', { count: state.tears })}
        </p>
      </section>
      {groups.map((group) => (
        <section key={group.title}>
          <h3>{group.title}</h3>
          {group.items.length === 0 ? (
            <p className="lines">{t('party.empty')}</p>
          ) : (
            <ul className="inventory">
              {group.items.map((item) => (
                <li key={item.id} style={{ marginTop: 6 }}>
                  <strong>
                    {itemName(t, item.id)} {t('party.owned', { count: state.inventory[item.id] })}
                  </strong>
                  <p className="lines">{t(`items.${item.id}.text` as MessageKey)}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </>
  )
}
