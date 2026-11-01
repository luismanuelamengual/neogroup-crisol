import { describe, expect, it } from 'vitest'
import { LOOKS, MOODS, planLandscape } from '@/app/(protected)/(battle)/utils/battleLandscape'
import { Biome } from '@/app/(protected)/(engine)/models/Biome'

const BIOMES = Object.values(Biome)
const SEEDS = Array.from({ length: 200 }, (_, index) => `node-${index}`)

describe('landscape of the battles', () => {
  it('gives every biome its own look and moods', () => {
    for (const biome of BIOMES) {
      expect(LOOKS[biome].ranges.every((options) => options.length > 0)).toBe(true)
      expect(LOOKS[biome].groundFeatures.length).toBeGreaterThan(0)
      expect(MOODS[biome].length).toBeGreaterThan(1)
    }

    expect(new Set(BIOMES.map((biome) => LOOKS[biome].ground)).size).toBe(BIOMES.length)
  })

  it('is the same every time for the same point', () => {
    for (const biome of BIOMES) {
      expect(planLandscape('node-7', biome)).toEqual(planLandscape('node-7', biome))
    }
  })

  it('rarely repeats a scene within a biome', () => {
    for (const biome of BIOMES) {
      const scenes = SEEDS.map((seed) => {
        const plan = planLandscape(seed, biome)

        return JSON.stringify([
          plan.moodIndex,
          plan.ranges,
          plan.landmark?.kind,
          plan.groundFeatures,
          plan.clouds,
          plan.lightFromLeft
        ])
      })

      // Besides these choices, every point also gets its own shapes, positions and props.
      expect(new Set(scenes).size).toBeGreaterThan(60)
    }
  })

  it('keeps the landmarks away from the middle of the screen', () => {
    for (const biome of BIOMES) {
      for (const seed of SEEDS) {
        const x = planLandscape(seed, biome).landmark?.x

        if (x !== undefined) {
          expect(x < 0.4 || x > 0.6).toBe(true)
        }
      }
    }
  })
})
