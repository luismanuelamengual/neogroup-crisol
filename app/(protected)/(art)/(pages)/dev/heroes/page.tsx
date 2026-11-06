import { notFound } from 'next/navigation'
import HeroWeaponsPreview from '@/app/(protected)/(art)/components/HeroWeaponsPreview'

/** Development only: every hero holding each of their three weapons, to check how they fit (/dev/heroes). */
export default function HeroWeaponsPage() {
  if (process.env.NODE_ENV === 'production') {
    notFound()
  }

  return <HeroWeaponsPreview />
}
