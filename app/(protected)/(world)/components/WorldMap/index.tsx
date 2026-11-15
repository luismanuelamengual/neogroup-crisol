'use client'

import './index.scss'
import { ReactNode, Ref, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react'
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
  /** Small buttons pinned over the hero, at a fixed size whatever the zoom (see placeOverHero). */
  overHero?: ReactNode
  ref?: Ref<WorldMapHandle>
}

/** Height of the hero over its point and below it, in world pixels (see WorldRenderer.drawHero). */
const HERO_TOP = 58
const HERO_BOTTOM = 40
/** Gap between the hero and what is pinned over it, and room kept from the edges, in screen pixels. */
const OVER_HERO_GAP = 10
const OVER_HERO_MARGIN = 8
/** Under this, what is pinned would go under the top bar of the map: it goes below the hero instead. */
const OVER_HERO_MIN_TOP = 84

/**
 * Puts what is pinned over the hero above it (or below, near the top of the
 * screen), inside the screen.
 */
function placeOverHero(element: HTMLElement, x: number, y: number, scale: number): void {
  const parent = element.parentElement!
  const width = element.offsetWidth
  const height = element.offsetHeight
  const above = y - HERO_TOP * scale - OVER_HERO_GAP - height
  const top = above >= OVER_HERO_MIN_TOP ? above : y + HERO_BOTTOM * scale + OVER_HERO_GAP
  const left = Math.min(
    Math.max(x - width / 2, OVER_HERO_MARGIN),
    Math.max(parent.clientWidth - width - OVER_HERO_MARGIN, OVER_HERO_MARGIN)
  )

  element.style.transform = `translate(${Math.round(left)}px, ${Math.round(top)}px)`
}

/**
 * The PixiJS world map (see WorldRenderer), loaded only in the browser. A
 * loading screen covers it until all its art is loaded and drawn, and again
 * while its canvas recovers from a lost WebGL context.
 */
export default function WorldMap({ world, view, onTap, fog = true, paused = false, overHero, ref }: WorldMapProps) {
  const element = useRef<HTMLDivElement>(null)
  const overHeroElement = useRef<HTMLDivElement>(null)
  const heroOnScreen = useRef<{ x: number; y: number; scale: number } | null>(null)
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
      instance.onHeroOnScreen((x, y, scale) => {
        heroOnScreen.current = { x, y, scale }

        if (overHeroElement.current) {
          placeOverHero(overHeroElement.current, x, y, scale)
        }
      })
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

  // What is pinned changed (and with it its size): it is placed again.
  const hasOverHero = Boolean(overHero)

  useLayoutEffect(() => {
    const hero = heroOnScreen.current

    if (hasOverHero && hero && overHeroElement.current) {
      placeOverHero(overHeroElement.current, hero.x, hero.y, hero.scale)
    }
  }, [hasOverHero, overHero])

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
      {overHero && (
        <div ref={overHeroElement} className="over-hero">
          {overHero}
        </div>
      )}
      {(!ready || unavailable) && <Loading className="over-canvas" progress={ready ? null : progress} />}
    </>
  )
}
