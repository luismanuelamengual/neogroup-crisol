import { notFound } from 'next/navigation'
import EffectsPreview from '@/app/(protected)/(art)/components/EffectsPreview'

/** Development only: every skill of the heroes and the bestiary with its visual effect, one by one (/dev/effects). */
export default function EffectsPage() {
  if (process.env.NODE_ENV === 'production') {
    notFound()
  }

  return <EffectsPreview />
}
