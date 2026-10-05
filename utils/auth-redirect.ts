import type { LocationQuery } from 'vue-router'
import type { AuthStatus } from '~/stores/auth'

export const LOGIN_PATH = '/login'
export const CHANGE_PASSWORD_PATH = '/auth/change-password'
export const HOME_PATH = '/'

interface RouteLike {
  path: string
  fullPath: string
  query: LocationQuery
}

/** Only same-app paths: must start with a single `/`, and never loop back to login. */
function safeRedirect(value: unknown): string | null {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) return null
  return value === LOGIN_PATH || value.startsWith(`${LOGIN_PATH}?`) ? null : value
}

function toLogin(from: RouteLike): string {
  return from.fullPath === HOME_PATH ? LOGIN_PATH : `${LOGIN_PATH}?redirect=${encodeURIComponent(from.fullPath)}`
}

/**
 * Where the auth state sends this route: null = stay. Mirrors mobile's
 * `_guardDecide` (app/router.dart):
 * - authenticating: to /login, which shows "Authenticating…"
 * - must change password: pinned to the forced change screen
 * - forced change just succeeded: Home
 * - signed out: /login
 * - freshly signed in on /login: onward. A stale session may stay there to re-auth.
 *
 * Web addition: /login keeps the page you were on in `?redirect=`, and signing
 * in returns you to it, so reloading a deep link doesn't dump you on Home.
 * Not after the user logs out, though: like mobile, the next sign-in starts
 * at Home.
 */
export function authRedirect(
  status: AuthStatus,
  route: RouteLike,
  { signedOutByUser = false }: { signedOutByUser?: boolean } = {},
): string | null {
  const atLogin = route.path === LOGIN_PATH
  const atChangePassword = route.path === CHANGE_PASSWORD_PATH

  if (status === 'authenticating') return atLogin ? null : toLogin(route)

  if (status === 'mustChangePassword') {
    return atChangePassword ? null : `${CHANGE_PASSWORD_PATH}?forced=true`
  }

  const authenticated = status === 'signedIn' || status === 'stale'

  if (atChangePassword && route.query.forced === 'true' && authenticated) return HOME_PATH

  if (!authenticated) {
    if (atLogin) return null
    return signedOutByUser ? LOGIN_PATH : toLogin(route)
  }

  if (status === 'signedIn' && atLogin) return safeRedirect(route.query.redirect) ?? HOME_PATH

  return null
}
