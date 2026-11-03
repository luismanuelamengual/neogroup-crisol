import { notFound } from 'next/navigation'
import TestGameScreen from '@/app/(protected)/(world)/components/TestGameScreen'

/** Development only: test game 3 in progress, played without saving (/dev/progress3, see engine/utils/testGames.ts). */
export default function TestGame3Page() {
  if (process.env.NODE_ENV === 'production') {
    notFound()
  }

  return <TestGameScreen number={3} />
}
