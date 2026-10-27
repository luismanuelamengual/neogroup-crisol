'use client'

import './index.scss'
import { PointerEvent, useEffect, useMemo, useRef, useState, WheelEvent } from 'react'
import { BIOMES, getBiomeDefinition } from '@/app/(protected)/(engine)/data/biomes'
import { BossKind } from '@/app/(protected)/(engine)/models/BossKind'
import { NodeType } from '@/app/(protected)/(engine)/models/NodeType'
import { World } from '@/app/(protected)/(engine)/models/World'
import { WorldNode } from '@/app/(protected)/(engine)/models/WorldNode'
import Loading from '@/app/components/Loading'

interface ViewBox {
  x: number
  y: number
  width: number
  height: number
}

const MIN_ZOOM_WIDTH = 1200

/** Marker of each kind of point: color and radius. */
function markerOf(node: WorldNode): { color: string; radius: number; label: string } {
  switch (node.type) {
    case NodeType.START:
      return { color: '#ffffff', radius: 110, label: 'Start' }
    case NodeType.CAMP_BOSS:
      return node.bossKind === BossKind.CAPTOR
        ? { color: '#ff4d8d', radius: 110, label: `Captor ${node.bossId} (${node.captive})` }
        : node.bossKind === BossKind.SEAL
          ? { color: '#b26bff', radius: 110, label: `Seal ${node.bossId}` }
          : { color: '#ffc233', radius: 85, label: `Mini boss camp ${node.bossId}` }
    case NodeType.SANCTUARY:
      return {
        color: '#22d3ee',
        radius: node.guardian ? 75 : 60,
        label: `Rune ${node.runeIndex} (${node.runeTier}${node.guardian ? ', guardian' : ', elite'})`
      }
    case NodeType.MERCHANT:
      return { color: '#84f06b', radius: 80, label: `Merchant ${node.merchant}` }
    case NodeType.TEAR:
      return { color: '#3b82f6', radius: 75, label: 'Tear of Oblivion' }
    case NodeType.CHEST:
      return { color: '#b7793b', radius: 55, label: 'Chest' }
    case NodeType.RELIQUARY:
      return { color: '#e2e8f0', radius: 90, label: `Reliquary ${node.weaponId}` }
    case NodeType.ABYSS_GATE:
      return { color: '#000000', radius: 110, label: 'Door of the Abyss' }
    case NodeType.FINAL_BOSS:
      return { color: '#ff2a2a', radius: 130, label: 'Crisol' }
    default:
      return { color: '#1b1b24', radius: 30, label: 'Fight' }
  }
}

const LEGEND: { type: NodeType; bossKind?: BossKind; label: string }[] = [
  { type: NodeType.START, label: 'Starting camp' },
  { type: NodeType.CAMP_BOSS, bossKind: BossKind.CAPTOR, label: 'Captor (camp)' },
  { type: NodeType.CAMP_BOSS, bossKind: BossKind.SEAL, label: 'Seal (camp)' },
  { type: NodeType.CAMP_BOSS, bossKind: BossKind.MINIBOSS, label: 'Mini boss (camp)' },
  { type: NodeType.SANCTUARY, label: 'Rune sanctuary' },
  { type: NodeType.MERCHANT, label: 'Merchant' },
  { type: NodeType.TEAR, label: 'Tear of Oblivion' },
  { type: NodeType.CHEST, label: 'Chest' },
  { type: NodeType.RELIQUARY, label: 'Weapon reliquary (warden)' },
  { type: NodeType.ABYSS_GATE, label: 'Door of the Abyss' },
  { type: NodeType.FINAL_BOSS, label: 'Crisol' },
  { type: NodeType.COMBAT, label: 'Fight' }
]

/**
 * Development view of the generated world (public/world/world.json): the
 * biomes, the trails and every point of interest, with zoom (wheel) and pan
 * (drag). Hovering a point shows its data.
 */
