'use client'

import './index.scss'
import { Ref, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { useArtProgress } from '@/app/(protected)/(art)/hooks/useArtProgress'
import { World } from '@/app/(protected)/(engine)/models/World'
import type { MapView, WorldRenderer } from '@/app/(protected)/(world)/utils/worldRenderer'
import Loading from '@/app/components/Loading'

/** What the world screen can ask the map to do. */
export interface WorldMapHandle {
  walk: (route: string[]) => Promise<void>
  centerOn: (nodeId: string, animate?: boolean) => void
}

interface WorldMapProps {
  world: World
  view: MapView
  onTap: (nodeId: string | null) => void
  /** Covers what the party has not seen yet (off only to review the whole map). */
  fog?: boolean
  /** Something covers the whole map (a battle, a full screen page): it stops drawing meanwhile. */
  paused?: boolean
  ref?: Ref<WorldMapHandle>
}

/**
 * The PixiJS world map (see WorldRenderer), loaded only in the browser. A
 * loading screen covers it until all its art is loaded and drawn, and again
 * while its canvas recovers from a lost WebGL context.
 */
export default function WorldMap({ world, view, onTap, fog = true, paused = false, ref }: WorldMapProps) {
  const element = useRef<HTMLDivElement>(null)
  const renderer = useRef<WorldRenderer | null>(null)
  const viewRef = useRef(view)
  const onTapRef = useRef(onTap)
  const pausedRef = useRef(paused)
  const [ready, setReady] = useState(false)
  const [unavailable, setUnavailable] = useState(false)
  const { value: progress, report: reportProgress, reset: resetProgress } = useArtProgress()

  useEffect(() => {
    onTapRef.current = onTap
  }, [onTap])

  useEffect(() => {
    let cancelled = false
    let created: WorldRenderer | null = null
    let frame = 0

    setReady(false)
    setUnavailable(false)
    resetProgress()

    ;(async () => {
      const { WorldRenderer } = await import('@/app/(protected)/(world)/utils/worldRenderer')
      const instance = await WorldRenderer.create(element.current!, world, (nodeId) => onTapRef.current(nodeId), {
        fog,
        onProgress: reportProgress,
        onUnavailable: (value) => !cancelled && setUnavailable(value)
      })

      if (cancelled) {
        instance.destroy()

        return
      }

      created = instance
      renderer.current = instance
      instance.update(viewRef.current)
      instance.centerOn(viewRef.current.positionNodeId, false)
      instance.setPaused(pausedRef.current)
      // The first frame uploads the textures to the GPU: the loading screen goes once it is drawn.
      frame = requestAnimationFrame(() => {
        frame = requestAnimationFrame(() => !cancelled && setReady(true))
      })
    })()

    return () => {
      cancelled = true
      cancelAnimationFrame(frame)
      created?.destroy()
      renderer.current = null
    }
  }, [world, fog, reportProgress, resetProgress])

  useEffect(() => {
    viewRef.current = view
    renderer.current?.update(view)
  }, [view])

  useEffect(() => {
    pausedRef.current = paused
    renderer.current?.setPaused(paused)
  }, [paused])

  useImperativeHandle(
    ref,
    () => ({
      walk: (route) => renderer.current?.walk(route) ?? Promise.resolve(),
      centerOn: (nodeId, animate) => renderer.current?.centerOn(nodeId, animate)
    }),
    []
  )

  return (
    <>
      <div ref={element} className="world-map" />
      {(!ready || unavailable) && <Loading className="over-canvas" progress={ready ? null : progress} />}
    </>
  )
}
