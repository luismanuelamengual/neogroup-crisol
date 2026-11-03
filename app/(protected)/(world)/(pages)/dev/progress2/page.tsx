import { notFound } from 'next/navigation'
import TestGameScreen from '@/app/(protected)/(world)/components/TestGameScreen'

/** Development only: test game 2 in progress, played without saving (/dev/progress2, see engine/utils/testGames.ts). */
export default function TestGame2Page() {
  if (process.env.NODE_ENV === 'production') {
    notFound()
  }

  return <TestGameScreen number={2} />
}
