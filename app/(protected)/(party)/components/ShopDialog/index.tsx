'use client'

import Dialog from '@mui/material/Dialog'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import { getItem, MAX_CONSUMABLES, MERCHANT_STOCK, SCHOLAR_STOCK } from '@/app/(protected)/(engine)/data/items'
import { GameState } from '@/app/(protected)/(engine)/models/GameState'
import { MerchantId } from '@/app/(protected)/(engine)/models/MerchantId'
import { buyEcho, buyItem, canBuyItem, getScholarOffer } from '@/app/(protected)/(engine)/utils/shop'
import { WorldIndex } from '@/app/(protected)/(engine)/utils/worldMap'
import { itemName } from '@/app/(protected)/(party)/utils/describe'
import GameButton from '@/app/components/GameButton'
import { useT } from '@/app/i18n/I18nProvider'
import type { MessageKey } from '@/app/i18n/messages'

interface ShopDialogProps {
  open: boolean
  index: WorldIndex
  state: GameState
  merchant: MerchantId
  onChange: (state: GameState) => void
  onClose: () => void
}

/** The stock of the merchant where the party stands. */
export default function ShopDialog({ open, index, state, merchant, onChange, onClose }: ShopDialogProps) {
  const t = useT()
  const echoPrice = getScholarOffer(state)

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>
        {t(`world.merchants.${merchant}` as MessageKey)}
        <div style={{ color: 'var(--color-gold)', fontSize: '0.85rem' }}>{t('shop.gold', { gold: state.gold })}</div>
      </DialogTitle>
      <DialogContent>
        <ul style={{ display: 'flex', flexDirection: 'column', gap: 12, margin: 0, padding: 0, listStyle: 'none' }}>
          {MERCHANT_STOCK[merchant].map(({ itemId, price }) => {
            const owned = state.inventory[itemId] ?? 0
            const full = getItem(itemId).kind === 'consumable' && owned >= MAX_CONSUMABLES

            return (
              <li key={itemId}>
                <strong>
                  {itemName(t, itemId)} {t('party.owned', { count: owned })}
                </strong>
                <p style={{ margin: '2px 0 6px', color: 'var(--color-text-secondary)', fontSize: '0.8rem' }}>
                  {t(`items.${itemId}.text` as MessageKey)}
                </p>
                <GameButton
                  size="small"
                  disabled={!canBuyItem(index, state, itemId)}
                  onClick={() => onChange(buyItem(index, state, itemId))}
                >
                  {full ? t('shop.full') : t('shop.buy', { price })}
                </GameButton>
              </li>
            )
          })}
          {merchant === MerchantId.SCHOLAR && (
            <li>
              <strong>{t('shop.echo')}</strong>
              <p style={{ margin: '2px 0 6px', color: 'var(--color-text-secondary)', fontSize: '0.8rem' }}>
                {t('shop.echoText')}{' '}
                {echoPrice !== null && t('shop.echoesLeft', { count: SCHOLAR_STOCK - state.scholarSold })}
              </p>
              {echoPrice === null ? (
                <p style={{ margin: 0 }}>{t('shop.soldOut')}</p>
              ) : (
                <GameButton
                  size="small"
                  color="magenta"
                  disabled={state.gold < echoPrice}
                  onClick={() => onChange(buyEcho(index, state))}
                >
                  {t('shop.buy', { price: echoPrice })}
                </GameButton>
              )}
            </li>
          )}
        </ul>
      </DialogContent>
    </Dialog>
  )
}
