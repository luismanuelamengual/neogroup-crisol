import { notFound } from 'next/navigation'
import WorldExplorer from '@/app/(protected)/(world)/components/WorldExplorer'

/** Development only: walk the whole world as in the game, without fog (/dev/world-play). */
export default function WorldPlayDebugPage() {
  if (process.env.NODE_ENV === 'production') {
    notFound()
  }

  return <WorldExplorer />
}
