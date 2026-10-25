import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/app/(auth)/services/auth'
import { getT } from '@/app/i18n/server'
import { ApiException } from '@/app/models/ApiException'
import { ApiResponse } from '@/app/models/ApiResponse'
import { isProduction } from '@/app/utils/environment'

/** Helpers shared by the /api route handlers. */

interface RouteContext<P> {
  params: Promise<P>
}

type ApiHandler<P> = (request: NextRequest, context: RouteContext<P>) => Promise<unknown>
type AuthenticatedApiHandler<P> = (request: NextRequest, context: RouteContext<P>, userId: number) => Promise<unknown>

function successResponse(data: unknown): NextResponse {
  const body: ApiResponse = { success: true, data: data ?? null }

  return NextResponse.json(body)
}

async function errorResponse(error: unknown): Promise<NextResponse> {
  const isApiException = error instanceof ApiException
  const normalizedError = error instanceof Error ? error : new Error(String(error))
  // Unexpected errors are masked in production so a real cause never leaks to
  // end users; outside production the real message is sent to ease debugging.
  const t = await getT()
  const maskedMessage = isProduction ? t('errors.internal') : normalizedError.message
  const body: ApiResponse = {
    success: false,
    error: {
      name: normalizedError.name,
      message: isApiException ? t(error.messageKey, error.params) : maskedMessage,
      key: isApiException ? error.messageKey : undefined
    } as Error
  }

  if (!isApiException) {
    // eslint-disable-next-line no-console
    console.error('[api] Unhandled error:', normalizedError)
  }

  return NextResponse.json(body, { status: isApiException ? error.status : 500 })
}

/**
 * Wraps an API handler with the standard response shape: whatever the handler
 * returns is sent as `data`, and any thrown error becomes an error response.
 */
export function withApi<P = Record<string, string>>(handler: ApiHandler<P>) {
  return async (request: NextRequest, context: RouteContext<P>): Promise<NextResponse> => {
    try {
      return successResponse(await handler(request, context))
    } catch (error) {
      return await errorResponse(error)
    }
  }
}

/** Same as withApi, but requires a signed-in user (401 otherwise) and injects its id. */
export function withAuth<P = Record<string, string>>(handler: AuthenticatedApiHandler<P>) {
  return async (request: NextRequest, context: RouteContext<P>): Promise<NextResponse> => {
    const session = await auth()
    const userId = session?.user?.id ? Number(session.user.id) : null

    if (!userId) {
      return await errorResponse(new ApiException('errors.notAuthenticated', 401))
    }

    try {
      return successResponse(await handler(request, context, userId))
    } catch (error) {
      return await errorResponse(error)
    }
  }
}
