'use client'

import './index.scss'
import { Ref, useEffect, useImperativeHandle, useRef } from 'react'
import { World } from '@/app/(protected)/(engine)/models/World'
import type { MapView, WorldRenderer } from '@/app/(protected)/(world)/utils/worldRenderer'

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
  ref?: Ref<WorldMapHandle>
}

/** The PixiJS world map (see WorldRenderer), loaded only in the browser. */
export default function WorldMap({ world, view, onTap, fog = true, ref }: WorldMapProps) {
  const element = useRef<HTMLDivElement>(null)
  const renderer = useRef<WorldRenderer | null>(null)
  const viewRef = useRef(view)
  const onTapRef = useRef(onTap)

  useEffect(() => {
    onTapRef.current = onTap
  }, [onTap])

  useEffect(() => {
    let cancelled = false
    let created: WorldRenderer | null = null

    ;(async () => {
      const { WorldRenderer } = await import('@/app/(protected)/(world)/utils/worldRenderer')
      const instance = await WorldRenderer.create(element.current!, world, (nodeId) => onTapRef.current(nodeId), {
        fog
      })

      if (cancelled) {
        instance.destroy()

        return
      }

      created = instance
      renderer.current = instance
      instance.update(viewRef.current)
      instance.centerOn(viewRef.current.positionNodeId, false)
    })()

    return () => {
      cancelled = true
      created?.destroy()
      renderer.current = null
    }
  }, [world, fog])

  useEffect(() => {
    viewRef.current = view
    renderer.current?.update(view)
  }, [view])

  useImperativeHandle(
    ref,
    () => ({
      walk: (route) => renderer.current?.walk(route) ?? Promise.resolve(),
      centerOn: (nodeId, animate) => renderer.current?.centerOn(nodeId, animate)
    }),
    []
  )

  return <div ref={element} className="world-map" />
}
