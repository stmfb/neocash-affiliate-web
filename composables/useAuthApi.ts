import type { AuthSession, ChangePasswordRequest, LoginRequest } from '~/types/api'
import { apiRequest } from '~/utils/http'

/**
 * VM2 auth endpoints (API_MAP.md §3.1–3.4). Login and refresh are public, so
 * they go out without a Bearer token and never trigger a refresh. Password
 * change is authenticated.
 *
 * `GET /auth/me` is not wrapped: mobile uses it to revalidate a persisted
 * access token, but the web keeps the access token in memory only, so a page
 * load restores the session via `/auth/refresh`, which returns the same
 * profile.
 */
export function useAuthApi() {
  const api = useApi()

  return {
    login: (body: LoginRequest) =>
      apiRequest<AuthSession>('/auth/login', { method: 'POST', body }),

    refresh: (refreshToken: string) =>
      apiRequest<AuthSession>('/auth/refresh', {
        method: 'POST',
        body: { refresh_token: refreshToken },
      }),

    // A wrong current password is a 401 too. It isn't an expired session, so
    // skip the refresh-and-replay mobile does here (API_MAP.md §3.2).
    changePassword: (body: ChangePasswordRequest) =>
      api.post<AuthSession>('/auth/password/change', body, {
        skipRefreshWhen: (failure) => /current password/i.test(failure.message),
      }),
  }
}
