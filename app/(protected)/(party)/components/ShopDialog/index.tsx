'use client'

import './index.scss'
import Dialog from '@mui/material/Dialog'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import { maxCarried, MERCHANT_STOCK, SCHOLAR_STOCK } from '@/app/(protected)/(engine)/data/items'
import { GameState } from '@/app/(protected)/(engine)/models/GameState'
import { MerchantId } from '@/app/(protected)/(engine)/models/MerchantId'
import { buyEcho, buyItem, canBuyItem, getScholarOffer } from '@/app/(protected)/(engine)/utils/shop'
import { WorldIndex } from '@/app/(protected)/(engine)/utils/worldMap'
import ItemIcon from '@/app/(protected)/(party)/components/ItemIcon'
import { itemName } from '@/app/(protected)/(party)/utils/describe'
import { ITEM_FAMILIES, itemFamily } from '@/app/(protected)/(party)/utils/itemFamilies'
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

/** The stock of the merchant where the party stands, by family (the Scholar's Echo first), each thing with its picture. */
export default function ShopDialog({ open, index, state, merchant, onChange, onClose }: ShopDialogProps) {
  const t = useT()
  const echoPrice = getScholarOffer(state)
  const stock = MERCHANT_STOCK[merchant]
  const families = ITEM_FAMILIES.map((family) => ({
    family,
    offers: stock.filter((offer) => itemFamily(offer.itemId) === family)
  })).filter(({ offers }) => offers.length > 0)

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" className="shop-dialog">
      <DialogTitle className="title">
        {t(`world.merchants.${merchant}` as MessageKey)}
        <span className="gold">{t('shop.gold', { gold: state.gold })}</span>
      </DialogTitle>
      <DialogContent className="content">
        {merchant === MerchantId.SCHOLAR && (
          <ul className="offers">
            <li className="offer echo">
              <ItemIcon subject={{ type: 'echo' }} size={44} />
              <div className="body">
                <strong className="name">{t('shop.echo')}</strong>
                <p className="text">
                  {t('shop.echoText')}{' '}
                  {echoPrice !== null && t('shop.echoesLeft', { count: SCHOLAR_STOCK - state.scholarSold })}
                </p>
                {echoPrice === null ? (
                  <p className="text">{t('shop.soldOut')}</p>
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
              </div>
            </li>
          </ul>
        )}
        {families.map(({ family, offers }) => (
          <section key={family} className="family">
            {families.length > 1 && <h3>{t(`inventory.tabs.${family}`)}</h3>}
            <ul className="offers">
              {offers.map(({ itemId, price }) => {
                const owned = state.inventory[itemId] ?? 0
                const full = owned >= maxCarried(itemId)

                return (
                  <li key={itemId} className="offer">
                    <ItemIcon subject={{ type: 'item', id: itemId }} size={44} />
                    <div className="body">
                      <strong className="name">
                        {itemName(t, itemId)} <span className="owned">{t('party.owned', { count: owned })}</span>
                      </strong>
                      <p className="text">{t(`items.${itemId}.text` as MessageKey)}</p>
                      <GameButton
                        size="small"
                        disabled={!canBuyItem(index, state, itemId)}
                        onClick={() => onChange(buyItem(index, state, itemId))}
                      >
                        {full ? t('shop.full') : t('shop.buy', { price })}
                      </GameButton>
                    </div>
                  </li>
                )
              })}
            </ul>
          </section>
        ))}
      </DialogContent>
    </Dialog>
  )
}
