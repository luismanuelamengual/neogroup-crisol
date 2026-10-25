import { CharacterId } from '@/app/(protected)/(engine)/models/CharacterId'

/** Progress of one unlocked character. It is kept between New Game+ cycles. */
export interface CharacterState {
  id: CharacterId
  /** No level cap. */
  level: number
  /** Experience gathered towards the next level. */
  xp: number
}
