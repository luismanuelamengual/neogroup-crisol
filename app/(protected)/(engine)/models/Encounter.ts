import { EncounterKind } from '@/app/(protected)/(engine)/models/EncounterKind'

/** The fight that waits at a point of the map. */
export interface Encounter {
  nodeId: string
  kind: EncounterKind
  /** Level of the enemies in this cycle. */
  level: number
  /** Boss id (camp bosses). */
  bossId?: string
  /** Retreating is not allowed against bosses. */
  canRetreat: boolean
}
