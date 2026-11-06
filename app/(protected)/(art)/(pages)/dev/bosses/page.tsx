import { notFound } from 'next/navigation'
import BossesPreview from '@/app/(protected)/(art)/components/BossesPreview'

/** Development only: every boss as it looks in battle, with its data and the art it still lacks (/dev/bosses). */
export default function BossesPreviewPage() {
  if (process.env.NODE_ENV === 'production') {
    notFound()
  }

  return <BossesPreview />
}