export default function WorldDebugMap() {
  const [world, setWorld] = useState<World | null>(null)
  const [view, setView] = useState<ViewBox | null>(null)
  const [hovered, setHovered] = useState<WorldNode | null>(null)
  const [showLevels, setShowLevels] = useState(false)
  const svgRef = useRef<SVGSVGElement>(null)
  const dragRef = useRef<{ x: number; y: number; view: ViewBox } | null>(null)

  useEffect(() => {
    fetch('/world/world.json')
      .then((response) => response.json())
      .then((data: World) => {
        setWorld(data)
        setView({ x: 0, y: 0, width: data.width, height: data.height })
      })
  }, [])

  const byId = useMemo(() => new Map(world?.nodes.map((node) => [node.id, node]) ?? []), [world])
  const counts = useMemo(() => {
    const result = new Map<string, number>()

    for (const node of world?.nodes ?? []) {
      const key = `${node.type}:${node.type === NodeType.CAMP_BOSS ? node.bossKind : ''}`

      result.set(key, (result.get(key) ?? 0) + 1)
    }

    return result
  }, [world])

  if (!world || !view) {
    return <Loading />
  }

  /** Position of the pointer in world pixels. */
  const toWorld = (clientX: number, clientY: number) => {
    const rect = svgRef.current!.getBoundingClientRect()

    return {
      x: view.x + ((clientX - rect.left) / rect.width) * view.width,
      y: view.y + ((clientY - rect.top) / rect.height) * view.height
    }
  }

  const handleWheel = (event: WheelEvent<SVGSVGElement>) => {
    const focus = toWorld(event.clientX, event.clientY)
    const factor = event.deltaY > 0 ? 1.2 : 1 / 1.2
    const width = Math.min(world.width * 1.5, Math.max(MIN_ZOOM_WIDTH, view.width * factor))
    const scale = width / view.width

    setView({
      x: focus.x - (focus.x - view.x) * scale,
      y: focus.y - (focus.y - view.y) * scale,
      width,
      height: view.height * scale
    })
  }

  const handlePointerDown = (event: PointerEvent<SVGSVGElement>) => {
    dragRef.current = { x: event.clientX, y: event.clientY, view }
    svgRef.current?.setPointerCapture(event.pointerId)
  }

  const handlePointerMove = (event: PointerEvent<SVGSVGElement>) => {
    const drag = dragRef.current

    if (!drag) {
      return
    }

    const rect = svgRef.current!.getBoundingClientRect()

    setView({
      ...drag.view,
      x: drag.view.x - ((event.clientX - drag.x) / rect.width) * drag.view.width,
      y: drag.view.y - ((event.clientY - drag.y) / rect.height) * drag.view.height
    })
  }

  const handlePointerUp = () => {
    dragRef.current = null
  }

  return (
    <div className="world-debug-map">
      <svg
        ref={svgRef}
        className="map"
        viewBox={`${view.x} ${view.y} ${view.width} ${view.height}`}
        preserveAspectRatio="xMidYMid meet"
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <rect x={0} y={0} width={world.width} height={world.height} fill="#0d0d14" />
        <g className="regions">
          {world.nodes.map((node) => (
            <circle
              key={node.id}
              cx={node.x}
              cy={node.y}
              r={330}
              fill={getBiomeDefinition(node.biome).color}
              opacity={0.28}
            />
          ))}
        </g>
        <g className="trails">
          {world.edges.map(([a, b]) => {
            const from = byId.get(a)!
            const to = byId.get(b)!
            const border = from.biome !== to.biome

            return (
              <line
                key={`${a}-${b}`}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke={border ? '#ffffff' : '#e8e2d0'}
                strokeWidth={border ? 60 : 22}
                strokeDasharray={border ? '90 50' : undefined}
              />
            )
          })}
        </g>
        <g className="points">
          {world.nodes.map((node) => {
            const marker = markerOf(node)

            return (
              <g key={node.id} onPointerEnter={() => setHovered(node)} onPointerLeave={() => setHovered(null)}>
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={marker.radius}
                  fill={marker.color}
                  stroke={node.type === NodeType.ABYSS_GATE ? '#b26bff' : '#000000'}
                  strokeWidth={node.type === NodeType.ABYSS_GATE ? 40 : 14}
                />
                {showLevels && node.level !== undefined && (
                  <text x={node.x} y={node.y - marker.radius - 20} className="level">
                    {node.level}
                  </text>
                )}
              </g>
            )
          })}
        </g>
      </svg>
      <aside className="panel">
        <h1>World v{world.version}</h1>
        <p>
          Seed {world.seed} · {world.nodes.length} points · {world.edges.length} trails
        </p>
        <label className="toggle">
          <input type="checkbox" checked={showLevels} onChange={(event) => setShowLevels(event.target.checked)} />
          Show levels
        </label>
        <ul className="legend">
          {LEGEND.map((item) => (
            <li key={`${item.type}:${item.bossKind ?? ''}`}>
              <span
                className="swatch"
                style={{ background: markerOf({ type: item.type, bossKind: item.bossKind } as WorldNode).color }}
              />
              {item.label}: {counts.get(`${item.type}:${item.bossKind ?? ''}`) ?? 0}
            </li>
          ))}
        </ul>
        <ul className="legend">
          {BIOMES.map((definition) => (
            <li key={definition.biome}>
              <span className="swatch" style={{ background: definition.color }} />
              {definition.biome} ({definition.levelMin}–{definition.levelMax})
            </li>
          ))}
        </ul>
        {hovered && (
          <div className="hovered">
            <strong>{hovered.id}</strong> · {hovered.biome}
            <br />
            {markerOf(hovered).label}
            {hovered.level !== undefined && <> · level {hovered.level}</>}
          </div>
        )}
      </aside>
    </div>
  )
}
