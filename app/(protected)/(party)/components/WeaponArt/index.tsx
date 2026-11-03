'use client'

import './index.scss'
import classNames from 'classnames'
import { useArtImages } from '@/app/(protected)/(art)/hooks/useArtImages'
import { artUrl } from '@/app/(protected)/(art)/utils/art'
import { Weapon, weaponArtId } from '@/app/(protected)/(engine)/data/weapons'
import SkillIcon from '@/app/(protected)/(party)/components/SkillIcon'

interface WeaponArtProps {
  weapon: Weapon
  /** The hero holds it: a warmer frame. */
  held?: boolean
  className?: string
}

/**
 * The picture of a weapon on its own (heroes/<id>/weapons/<art>-portrait, see `yarn
 * art`), in a frame; until it exists, the medallion of its weapon attack,
 * colored by its damage type.
 */
export default function WeaponArt({ weapon, held = false, className }: WeaponArtProps) {
  const images = useArtImages()
  const artId = weaponArtId(weapon.characterId, weapon.art)

  return (
    <span className={classNames('weapon-art', { held }, className)}>
      {images[artId] ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element -- the art is already a sized webp */}
          <img src={artUrl(artId)} alt="" draggable={false} />
        </>
      ) : (
        <SkillIcon skillId={weapon.attack} size="large" className="placeholder" />
      )}
    </span>
  )
}
