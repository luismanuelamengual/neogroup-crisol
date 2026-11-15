import { Biome } from '@/app/(protected)/(engine)/models/Biome'

/** The hardship the party carries: the steps walked in a biome since it rested or came into it (data/hardships.ts). */
export interface Hardship {
  biome: Biome
  steps: number
}
