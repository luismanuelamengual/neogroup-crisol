import { getSaveSummary } from '@/app/(protected)/(saves)/services/saves'
import { withAuth } from '@/app/utils/api-server'

/** POST /api/getSaveSummary — summary of the signed-in player's saved game (null when there is none). */
export const POST = withAuth(async (_request, _context, userId) => getSaveSummary(userId))
