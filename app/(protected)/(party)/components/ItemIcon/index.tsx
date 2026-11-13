'use client'

import './index.scss'
import classNames from 'classnames'
import { CSSProperties } from 'react'
import { useArtImages } from '@/app/(protected)/(art)/hooks/useArtImages'
import { artUrl } from '@/app/(protected)/(art)/utils/art'
import { getItem } from '@/app/(protected)/(engine)/data/items'
import { getRune } from '@/app/(protected)/(engine)/data/runes'
import { getWeapon, weaponArtId } from '@/app/(protected)/(engine)/data/weapons'
import { DamageType } from '@/app/(protected)/(engine)/models/DamageType'
import { Item } from '@/app/(protected)/(engine)/models/Item'
import { RuneTier } from '@/app/(protected)/(engine)/models/RuneTier'
import { StatusType } from '@/app/(protected)/(engine)/models/StatusType'
import { runeColor } from '@/app/(protected)/(party)/utils/runeColors'

/** What an icon shows: an item of the inventory, a rune (by index), a weapon or one of the special things. */
export type IconSubject =
  | { type: 'item'; id: string }
  | { type: 'rune'; index: number }
  | { type: 'weapon'; id: string }
  | { type: 'tear' }
  | { type: 'gold' }
  | { type: 'echo' }
  | { type: 'flask' }

interface ItemIconProps {
  subject: IconSubject
  size?: number
  className?: string
}

/** Where the final art of a subject would be (art/catalog.csv, ui batch). */
function artIdOf(subject: IconSubject): string {
  switch (subject.type) {
    case 'item':
      return `icons/items/${subject.id}`
    case 'rune':
      return `icons/runes/${getRune(subject.index).id}`
    case 'weapon':
      return weaponArtId(getWeapon(subject.id).art)
    case 'tear':
      return 'icons/items/tear'
    case 'gold':
      return 'icons/items/gold'
    case 'echo':
      return 'icons/items/echo'
    case 'flask':
      return 'icons/items/flask'
  }
}

const POTION_COLORS: Record<string, string> = {
  'health-potion': '#ff4d4d',
  'greater-health-potion': '#d81f3a',
  'focus-potion': '#4fc3ff',
  'greater-focus-potion': '#1a6fc4',
  antidote: '#7ee05a',
  'revive-potion': '#ffc93c',
  elixir: '#ff5ad2'
}
const STONE_COLORS: Record<string, string> = {
  'rough-stone': '#a08870',
  'tempered-stone': '#8fb4d8',
  'arcane-stone': '#b06cff',
  'abyssal-stone': '#5a2a8a'
}
/** The stone of a rune by its tier (its glyph has the color of the attribute it raises). */
const RUNE_STONES: Record<RuneTier, string> = {
  [RuneTier.LESSER]: '#8a8f9a',
  [RuneTier.GREATER]: '#5a5f9a',
  [RuneTier.ANCESTRAL]: '#7a5a3a',
  [RuneTier.ABYSSAL]: '#3a2460'
}
const OUTLINE = '#3a2410'
/** The color of each kind of hit, for the bombs, blades and oils. */
const ELEMENT_COLORS: Partial<Record<DamageType, string>> = {
  [DamageType.SLASH]: '#d8dee8',
  [DamageType.PIERCE]: '#c8ccd4',
  [DamageType.BLUNT]: '#a08870',
  [DamageType.FIRE]: '#ff8a2a',
  [DamageType.ICE]: '#7fe0ff',
  [DamageType.LIGHTNING]: '#ffe14a',
  [DamageType.EARTH]: '#9be15d',
  [DamageType.LIGHT]: '#fff3a0',
  [DamageType.DARKNESS]: '#a855f7'
}
/** The color of each status a tonic, an oil or a ward leaves. */
const STATUS_TINTS: Partial<Record<StatusType, string>> = {
  [StatusType.ATTACK_UP]: '#ff4d3d',
  [StatusType.DEFENSE_UP]: '#5a8fd8',
  [StatusType.SPEED_UP]: '#34d399',
  [StatusType.CRIT_UP]: '#ffd23c',
  [StatusType.REGEN]: '#5aa83a',
  [StatusType.WARD]: '#9fdcff',
  [StatusType.IMBUE_FIRE]: '#ff8a2a',
  [StatusType.IMBUE_ICE]: '#7fe0ff',
  [StatusType.IMBUE_LIGHTNING]: '#ffe14a',
  [StatusType.IMBUE_EARTH]: '#c08a4a',
  [StatusType.IMBUE_LIGHT]: '#fff3a0',
  [StatusType.IMBUE_DARKNESS]: '#8a4ad8',
  [StatusType.IMBUE_VENOM]: '#84cc16'
}
/** Food drawn as a fruit (and its color), and the rest by shape. */
const FRUITS: Record<string, string> = { 'red-apple': '#e8343a', 'golden-pear': '#ffc93c' }
const BOWLS: Record<string, string> = {
  'fish-stew': '#e8a05a',
  'mushroom-skewer': '#b5835a',
  'honey-cake': '#ffb347',
  'spicy-sausage': '#c8402a',
  'traveler-feast': '#d8a05a'
}

