import { notFound } from 'next/navigation'
import ArtPreview from '@/app/(protected)/(art)/components/ArtPreview'

/** Development only: see the puppets move and the finished figures (/dev/art). */
export default function ArtPreviewPage() {
  if (process.env.NODE_ENV === 'production') {
    notFound()
  }

  return <ArtPreview />
}
