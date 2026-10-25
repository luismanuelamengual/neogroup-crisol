import { getMaxHealth } from '@/app/(protected)/(engine)/data/characters'
import { CharacterId } from '@/app/(protected)/(engine)/models/CharacterId'
import { Encounter } from '@/app/(protected)/(engine)/models/Encounter'
import { EncounterKind } from '@/app/(protected)/(engine)/models/EncounterKind'
import { GameState } from '@/app/(protected)/(engine)/models/GameState'

/** Share of the maximum health lost in a won fight, by kind, until the real combat of phase 4. */
const DAMAGE: Record<EncounterKind, [number, number]> = {
  [EncounterKind.COMBAT]: [0.1, 0.35],
  [EncounterKind.ELITE]: [0.25, 0.55],
  [EncounterKind.GUARDIAN]: [0.3, 0.65],
  [EncounterKind.MINIBOSS]: [0.3, 0.65],
  [EncounterKind.CAPTOR]: [0.4, 0.8],
  [EncounterKind.SEAL]: [0.4, 0.8],
  [EncounterKind.CRISOL]: [0.5, 0.9]
}

/** Health of each character after a won placeholder fight (it can drop to 0: the fallen come back with 1). */
export function placeholderVictoryHealth(
  state: GameState,
  encounter: Encounter,
  random: () => number = Math.random
): Partial<Record<CharacterId, number>> {
  const [min, max] = DAMAGE[encounter.kind]

  return Object.fromEntries(
    state.characters.map((character) => [
      character.id,
      Math.max(0, character.health - Math.round(getMaxHealth(character) * (min + (max - min) * random())))
    ])
  )
}
