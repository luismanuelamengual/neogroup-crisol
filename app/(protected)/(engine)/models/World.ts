import { Shortcut } from '@/app/(protected)/(engine)/models/Shortcut'
import { WorldNode } from '@/app/(protected)/(engine)/models/WorldNode'

/** The world map: points joined by trails. Generated once (scripts/generate-world.ts) and the same for everybody. */
export interface World {
  /** Version of the world; a saved game records the one it was played on. */
  version: number
  /** Seed it was generated with. */
  seed: number
  width: number
  height: number
  nodes: WorldNode[]
  /** Trails, as pairs of node ids. */
  edges: [string, string][]
  /** Shortcuts, shut until the party opens them from their deep side (utils/shortcuts.ts). */
  shortcuts?: Shortcut[]
  startNodeId: string
  gateNodeId: string
  finalBossNodeId: string
}
