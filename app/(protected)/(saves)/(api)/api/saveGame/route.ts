import { SaveGameInput } from '@/app/(protected)/(saves)/models/SaveGameInput'
import { saveGame } from '@/app/(protected)/(saves)/services/saves'
import { withAuth } from '@/app/utils/api-server'

/** POST /api/saveGame — stores the state of the signed-in player's game ({ version, playTimeSeconds, state }). */
export const POST = withAuth(async (request, _context, userId) => {
  const input = (await request.json()) as SaveGameInput

  return saveGame(userId, input)
})
