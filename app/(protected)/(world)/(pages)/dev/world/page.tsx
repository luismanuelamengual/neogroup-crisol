import { notFound } from 'next/navigation'
import WorldDebugMap from '@/app/(protected)/(world)/components/WorldDebugMap'

/** Development only: review the generated world (/dev/world). */
export default function WorldDebugPage() {
  if (process.env.NODE_ENV === 'production') {
    notFound()
  }

  return <WorldDebugMap />
}