/** Provisional drawing of the consumables that are not potions nor bombs: food, tonics, blades, oils, wards and shields. */
function ConsumableDrawing({ item }: { item: Item }) {
  const tint = STATUS_TINTS[item.buffs?.[0]?.type ?? StatusType.ATTACK_UP] ?? '#ff4d3d'

  switch (item.category) {
    case 'food':
      if (item.id === 'crusty-bread') {
        return (
          <svg viewBox="0 0 64 64" aria-hidden>
            <ellipse cx="32" cy="38" rx="24" ry="15" fill="#d99a4a" stroke={OUTLINE} strokeWidth="3" />
            <path d="M20 32 l6 -5 M30 30 l6 -5 M40 32 l6 -5" stroke="#f5d39a" strokeWidth="3" strokeLinecap="round" />
          </svg>
        )
      }

      if (item.id === 'roast-meat') {
        return (
          <svg viewBox="0 0 64 64" aria-hidden>
            <path d="M40 40 L52 52" stroke="#f5ead8" strokeWidth="7" strokeLinecap="round" />
            <circle cx="54" cy="50" r="5" fill="#f5ead8" stroke={OUTLINE} strokeWidth="2.5" />
            <ellipse cx="28" cy="28" rx="19" ry="16" fill="#a8502a" stroke={OUTLINE} strokeWidth="3" />
            <ellipse cx="22" cy="22" rx="6" ry="3" fill="#ffffff" opacity="0.4" />
          </svg>
        )
      }

      if (item.id === 'wild-berries') {
        return (
          <svg viewBox="0 0 64 64" aria-hidden>
            <path d="M32 10 Q 38 4, 46 8" stroke="#3f8a2a" strokeWidth="4" fill="none" />
            {[
              [24, 30, '#7a2a8a'],
              [40, 30, '#c8283a'],
              [32, 44, '#7a2a8a'],
              [20, 46, '#c8283a'],
              [44, 46, '#7a2a8a']
            ].map(([x, y, color]) => (
              <circle key={`${x}-${y}`} cx={x} cy={y} r="9" fill={color as string} stroke={OUTLINE} strokeWidth="2.5" />
            ))}
          </svg>
        )
      }

      if (FRUITS[item.id]) {
        return (
          <svg viewBox="0 0 64 64" aria-hidden>
            <path d="M32 16 Q 30 8, 34 4" stroke="#6a4a2a" strokeWidth="3" fill="none" />
            <path d="M34 12 Q 44 6, 46 14 Q 38 16, 34 12 Z" fill="#5ac03a" stroke={OUTLINE} strokeWidth="2" />
            <circle cx="32" cy="38" r="20" fill={FRUITS[item.id]} stroke={OUTLINE} strokeWidth="3" />
            <ellipse cx="24" cy="31" rx="4" ry="6" fill="#ffffff" opacity="0.55" />
          </svg>
        )
      }

      return (
        <svg viewBox="0 0 64 64" aria-hidden>
          <ellipse cx="32" cy="30" rx="22" ry="7" fill={BOWLS[item.id] ?? '#d8a05a'} stroke={OUTLINE} strokeWidth="3" />
          <path d="M10 30 Q 12 54, 32 54 Q 52 54, 54 30 Z" fill="#8a5a3a" stroke={OUTLINE} strokeWidth="3" />
          <path
            d="M24 18 Q 22 12, 26 8 M36 18 Q 34 12, 38 8"
            stroke="#ffffff"
            strokeWidth="2.5"
            opacity="0.6"
            fill="none"
          />
        </svg>
      )

    case 'tonic':
      return (
        <svg viewBox="0 0 64 64" aria-hidden>
          <rect x="26" y="4" width="12" height="7" rx="2" fill="#b5835a" stroke={OUTLINE} strokeWidth="2.5" />
          <path
            d="M27 11 L27 20 L20 28 L20 54 Q 20 58, 24 58 L40 58 Q 44 58, 44 54 L44 28 L37 20 L37 11 Z"
            fill="#e8f2ff"
            fillOpacity="0.85"
            stroke={OUTLINE}
            strokeWidth="3"
          />
          <path d="M22 34 L42 34 L42 55 L22 55 Z" fill={tint} />
          {item.buffs?.[1] && <path d="M22 45 L42 45 L42 55 L22 55 Z" fill={STATUS_TINTS[item.buffs[1].type]} />}
          <rect x="24" y="24" width="4" height="22" rx="2" fill="#ffffff" opacity="0.6" />
        </svg>
      )

    case 'throwable': {
      const color = ELEMENT_COLORS[item.damageType ?? DamageType.SLASH] ?? '#d8dee8'

      if (item.id === 'shuriken') {
        return (
          <svg viewBox="0 0 64 64" aria-hidden>
            <path
              d="M32 6 L38 26 L58 32 L38 38 L32 58 L26 38 L6 32 L26 26 Z"
              fill={color}
              stroke={OUTLINE}
              strokeWidth="3"
              strokeLinejoin="round"
            />
            <circle cx="32" cy="32" r="5" fill="#3a3a52" stroke={OUTLINE} strokeWidth="2" />
          </svg>
        )
      }

      if (item.id === 'sling-stone') {
        return (
          <svg viewBox="0 0 64 64" aria-hidden>
            <path d="M8 14 Q 20 50, 32 44 Q 44 50, 56 14" stroke="#8a5a3a" strokeWidth="4" fill="none" />
            <circle cx="32" cy="40" r="12" fill="#9a9aa8" stroke={OUTLINE} strokeWidth="3" />
            <ellipse cx="28" cy="36" rx="4" ry="2.5" fill="#ffffff" opacity="0.5" />
          </svg>
        )
      }

      if (item.id === 'pepper-pouch') {
        return (
          <svg viewBox="0 0 64 64" aria-hidden>
            <path d="M18 26 Q 10 54, 32 56 Q 54 54, 46 26 Z" fill="#c8a06a" stroke={OUTLINE} strokeWidth="3" />
            <path d="M22 26 L42 26" stroke="#8a2a1a" strokeWidth="4" strokeLinecap="round" />
            <circle cx="28" cy="14" r="4" fill="#e8402a" />
            <circle cx="38" cy="10" r="3" fill="#e8402a" />
            <circle cx="34" cy="18" r="2.5" fill="#e8402a" />
          </svg>
        )
      }

      if (item.id.includes('dart') || item.id.includes('needle')) {
        const feather = item.status ? (STATUS_TINTS[item.status.type] ?? '#7ee05a') : '#7ee05a'

        return (
          <svg viewBox="0 0 64 64" aria-hidden>
            <path d="M10 54 L40 24" stroke={OUTLINE} strokeWidth="6" strokeLinecap="round" />
            <path d="M10 54 L40 24" stroke={color} strokeWidth="3" strokeLinecap="round" />
            <path d="M40 24 L56 8 L48 28 Z M40 24 L56 8 L36 16 Z" fill={feather} stroke={OUTLINE} strokeWidth="2" />
          </svg>
        )
      }

      const long = item.id === 'javelin'

      return (
        <svg viewBox="0 0 64 64" aria-hidden>
          <path
            d={long ? 'M50 8 L58 6 L56 14 L20 50 L14 44 Z' : 'M46 8 L56 8 L56 18 L30 44 L20 34 Z'}
            fill={color}
            stroke={OUTLINE}
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <path
            d={long ? 'M18 46 L6 58' : 'M16 30 L34 48 M24 42 L12 54'}
            stroke={long ? '#8a5a3a' : OUTLINE}
            strokeWidth="6"
            strokeLinecap="round"
          />
        </svg>
      )
    }

    case 'oil':
      return (
        <svg viewBox="0 0 64 64" aria-hidden>
          <path d="M40 28 L56 16 L54 22 L42 34 Z" fill="#c8ccd4" stroke={OUTLINE} strokeWidth="2.5" />
          <rect x="24" y="8" width="12" height="8" rx="2" fill="#6a6a7a" stroke={OUTLINE} strokeWidth="2.5" />
          <path
            d="M25 16 L25 22 Q 12 28, 12 42 a18 16 0 0 0 36 0 Q 48 28, 35 22 L35 16 Z"
            fill="#e8f2ff"
            fillOpacity="0.85"
            stroke={OUTLINE}
            strokeWidth="3"
          />
          <path d="M14 42 a16 14 0 0 0 32 0 Z" fill={tint} />
          <ellipse cx="22" cy="34" rx="3" ry="5" fill="#ffffff" opacity="0.7" />
        </svg>
      )

    case 'ward':
      return (
        <svg viewBox="0 0 64 64" aria-hidden>
          <path d="M18 8 Q 32 26, 46 8" stroke="#c8ccd4" strokeWidth="3" fill="none" />
          <circle cx="32" cy="38" r="20" fill="#e8d07a" stroke={OUTLINE} strokeWidth="3" />
          <circle cx="32" cy="38" r="10" fill={item.cure ? '#ffffff' : tint} stroke={OUTLINE} strokeWidth="2.5" />
          <ellipse cx="28" cy="34" rx="3" ry="2" fill="#ffffff" opacity="0.8" />
        </svg>
      )

    default: {
      const shields = item.shields ?? 1

      return (
        <svg viewBox="0 0 64 64" aria-hidden>
          <path
            d="M32 4 L54 12 L54 30 Q 54 48, 32 60 Q 10 48, 10 30 L10 12 Z"
            fill={item.target === 'allAllies' ? '#5ac0a8' : '#2f7fe0'}
            stroke={OUTLINE}
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <path
            d="M32 10 L48 16 L48 30 Q 48 44, 32 53 Q 16 44, 16 30 L16 16 Z"
            fill="none"
            stroke="#9fd8ff"
            strokeWidth="2"
          />
          {Array.from({ length: shields }, (_, index) => (
            <circle
              key={index}
              cx={32 + (index - (shields - 1) / 2) * 11}
              cy="32"
              r="4.5"
              fill="#ffffff"
              stroke={OUTLINE}
              strokeWidth="1.5"
            />
          ))}
        </svg>
      )
    }
  }
}

