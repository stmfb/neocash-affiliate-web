import { ApiFailure } from '~/utils/api-failure'
import { apiRequest, type ApiRequestOptions } from '~/utils/http'

interface ProtectedRequestOptions extends Omit<ApiRequestOptions, 'token'> {
  /**
   * Return true for a 401 that is NOT an expired session, so no refresh is
   * attempted (e.g. "current password is incorrect" on password change).
   */
  skipRefreshWhen?: (failure: ApiFailure) => boolean
}

/**
 * Client for protected VM2 endpoints: `Authorization: Bearer <access>`, plus
 * mobile's 401 → refresh → replay-once flow (API_MAP.md §2.5). A failed
 * refresh surfaces the ORIGINAL 401. The auth store decides whether that
 * makes the session stale.
 */
export function useApi() {
  async function request<T>(path: string, options: ProtectedRequestOptions = {}): Promise<T> {
    const { skipRefreshWhen, ...rest } = options
    // Resolved per call, not at setup: the auth store itself uses this client.
    const auth = useAuthStore()
    try {
      return await apiRequest<T>(path, { ...rest, token: auth.accessToken })
    } catch (error) {
      if (!(error instanceof ApiFailure) || error.status !== 401 || skipRefreshWhen?.(error)) {
        throw error
      }
      let token: string
      try {
        token = await auth.refreshTokens()
      } catch {
        throw error
      }
      return apiRequest<T>(path, { ...rest, token })
    }
  }

  return {
    get: <T>(path: string, query?: Record<string, string>) =>
      request<T>(path, { method: 'GET', query }),
    post: <T>(path: string, body?: object, options: Pick<ProtectedRequestOptions, 'skipRefreshWhen'> = {}) =>
      request<T>(path, { method: 'POST', body, ...options }),
  }
}
