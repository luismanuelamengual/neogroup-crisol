import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { LAKES } from '@/app/(protected)/(engine)/data/terrains'
import type { World } from '@/app/(protected)/(engine)/models/World'
import { placeScenery } from '@/app/(protected)/(engine)/utils/scenery'
import { buildTileMap, heightAt, isPaved, terrainAt } from '@/app/(protected)/(engine)/utils/tileMap'

const world: World = JSON.parse(readFileSync('public/world/world.json', 'utf8'))
const map = buildTileMap(world)
const items = placeScenery(world, map)

describe('scenery of the world map', () => {
  it('is the same every time', () => {
    expect(placeScenery(world, map)).toEqual(items)
  })

  it('has every layer', () => {
    for (const layer of ['tall', 'low', 'ground']) {
      expect(items.some((item) => item.layer === layer)).toBe(true)
    }
  })

  it('never grows on a trail or a lake', () => {
    for (const { x, y } of items) {
      expect(isPaved(map, x, y)).toBe(false)
      expect(LAKES.has(terrainAt(map, x, y))).toBe(false)
    }
  })

  it('keeps the trees a tile away from the trails', () => {
    const { tileSize } = map

    for (const { x, y } of items.filter((item) => item.layer === 'tall')) {
      for (const [dx, dy] of [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1]
      ]) {
        expect(isPaved(map, x + dx * tileSize, y + dy * tileSize)).toBe(false)
      }
    }
  })

  it('never stands a tree or a rock on the face of a cliff', () => {
    for (const { x, y } of items.filter((item) => item.layer !== 'ground')) {
      expect(heightAt(map, x, y - 56)).toBeLessThanOrEqual(heightAt(map, x, y))
    }
  })

  it('rests the whole foot of every bush and rock on one level', () => {
    for (const { x, y } of items.filter((item) => item.layer === 'low')) {
      for (const dx of [-34, 0, 34]) {
        expect(heightAt(map, x + dx, y)).toBe(heightAt(map, x, y))
        expect(isPaved(map, x + dx, y)).toBe(false)
      }
    }
  })

  it('keeps room around every bush and rock', () => {
    const standing = items.filter((item) => item.layer !== 'ground')

    for (const low of standing.filter((item) => item.layer === 'low')) {
      const close = standing.filter(
        (other) => other !== low && Math.abs(other.x - low.x) < 52 && Math.hypot(other.x - low.x, other.y - low.y) < 52
      )

      expect(close).toEqual([])
    }
  })
})
