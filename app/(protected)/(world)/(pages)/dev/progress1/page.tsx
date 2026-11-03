import { notFound } from 'next/navigation'
import TestGameScreen from '@/app/(protected)/(world)/components/TestGameScreen'

/** Development only: test game 1 in progress, played without saving (/dev/progress1, see engine/utils/testGames.ts). */
export default function TestGame1Page() {
  if (process.env.NODE_ENV === 'production') {
    notFound()
  }

  return <TestGameScreen number={1} />
}
