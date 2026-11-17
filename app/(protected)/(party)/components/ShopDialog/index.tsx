'use client'

import './index.scss'
import Dialog from '@mui/material/Dialog'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Popover from '@mui/material/Popover'
import classNames from 'classnames'
import { MouseEvent, useState } from 'react'
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

/** The offer whose card is open (an item of the stock, or the Scholar's Echo), next to the tile clicked. */
interface Selection {
  /** The id of the item, or null for the Echo. */
  itemId: string | null
  anchor: HTMLElement
}

/**
 * The stock of the merchant where the party stands, as one compact grid (the
 * Scholar's Echo first): each thing is a small tile with its picture and
 * its price. Clicking one opens its card next to it, with what it does and the
 * button to buy it (the card stays open, to buy several in a row).
 */
export default function ShopDialog({ open, index, state, merchant, onChange, onClose }: ShopDialogProps) {
  const t = useT()
  const echoPrice = getScholarOffer(state)
  const stock = MERCHANT_STOCK[merchant]
  // All together in one grid (the Scholar's Echo first), the like ones next to each other.
  const offers = ITEM_FAMILIES.flatMap((family) => stock.filter((offer) => itemFamily(offer.itemId) === family))
  const [chosen, setChosen] = useState<Selection | null>(null)
  const selection = open && chosen?.anchor.isConnected ? chosen : null
  const choose = (itemId: string | null) => (event: MouseEvent<HTMLElement>) =>
    setChosen({ itemId, anchor: event.currentTarget })
  const isChosen = (itemId: string | null) => !!selection && selection.itemId === itemId

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md" className="shop-dialog">
      <DialogTitle className="title">
        {t(`world.merchants.${merchant}` as MessageKey)}
        <span className="gold">
          <ItemIcon subject={{ type: 'gold' }} size={18} />
          {t('shop.gold', { gold: state.gold })}
        </span>
      </DialogTitle>
      <DialogContent className="content">
        <ul className="offers">
          {merchant === MerchantId.SCHOLAR && (
            <li>
              <button
                type="button"
                className={classNames('offer', 'echo', {
                  chosen: isChosen(null),
                  out: echoPrice === null,
                  poor: echoPrice !== null && state.gold < echoPrice
                })}
                aria-label={t('shop.echo')}
                title={t('shop.echo')}
                onClick={choose(null)}
              >
                <ItemIcon subject={{ type: 'echo' }} size={40} />
                <span className="price">{echoPrice ?? '—'}</span>
                {echoPrice !== null && <span className="badge">{SCHOLAR_STOCK - state.scholarSold}</span>}
              </button>
            </li>
          )}
          {offers.map(({ itemId, price }) => {
            const owned = state.inventory[itemId] ?? 0
            const full = owned >= maxCarried(itemId)

            return (
              <li key={itemId}>
                <button
                  type="button"
                  className={classNames('offer', {
                    chosen: isChosen(itemId),
                    out: full,
                    poor: !full && state.gold < price
                  })}
                  aria-label={itemName(t, itemId)}
                  title={itemName(t, itemId)}
                  onClick={choose(itemId)}
                >
                  <ItemIcon subject={{ type: 'item', id: itemId }} size={40} />
                  <span className="price">{price}</span>
                  {owned > 0 && <span className="badge">{full ? t('shop.max') : `×${owned}`}</span>}
                </button>
              </li>
            )
          })}
        </ul>
      </DialogContent>
      <Popover
        open={!!selection}
        anchorEl={selection?.anchor}
        onClose={() => setChosen(null)}
        anchorOrigin={{ vertical: 'center', horizontal: 'right' }}
        transformOrigin={{ vertical: 'center', horizontal: 'left' }}
        marginThreshold={8}
        slotProps={{ paper: { className: 'shop-card-paper' } }}
      >
        {selection &&
          (selection.itemId === null ? (
            <EchoCard index={index} state={state} onChange={onChange} />
          ) : (
            <OfferCard index={index} state={state} merchant={merchant} itemId={selection.itemId} onChange={onChange} />
          ))}
      </Popover>
    </Dialog>
  )
}

interface OfferCardProps {
  index: WorldIndex
  state: GameState
  merchant: MerchantId
  itemId: string
  onChange: (state: GameState) => void
}

/** The card of an item of the stock: its picture, what it does, how many the party carries and the button to buy it. */
function OfferCard({ index, state, merchant, itemId, onChange }: OfferCardProps) {
  const t = useT()
  const price = MERCHANT_STOCK[merchant].find((offer) => offer.itemId === itemId)?.price ?? 0
  const owned = state.inventory[itemId] ?? 0
  const max = maxCarried(itemId)
  const full = owned >= max

  return (
    <div className="shop-card">
      <div className="header">
        <ItemIcon subject={{ type: 'item', id: itemId }} size={64} />
        <div className="titles">
          <span className="name">{itemName(t, itemId)}</span>
          <span className="carried">{t('shop.carried', { count: owned, max })}</span>
        </div>
      </div>
      <p className="lines">{t(`items.${itemId}.text` as MessageKey)}</p>
      {full && <p className="lines warning">{t('shop.full')}</p>}
      {!full && state.gold < price && <p className="lines warning">{t('shop.notEnoughGold')}</p>}
      <GameButton
        fullWidth
        size="small"
        disabled={!canBuyItem(index, state, itemId)}
        onClick={() => onChange(buyItem(index, state, itemId))}
      >
        {t('shop.buy', { price })}
      </GameButton>
    </div>
  )
}

interface EchoCardProps {
  index: WorldIndex
  state: GameState
  onChange: (state: GameState) => void
}

/** The card of the Scholar's Echo: what it is, how many are left this cycle and the button to buy one. */
function EchoCard({ index, state, onChange }: EchoCardProps) {
  const t = useT()
  const price = getScholarOffer(state)

  return (
    <div className="shop-card echo">
      <div className="header">
        <ItemIcon subject={{ type: 'echo' }} size={64} />
        <div className="titles">
          <span className="name">{t('shop.echo')}</span>
          {price !== null && (
            <span className="carried">{t('shop.echoesLeft', { count: SCHOLAR_STOCK - state.scholarSold })}</span>
          )}
        </div>
      </div>
      <p className="lines">{t('shop.echoText')}</p>
      {price === null && <p className="lines warning">{t('shop.soldOut')}</p>}
      {price !== null && state.gold < price && <p className="lines warning">{t('shop.notEnoughGold')}</p>}
      {price !== null && (
        <GameButton
          fullWidth
          size="small"
          color="magenta"
          disabled={state.gold < price}
          onClick={() => onChange(buyEcho(index, state))}
        >
          {t('shop.buy', { price })}
        </GameButton>
      )}
    </div>
  )
}
