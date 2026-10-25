import { Random } from '@/app/(protected)/(engine)/utils/random'

/** 2D value noise in [0, 1]: smooth random hills, used to make the borders of the biomes organic. */
export type Noise = (x: number, y: number) => number

const GRID_SIZE = 64

function smoothstep(t: number): number {
  return t * t * (3 - 2 * t)
}

function createValueNoise(random: Random): Noise {
  const values = Array.from({ length: GRID_SIZE * GRID_SIZE }, () => random())
  const valueAt = (x: number, y: number) =>
    values[(((y % GRID_SIZE) + GRID_SIZE) % GRID_SIZE) * GRID_SIZE + (((x % GRID_SIZE) + GRID_SIZE) % GRID_SIZE)]

  return (x, y) => {
    const x0 = Math.floor(x)
    const y0 = Math.floor(y)
    const tx = smoothstep(x - x0)
    const ty = smoothstep(y - y0)
    const top = valueAt(x0, y0) * (1 - tx) + valueAt(x0 + 1, y0) * tx
    const bottom = valueAt(x0, y0 + 1) * (1 - tx) + valueAt(x0 + 1, y0 + 1) * tx

    return top * (1 - ty) + bottom * ty
  }
}

/** Noise of a few octaves (each one twice as fine and half as strong as the previous one). */
export function createNoise(random: Random, octaves = 3): Noise {
  const layers = Array.from({ length: octaves }, () => createValueNoise(random))

  return (x, y) => {
    let total = 0
    let weight = 0

    layers.forEach((layer, octave) => {
      const amplitude = 1 / 2 ** octave
      const frequency = 2 ** octave

      total += layer(x * frequency, y * frequency) * amplitude
      weight += amplitude
    })

    return total / weight
  }
}
