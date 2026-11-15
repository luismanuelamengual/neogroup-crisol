import { notFound } from 'next/navigation'
import SoundsPreview from '@/app/(protected)/(art)/components/SoundsPreview'

/** Development only: every sound effect and theme of the game, to hear them one by one (/dev/sounds). */
export default function SoundsPage() {
  if (process.env.NODE_ENV === 'production') {
    notFound()
  }

  return <SoundsPreview />
}
