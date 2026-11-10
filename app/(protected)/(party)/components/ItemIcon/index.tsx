'use client'

import './index.scss'
import classNames from 'classnames'
import { CSSProperties } from 'react'
import { useArtImages } from '@/app/(protected)/(art)/hooks/useArtImages'
import { artUrl } from '@/app/(protected)/(art)/utils/art'
import { getItem } from '@/app/(protected)/(engine)/data/items'
import { getRune } from '@/app/(protected)/(engine)/data/runes'
import { DamageType } from '@/app/(protected)/(engine)/models/DamageType'
import { RuneTier } from '@/app/(protected)/(engine)/models/RuneTier'
import { runeColor } from '@/app/(protected)/(party)/utils/runeColors'

/** What an icon shows: an item of the inventory, a rune (by index) or one of the special things. */
export type IconSubject = { type: 'item'; id: string } | { type: 'rune'; index: number } | { type: 'tear' }

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
    case 'tear':
      return 'icons/items/tear'
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

  if (item.power) {
    const color = item.damageType === DamageType.ICE ? '#7fe0ff' : '#ff8a2a'

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
