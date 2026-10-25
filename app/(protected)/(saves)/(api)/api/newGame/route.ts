import { startNewGame } from '@/app/(protected)/(saves)/services/saves'
import { withAuth } from '@/app/utils/api-server'

/** POST /api/newGame — starts a new game for the signed-in player, replacing its saved one. */
export const POST = withAuth(async (_request, _context, userId) => startNewGame(userId))
