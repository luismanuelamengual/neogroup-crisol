'use client'

import './index.scss'
import classNames from 'classnames'
import { useArtImages } from '@/app/(protected)/(art)/hooks/useArtImages'
import { artUrl, figureArtId } from '@/app/(protected)/(art)/utils/art'
import { getSpecies } from '@/app/(protected)/(engine)/data/enemies'

interface EnemyPortraitProps {
  speciesId: string
  size?: number
  className?: string
}

const hex = (color: number) => `#${color.toString(16).padStart(6, '0')}`

/** The picture of an enemy species: its figure when the art exists, its provisional silhouette otherwise. */
export default function EnemyPortrait({ speciesId, size = 96, className }: EnemyPortraitProps) {
  const images = useArtImages()
  const species = getSpecies(speciesId)
  const artId = figureArtId('enemy', speciesId, species.rarity === 'boss')
  const color = hex(species.color)

  return (
    <span className={classNames('enemy-portrait', className)} style={{ width: size, height: size }}>
      {images[artId] ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element -- the art is already a sized webp */}
          <img src={artUrl(artId)} alt="" draggable={false} />
        </>
      ) : (
        <svg viewBox="0 0 64 64" aria-hidden>
          <ellipse cx="32" cy="56" rx="18" ry="4" fill="#000000" opacity="0.3" />
          <path
            d="M14 54 C 10 36, 16 14, 32 12 C 48 14, 54 36, 50 54 Z"
            fill={color}
            stroke="#3a2410"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <circle cx="25" cy="30" r="4.5" fill="#ffffff" />
          <circle cx="39" cy="30" r="4.5" fill="#ffffff" />
          <circle cx="26" cy="31" r="2" fill="#1a1020" />
          <circle cx="40" cy="31" r="2" fill="#1a1020" />
          <path
            d="M20 18 Q 26 14, 30 16"
            stroke="#ffffff"
            strokeWidth="3"
            strokeLinecap="round"
            opacity="0.5"
            fill="none"
          />
        </svg>
      )}
    </span>
  )
}
