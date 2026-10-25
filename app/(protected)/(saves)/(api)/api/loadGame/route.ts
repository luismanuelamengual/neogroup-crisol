import { loadGame } from '@/app/(protected)/(saves)/services/saves'
import { withAuth } from '@/app/utils/api-server'

/** POST /api/loadGame — the signed-in player's saved game, to continue it. */
export const POST = withAuth(async (_request, _context, userId) => loadGame(userId))