/** Provisional drawing of a subject, until its image exists. */
function Placeholder({ subject }: { subject: IconSubject }) {
  if (subject.type === 'tear') {
    return (
      <svg viewBox="0 0 64 64" aria-hidden>
        <path
          d="M32 6 C 22 22, 14 32, 14 42 a18 18 0 0 0 36 0 C 50 32, 42 22, 32 6 Z"
          fill="#9fdcff"
          stroke={OUTLINE}
          strokeWidth="3"
        />
        <ellipse cx="25" cy="40" rx="4" ry="7" fill="#ffffff" opacity="0.7" />
      </svg>
    )
  }

  if (subject.type === 'gold') {
    return (
      <svg viewBox="0 0 64 64" aria-hidden>
        <circle cx="32" cy="32" r="22" fill="#ffc93c" stroke={OUTLINE} strokeWidth="3" />
        <circle cx="32" cy="32" r="14" fill="none" stroke="#c98a1a" strokeWidth="3" />
        <ellipse cx="24" cy="24" rx="5" ry="3" fill="#ffffff" opacity="0.6" />
      </svg>
    )
  }

  if (subject.type === 'echo') {
    return (
      <svg viewBox="0 0 64 64" aria-hidden>
        <circle cx="32" cy="32" r="20" fill="#2a2460" stroke={OUTLINE} strokeWidth="3" />
        <path d="M32 18 a14 14 0 1 1 -14 14 a9 9 0 1 1 9 9" stroke="#7fe0ff" strokeWidth="4" fill="none" />
      </svg>
    )
  }

  if (subject.type === 'flask') {
    return (
      <svg viewBox="0 0 64 64" aria-hidden>
        <rect x="25" y="5" width="14" height="8" rx="2" fill="#b5835a" stroke={OUTLINE} strokeWidth="2.5" />
        <path
          d="M27 13 L27 22 C 16 26, 12 34, 12 42 a20 18 0 0 0 40 0 C 52 34, 48 26, 37 22 L37 13 Z"
          fill="#ffb347"
          stroke={OUTLINE}
          strokeWidth="3"
        />
        <ellipse cx="22" cy="34" rx="3" ry="6" fill="#ffffff" opacity="0.7" />
      </svg>
    )
  }

  if (subject.type === 'weapon') {
    return (
      <svg viewBox="0 0 64 64" aria-hidden>
        <path d="M46 8 L56 8 L56 18 L26 48 L16 38 Z" fill="#c8d0dc" stroke={OUTLINE} strokeWidth="3" />
        <path d="M12 34 L30 52 M14 50 L8 56" stroke={OUTLINE} strokeWidth="5" strokeLinecap="round" />
      </svg>
    )
  }

  if (subject.type === 'rune') {
    const rune = getRune(subject.index)
    const color = runeColor(rune)

    return (
      <svg viewBox="0 0 64 64" aria-hidden>
        <rect
          x="12"
          y="8"
          width="40"
          height="48"
          rx="12"
          fill={RUNE_STONES[rune.tier]}
          stroke={OUTLINE}
          strokeWidth="3"
        />
        <path d="M32 18 L32 46 M22 26 L42 38 M42 26 L22 38" stroke={color} strokeWidth="4" strokeLinecap="round" />
        <circle cx="32" cy="32" r="5" fill={color} />
      </svg>
    )
  }

  const item = getItem(subject.id)

  if (item.kind === 'stone') {
    const color = STONE_COLORS[item.id] ?? '#a08870'

    return (
      <svg viewBox="0 0 64 64" aria-hidden>
        <path
          d="M32 6 L54 22 L46 54 L18 54 L10 22 Z"
          fill={color}
          stroke={OUTLINE}
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <path d="M10 22 L32 30 L54 22 M32 30 L32 54" stroke={OUTLINE} strokeWidth="2" opacity="0.5" fill="none" />
        <path d="M20 20 L30 14" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" opacity="0.6" />
      </svg>
    )
  }

  if (item.category && item.category !== 'potion' && item.category !== 'bomb') {
    return <ConsumableDrawing item={item} />
  }

  if (item.category === 'bomb' || item.power) {
    const color = ELEMENT_COLORS[item.damageType ?? DamageType.FIRE] ?? '#ff8a2a'

    return (
      <svg viewBox="0 0 64 64" aria-hidden>
        <path d="M38 16 Q 46 6, 54 10" stroke={OUTLINE} strokeWidth="3" fill="none" />
        <circle cx="55" cy="9" r="4" fill={color} />
        <rect
          x="31"
          y="12"
          width="12"
          height="8"
          rx="2"
          fill="#6a6a7a"
          stroke={OUTLINE}
          strokeWidth="2"
          transform="rotate(30 37 16)"
        />
        <circle cx="30" cy="38" r="20" fill="#3a3a52" stroke={OUTLINE} strokeWidth="3" />
        <path d="M12 40 Q 30 48, 48 40" stroke={color} strokeWidth="5" fill="none" />
        <ellipse cx="22" cy="30" rx="5" ry="3" fill="#ffffff" opacity="0.45" />
      </svg>
    )
  }

  const color = POTION_COLORS[item.id] ?? '#ff4d4d'

  return (
    <svg viewBox="0 0 64 64" aria-hidden>
      <rect x="25" y="5" width="14" height="8" rx="2" fill="#b5835a" stroke={OUTLINE} strokeWidth="2.5" />
      <path
        d="M27 13 L27 22 C 16 26, 12 34, 12 42 a20 18 0 0 0 40 0 C 52 34, 48 26, 37 22 L37 13 Z"
        fill="#e8f2ff"
        fillOpacity="0.85"
        stroke={OUTLINE}
        strokeWidth="3"
      />
      <path d="M14 40 a18 16 0 0 0 36 0 Z" fill={color} />
      <ellipse cx="22" cy="34" rx="3" ry="6" fill="#ffffff" opacity="0.7" />
    </svg>
  )
}

/** The picture of something of the inventory: its final art when it exists, a provisional drawing otherwise. */
export default function ItemIcon({ subject, size = 48, className }: ItemIconProps) {
  const images = useArtImages()
  const artId = artIdOf(subject)
  const style: CSSProperties = { width: size, height: size }

  if (subject.type === 'rune') {
    Object.assign(style, { '--rune-color': runeColor(getRune(subject.index)) })
  }

  return (
    <span className={classNames('item-icon', { rune: subject.type === 'rune' }, className)} style={style}>
      {images[artId] ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element -- the art is already a sized webp */}
          <img src={artUrl(artId)} alt="" draggable={false} />
        </>
      ) : (
        <Placeholder subject={subject} />
      )}
    </span>
  )
}
