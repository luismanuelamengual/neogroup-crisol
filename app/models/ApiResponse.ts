/**
 * Standard response shape shared by every API endpoint (server) and by
 * executeRequest (client). Every endpoint responds:
 * - success: { success: true, data: ... }
 * - error:   { success: false, error: ... } (error.message is already
 *   translated to the language of the request; error.key identifies it)
 */
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: Error & { key?: string }
}
