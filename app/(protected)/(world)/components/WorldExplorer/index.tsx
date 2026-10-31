'use client'

import './index.scss'
import { useEffect, useMemo, useRef, useState } from 'react'
import { World } from '@/app/(protected)/(engine)/models/World'
import WorldMap, { WorldMapHandle } from '@/app/(protected)/(world)/components/WorldMap'
import { pointName } from '@/app/(protected)/(world)/utils/pointNames'
import type { MapView } from '@/app/(protected)/(world)/utils/worldRenderer'
import Loading from '@/app/components/Loading'
import { useT } from '@/app/i18n/I18nProvider'

const EMPTY = new Set<string>()

/**
 * Development view of the world (public/world/world.json) drawn by the game's
 * own renderer, as if playing it with every point cleared and within reach
 * and no fog, to look for problems all over the map. Tap a point to see its
 * data; "Points not won" shows the markers as before their fights.
 */
export default function WorldExplorer() {
  const t = useT()
  const [world, setWorld] = useState<World | null>(null)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [positionNodeId, setPositionNodeId] = useState<string | null>(null)
  const [notWon, setNotWon] = useState(false)
  const map = useRef<WorldMapHandle>(null)

  useEffect(() => {
    fetch('/world/world.json')
      .then((response) => response.json())
      .then((data: World) => {
        setWorld(data)
        setPositionNodeId(data.startNodeId)
      })
  }, [])

  const all = useMemo(() => new Set(world?.nodes.map((node) => node.id)), [world])
  const nodes = useMemo(() => new Map(world?.nodes.map((node) => [node.id, node])), [world])
  const neighbors = useMemo(() => {
    const result = new Map<string, string[]>()

    for (const [a, b] of world?.edges ?? []) {
      result.set(a, [...(result.get(a) ?? []), b])
      result.set(b, [...(result.get(b) ?? []), a])
    }

    return result
  }, [world])
  const view = useMemo<MapView | null>(
    () =>
      world && positionNodeId
        ? {
            cleared: all,
            revealed: all,
            // Respawned points are drawn as fights not won yet, without hiding their trails.
            respawned: notWon ? all : EMPTY,
            reachable: all,
            openCamps: notWon ? EMPTY : all,
            positionNodeId,
            selectedNodeId,
            route: null
          }
        : null,
    [all, notWon, positionNodeId, selectedNodeId, world]
  )

  if (!world || !view) {
    return <Loading />
  }

  const selected = selectedNodeId ? nodes.get(selectedNodeId) : undefined

  const goTo = (nodeId: string) => {
    setSelectedNodeId(nodeId)
    map.current?.centerOn(nodeId)
  }

  return (
    <div className="world-explorer">
      <WorldMap ref={map} world={world} view={view} onTap={setSelectedNodeId} fog={false} />
      <aside className="panel">
        <h1>World v{world.version} · play view</h1>
        <p>
          Seed {world.seed} · {world.nodes.length} points · {world.edges.length} trails
        </p>
        <label className="toggle">
          <input type="checkbox" checked={notWon} onChange={(event) => setNotWon(event.target.checked)} />
          Points not won
        </label>
        <div className="jumps">
          <button type="button" onClick={() => goTo(world.startNodeId)}>
            Start
          </button>
          <button type="button" onClick={() => goTo(world.gateNodeId)}>
            Abyss gate
          </button>
          <button type="button" onClick={() => goTo(world.finalBossNodeId)}>
            Crisol
          </button>
        </div>
        {selected && (
          <div className="selected">
            <strong>{pointName(t, selected, !notWon, !notWon)}</strong>
            <br />
            {selected.id} · {selected.type} · {selected.biome}
            {selected.level !== undefined && <> · level {selected.level}</>}
            <br />x {Math.round(selected.x)} · y {Math.round(selected.y)}
            <div className="neighbors">
              Trails to:{' '}
              {(neighbors.get(selected.id) ?? []).map((id) => (
                <button key={id} type="button" onClick={() => goTo(id)}>
                  {id}
                </button>
              ))}
            </div>
            <button type="button" onClick={() => setPositionNodeId(selected.id)}>
              Put the hero here
            </button>
          </div>
        )}
      </aside>
    </div>
  )
}
