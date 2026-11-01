'use client'

import { useEffect, useState } from 'react'
import { ArtManifest } from '@/app/(protected)/(art)/models/ArtManifest'
import { loadArtManifest } from '@/app/(protected)/(art)/utils/art'

/**
 * The images of the final art that exist (by id, see ArtManifest), for the
 * screens drawn with HTML: empty until the manifest loads, so they start with
 * the provisional art.
 */
export function useArtImages(): ArtManifest['images'] {
  const [images, setImages] = useState<ArtManifest['images']>({})

  useEffect(() => {
    let cancelled = false

    void loadArtManifest().then((manifest) => {
      if (!cancelled) {
        setImages(manifest.images)
      }
    })

    return () => {
      cancelled = true
    }
  }, [])

  return images
}
