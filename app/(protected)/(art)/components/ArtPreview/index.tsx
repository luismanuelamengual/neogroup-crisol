'use client'

import './index.scss'
import { Application, Container, Sprite, Text } from 'pixi.js'
import { useEffect, useRef, useState } from 'react'
import { RIGS } from '@/app/(protected)/(art)/data/rigs'
import { loadArtManifest, loadTextures } from '@/app/(protected)/(art)/utils/art'
import { RigFigure, RigMove, rigPartIds } from '@/app/(protected)/(art)/utils/rig'

const HEIGHT = 200
const SPEEDS = [1, 0.5, 0.25]

/**
 * Every puppet (figures with a parts sheet) breathing, with buttons to play
 * its moves, next to the figures that only have their whole image.
 */
export default function ArtPreview() {
  const host = useRef<HTMLDivElement>(null)
  const puppets = useRef<RigFigure[]>([])
  const speed = useRef(1)
  const [speedIndex, setSpeedIndex] = useState(0)
  const [empty, setEmpty] = useState(false)

  useEffect(() => {
    const element = host.current!
    const app = new Application()
    let cancelled = false

    const start = async () => {
      const { images, parts } = await loadArtManifest()
      const rigIds = Object.keys(RIGS).filter((id) => parts[RIGS[id].sheets.outfit ?? ''])
      const figureIds = Object.keys(images).filter((id) => /^(heroes\/[^/]+\/full|(enemies|bosses)\/[^/]+)$/.test(id))
      const textures = await loadTextures([...figureIds, ...rigIds.flatMap((id) => rigPartIds(RIGS[id], parts))])

      await app.init({ resizeTo: element, background: '#2a1a40', antialias: true })

      if (cancelled) {
        app.destroy(true)

        return
      }

      element.appendChild(app.canvas)

      const shelf = new Container()
      let x = 40

      const label = (text: string, at: number) => {
        const caption = new Text({ text, style: { fill: 0xffffff, fontSize: 14 } })

        caption.position.set(at, HEIGHT + 120)
        shelf.addChild(caption)
      }

      for (const id of rigIds) {
        const puppet = RigFigure.create(RIGS[id], parts, textures, HEIGHT)

        if (puppet) {
          puppet.view.position.set(x + 110, HEIGHT + 110)
          shelf.addChild(puppet.view)
          puppets.current.push(puppet)
          label(`${id} (puppet)`, x)
          x += 280
        }
      }

      for (const id of figureIds) {
        const texture = textures.get(id)

        if (texture) {
          const sprite = new Sprite(texture)

          sprite.anchor.set(0, 1)
          sprite.scale.set(HEIGHT / texture.height)
          sprite.position.set(x, HEIGHT + 110)
          shelf.addChild(sprite)
          label(id, x)
          x += sprite.width + 40
        }
      }

      setEmpty(puppets.current.length === 0 && figureIds.length === 0)
      app.stage.addChild(shelf)
      app.ticker.add((ticker) => puppets.current.forEach((puppet) => puppet.update(ticker.deltaMS * speed.current)))
    }

    void start()

    return () => {
      cancelled = true
      puppets.current = []

      if (app.renderer) {
        app.destroy(true, { children: true })
      }
    }
  }, [])

  const play = (move: RigMove) => puppets.current.forEach((puppet) => puppet.play(move, move === 'attack' ? 560 : 420))

  const changeSpeed = () => {
    const next = (speedIndex + 1) % SPEEDS.length

    speed.current = SPEEDS[next]
    setSpeedIndex(next)
  }

  return (
    <div className="art-preview">
      <div className="controls">
        <button onClick={() => play('attack')}>Attack</button>
        <button onClick={() => play('cast')}>Cast</button>
        <button onClick={() => play('hit')}>Hit</button>
        <button onClick={changeSpeed}>Speed ×{SPEEDS[speedIndex]}</button>
        {empty && <span>No art yet: put files in art/source and run yarn art.</span>}
      </div>
      <div className="stage" ref={host} />
    </div>
  )
}
