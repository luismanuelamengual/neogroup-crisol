'use client'

import { useEffect, useState } from 'react'
import { GameState } from '@/app/(protected)/(engine)/models/GameState'
import { World } from '@/app/(protected)/(engine)/models/World'
import { createTestGameState } from '@/app/(protected)/(engine)/utils/testGames'
import { indexWorld } from '@/app/(protected)/(engine)/utils/worldMap'
import WorldScreen from '@/app/(protected)/(world)/components/WorldScreen'
import Loading from '@/app/components/Loading'

/**
 * Development only: the game as in /world, but with a test game in progress
 * (engine/utils/testGames.ts) played in memory: the account's save is not
 * touched and nothing is kept on leaving or reloading.
 */
export default function TestGameScreen({ number }: { number: number }) {
  const [state, setState] = useState<GameState | null>(null)

  useEffect(() => {
    fetch('/world/world.json')
      .then((response) => response.json())
      .then((world: World) => setState(createTestGameState(indexWorld(world), number)))
  }, [number])

  return state ? <WorldScreen test={state} /> : <Loading />
}
