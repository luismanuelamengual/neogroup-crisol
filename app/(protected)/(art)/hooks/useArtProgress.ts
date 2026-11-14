'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

/** Below 100 % until the canvas is ready: after the files, the textures are still built and uploaded. */
const MAX_WHILE_LOADING = 0.99

export interface ArtProgress {
  /** Share of the files of art loaded, from 0 to 1 (never going back). */
  value: number
  /** For watchArtLoading: files loaded and files in all (it can be called many times per frame). */
  report: (loaded: number, total: number) => void
  /** Back to 0, for a new load. */
  reset: () => void
}

/**
 * How the loading of the art of a canvas goes, for its loading screen. The
 * counts that arrive (one per file) are shown at most once per frame, so a
 * load of hundreds of files renders the screen only a few dozen times.
 */
export function useArtProgress(): ArtProgress {
  const [value, setValue] = useState(0)
  const latest = useRef(0)
  const frame = useRef(0)

  useEffect(() => () => cancelAnimationFrame(frame.current), [])

  const actions = useMemo(
    () => ({
      report: (loaded: number, total: number) => {
        // The files register as their loads start: the share never goes back when more of them appear.
        latest.current = Math.max(latest.current, total ? Math.min(MAX_WHILE_LOADING, loaded / total) : 0)
        frame.current ||= requestAnimationFrame(() => {
          frame.current = 0
          setValue(latest.current)
        })
      },
      reset: () => {
        cancelAnimationFrame(frame.current)
        frame.current = 0
        latest.current = 0
        setValue(0)
      }
    }),
    []
  )

  return useMemo(() => ({ value, ...actions }), [value, actions])
}
