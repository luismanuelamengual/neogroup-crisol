import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { LAKES, TERRAINS } from '@/app/(protected)/(engine)/data/terrains'
import { VILLAGES, ZONES_ORDER } from '@/app/(protected)/(engine)/data/zones'
import { Biome } from '@/app/(protected)/(engine)/models/Biome'
import { Terrain } from '@/app/(protected)/(engine)/models/Terrain'
import { VillagePieceKind } from '@/app/(protected)/(engine)/models/VillagePiece'
import type { World } from '@/app/(protected)/(engine)/models/World'
import { placeScenery } from '@/app/(protected)/(engine)/utils/scenery'
import { buildTileMap, heightAt, isPaved, terrainAt } from '@/app/(protected)/(engine)/utils/tileMap'
import { placeVillages, VILLAGE_PIECE_SIZES } from '@/app/(protected)/(engine)/utils/village'

const world: World = JSON.parse(readFileSync('public/world/world.json', 'utf8'))
const map = buildTileMap(world)
const villages = placeVillages(world, map)
const merchant = world.nodes.find((node) => node.biome === Biome.MEADOWS && node.merchant)!
const village = villages.find(({ nodeId }) => nodeId === merchant.id)!

describe('village around the merchant of the meadows', () => {
  it('is the same every time', () => {
    expect(placeVillages(world, map)).toEqual(villages)
  })

  it('only exists in the biomes that have one', () => {
    expect(villages.map(({ nodeId }) => world.nodes.find((node) => node.id === nodeId)!.biome)).toEqual(
      Object.keys(VILLAGES)
    )
  })

  it('has cottages, a well, fences, fields, a windmill and a sign', () => {
    const count = (kind: VillagePieceKind) => village.pieces.filter((piece) => piece.kind === kind).length

    expect(count(VillagePieceKind.HOUSE)).toBeGreaterThanOrEqual(8)
    expect(count(VillagePieceKind.WELL)).toBe(1)
    expect(count(VillagePieceKind.FENCE)).toBeGreaterThan(2)
    expect(count(VillagePieceKind.WHEAT)).toBeGreaterThan(0)
    expect(count(VillagePieceKind.MILL)).toBe(1)
    expect(count(VillagePieceKind.SIGN)).toBe(1)
  })

  it('stands on firm ground: all of each foot on one level, off trails, lakes and the faces of cliffs', () => {
    for (const { kind, x, y } of village.pieces) {
      const { foot } = VILLAGE_PIECE_SIZES[kind]
      const level = heightAt(map, x, y)

      for (const dx of [-foot, 0, foot]) {
        expect(heightAt(map, x + dx, y)).toBe(level)
        expect(isPaved(map, x + dx, y)).toBe(false)
        expect(LAKES.has(terrainAt(map, x + dx, y))).toBe(false)
        expect(heightAt(map, x + dx, y - 56)).toBeLessThanOrEqual(level)
      }
    }
  })

  it('hides no trail and no point behind its pieces', () => {
    for (const { kind, x, y } of village.pieces) {
      const { half, height } = VILLAGE_PIECE_SIZES[kind]

      for (let dy = -height; dy <= 0; dy += 24) {
        for (let dx = -half; dx <= half; dx += 24) {
          expect(isPaved(map, x + dx, y + dy)).toBe(false)
        }
      }

      for (const node of world.nodes) {
        expect(Math.abs(node.x - x) < half && node.y > y - height && node.y < y).toBe(false)
      }
    }
  })

  it('keeps the cottages apart from each other', () => {
    const houses = village.pieces.filter((piece) => piece.kind === VillagePieceKind.HOUSE)

    houses.forEach((a, i) =>
      houses.slice(i + 1).forEach((b) => expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(100))
    )
  })

  it('lies in its zone, flat around the merchant and without lakes', () => {
    const zone = ZONES_ORDER.indexOf(VILLAGES[Biome.MEADOWS]!.zone) + 1
    const level = heightAt(map, merchant.x, merchant.y)
    const radius = VILLAGES[Biome.MEADOWS]!.radius

    for (const { x, y } of village.pieces) {
      expect(map.zones[Math.floor(y / map.tileSize) * map.columns + Math.floor(x / map.tileSize)]).toBe(zone)
    }

    map.terrains.forEach((terrain, index) => {
      const x = ((index % map.columns) + 0.5) * map.tileSize
      const y = (Math.floor(index / map.columns) + 0.5) * map.tileSize

      if (Math.hypot(x - merchant.x, y - merchant.y) < radius * 0.8) {
        expect(LAKES.has(TERRAINS[terrain])).toBe(false)
        expect(map.heights[index]).toBe(level)
      }
    })
  })

  it('draws dirt paths from the cottages, where nothing grows', () => {
    const paths = new Set(village.paths)

    expect(village.paths.length).toBeGreaterThan(0)
    village.paths.forEach((index) => expect(TERRAINS[map.terrains[index]]).toBe(Terrain.DIRT))

    for (const { x, y } of placeScenery(world, map)) {
      expect(paths.has(Math.floor(y / map.tileSize) * map.columns + Math.floor(x / map.tileSize))).toBe(false)
    }
  })
})
