import { Biome } from '@/app/(protected)/(engine)/models/Biome'
import { Zone } from '@/app/(protected)/(engine)/models/Zone'

/**
 * A piece of scenery of the world map (see placeScenery): tall ones (trees)
 * and low ones (bushes, rocks) stand up and hide what is behind them; ground
 * ones (tufts, flowers, pebbles) lie flat.
 */
export interface SceneryItem {
  /** Where its base touches the ground (world pixels). */
  x: number
  y: number
  layer: 'tall' | 'low' | 'ground'
  biome: Biome
  /** The zone of the biome it grows in, if any (its drawings are those of the zone). */
  zone?: Zone
  /** Picks its drawing among the ones of its biome and layer, in [0, 1). */
  pick: number
  /** Size against the usual one, and whether it is drawn mirrored. */
  scale: number
  flip: boolean
}
