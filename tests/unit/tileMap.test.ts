import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { BIOME_TERRAINS, LAKES, LEVELS, TERRAINS } from '@/app/(protected)/(engine)/data/terrains'
import { Biome } from '@/app/(protected)/(engine)/models/Biome'
import type { World } from '@/app/(protected)/(engine)/models/World'
import { buildTileMap, distanceToSegment, heightAt, isPaved, terrainAt } from '@/app/(protected)/(engine)/utils/tileMap'
import { makeSeamless } from '@/scripts/art/images'

const world: World = JSON.parse(readFileSync('public/world/world.json', 'utf8'))
const map = buildTileMap(world)

describe('tile map of the world', () => {
  it('covers the whole world', () => {
    expect(map.columns * map.tileSize).toBeGreaterThanOrEqual(world.width)
    expect(map.rows * map.tileSize).toBeGreaterThanOrEqual(world.height)
    expect(map.terrains.length).toBe(map.columns * map.rows)
    expect(map.terrains.every((terrain) => terrain < TERRAINS.length)).toBe(true)
  })

  it('is the same every time', () => {
    expect(buildTileMap(world).terrains).toEqual(map.terrains)
  })

  it('puts every point on the paving of its biome', () => {
    for (const node of world.nodes) {
      expect(terrainAt(map, node.x, node.y)).toBe(BIOME_TERRAINS[node.biome].trail)
    }
  })

  it('never puts a lake on a trail', () => {
    const nodes = new Map(world.nodes.map((node) => [node.id, node]))

    for (const [a, b] of world.edges) {
      const from = nodes.get(a)!
      const to = nodes.get(b)!
      const steps = Math.ceil(Math.hypot(to.x - from.x, to.y - from.y) / 16)

      for (let step = 0; step <= steps; step++) {
        const x = from.x + ((to.x - from.x) * step) / steps
        const y = from.y + ((to.y - from.y) * step) / steps

        expect(LAKES.has(terrainAt(map, x, y))).toBe(false)
      }
    }
  })

  it('keeps the trails unbroken (every tile along a trail is paved)', () => {
    const nodes = new Map(world.nodes.map((node) => [node.id, node]))
    const trails = new Set(Object.values(BIOME_TERRAINS).map((terrains) => terrains.trail))

    for (const [a, b] of world.edges) {
      const from = nodes.get(a)!
      const to = nodes.get(b)!
      const steps = Math.ceil(Math.hypot(to.x - from.x, to.y - from.y) / 16)

      for (let step = 0; step <= steps; step++) {
        const x = from.x + ((to.x - from.x) * step) / steps
        const y = from.y + ((to.y - from.y) * step) / steps

        expect(trails.has(terrainAt(map, x, y))).toBe(true)
      }
    }
  })

  it('has lakes only where the biome has them', () => {
    const desert = BIOME_TERRAINS[Biome.DESERT]

    expect(desert.lake).toBeNull()
    expect(map.terrains.some((terrain) => LAKES.has(TERRAINS[terrain]))).toBe(true)
  })

  it('rises in levels, and a trail climbs one level at a time (one flight of stairs)', () => {
    const { columns, rows, heights, paved } = map

    expect(new Set(heights)).toEqual(new Set(Array.from({ length: LEVELS }, (_, level) => level)))

    for (let row = 0; row < rows; row++) {
      for (let column = 0; column < columns; column++) {
        const index = row * columns + column

        for (const next of [column < columns - 1 ? index + 1 : -1, row < rows - 1 ? index + columns : -1]) {
          if (next >= 0 && (paved[index] || paved[next])) {
            expect(Math.abs(heights[index] - heights[next])).toBeLessThanOrEqual(1)
          }
        }
      }
    }
  })

  it('keeps trails running east-west flat', () => {
    const nodes = new Map(world.nodes.map((node) => [node.id, node]))

    for (const [a, b] of world.edges) {
      const from = nodes.get(a)!
      const to = nodes.get(b)!

      if (Math.abs(to.y - from.y) < Math.abs(to.x - from.x)) {
        expect(heightAt(map, from.x, from.y)).toBe(heightAt(map, to.x, to.y))
      }
    }
  })

  it('lays lakes only on flat ground', () => {
    const { columns, rows, heights, terrains } = map

    for (let row = 1; row < rows - 1; row++) {
      for (let column = 1; column < columns - 1; column++) {
        const index = row * columns + column

        if (LAKES.has(TERRAINS[terrains[index]])) {
          for (const next of [index - 1, index + 1, index - columns, index + columns]) {
            expect(heights[next]).toBe(heights[index])
          }
        }
      }
    }
  })

  it('keeps the clearing of every point flat and paved', () => {
    for (const node of world.nodes) {
      for (const [dx, dy] of [
        [0, 0],
        [-24, 0],
        [24, 0],
        [0, -24],
        [0, 24]
      ]) {
        expect(isPaved(map, node.x + dx, node.y + dy)).toBe(true)
        expect(heightAt(map, node.x + dx, node.y + dy)).toBe(heightAt(map, node.x, node.y))
      }
    }
  })

  it('measures the distance to a trail', () => {
    const a = { ...world.nodes[0], x: 0, y: 0 }
    const b = { ...world.nodes[0], x: 100, y: 0 }

    expect(distanceToSegment(50, 30, a, b)).toBe(30)
    expect(distanceToSegment(-40, 30, a, b)).toBe(50)
  })
})

describe('seamless ground textures', () => {
  it('match across the edges', () => {
    const width = 64
    const data = new Uint8ClampedArray(width * width * 4).map((_, index) => (index * 7919) % 251)
    const { data: output } = makeSeamless({ data, width, height: width })
    const at = (x: number, y: number) => output[(y * width + x) * 4]

    // The left edge continues the right one as smoothly as two neighbors in the middle of the original.
    for (let y = 0; y < width; y++) {
      const middle = Math.abs(data[(y * width + width / 2) * 4] - data[(y * width + width / 2 - 1) * 4])

      expect(Math.abs(Math.abs(at(0, y) - at(width - 1, y)) - middle)).toBeLessThanOrEqual(2)
    }
  })
})
