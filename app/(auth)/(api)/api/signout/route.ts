import { signOut } from '@/app/(auth)/services/auth'

/**
 * GET /api/signout — signs the current user out and redirects to /login.
 * Used by the protected layout when the session points to a user that no
 * longer exists / is disabled: clearing the session cookie is only allowed in
 * Route Handlers and Server Actions, not in Server Component layouts.
 */
export async function GET() {
  await signOut({ redirectTo: '/login' })
}
